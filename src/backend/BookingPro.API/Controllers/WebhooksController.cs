using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/webhooks")]
    public class WebhooksController : ControllerBase
    {
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly ISubscriptionService _subscriptionService;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<WebhooksController> _logger;

        public WebhooksController(
            IMercadoPagoService mercadoPagoService,
            ISubscriptionService subscriptionService,
            ApplicationDbContext context,
            ILogger<WebhooksController> logger)
        {
            _mercadoPagoService = mercadoPagoService;
            _subscriptionService = subscriptionService;
            _context = context;
            _logger = logger;
        }

        [HttpPost("mercadopago/{tenantId}")]
        public async Task<IActionResult> MercadoPagoWebhook(string tenantId)
        {
            try
            {
                // Read the raw body for logging
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                _logger.LogInformation("Received MercadoPago webhook for tenant {TenantId}: {Body}", tenantId, body);

                // Parse the JSON body
                var data = JsonSerializer.Deserialize<Dictionary<string, object>>(body);
                if (data == null)
                {
                    _logger.LogWarning("Failed to parse webhook body");
                    return BadRequest();
                }

                // Route based on notification type. Subscription events (type "subscription_preapproval"
                // or payments with "SUB-" external_reference) go to the subscription handler;
                // booking payments go to the MercadoPago service handler. Both handlers are idempotent
                // and safely ignore notifications they do not own.
                var subResult = await _subscriptionService.ProcessSubscriptionWebhookAsync(data);
                if (!subResult.Success)
                {
                    _logger.LogWarning("Subscription webhook handler reported: {Error}", subResult.Message);
                }

                var result = await _mercadoPagoService.ProcessWebhookNotificationAsync(tenantId, data);
                if (!result.Success)
                {
                    _logger.LogWarning("Booking webhook handler reported: {Error}", result.Message);
                }

                // Always return 200 to MercadoPago to avoid aggressive retry storms.
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MercadoPago webhook for tenant {TenantId}", tenantId);
                return Ok(); // Return 200 even on error — retries would compound the problem.
            }
        }

        /// <summary>
        /// Evolution API webhook for WhatsApp connection status changes and message events.
        /// Called by Evolution API when instance state changes or messages are received/delivered.
        /// </summary>
        [HttpPost("evolution")]
        public async Task<IActionResult> EvolutionWebhook()
        {
            try
            {
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                _logger.LogInformation("Evolution API webhook: {Body}", body);

                var json = JsonSerializer.Deserialize<JsonElement>(body);

                var eventType = json.TryGetProperty("event", out var ev) ? ev.GetString() : null;
                var instanceName = "";
                if (json.TryGetProperty("instance", out var inst))
                {
                    instanceName = inst.GetString() ?? "";
                }

                if (string.IsNullOrEmpty(instanceName) || string.IsNullOrEmpty(eventType))
                {
                    return Ok();
                }

                switch (eventType)
                {
                    case "connection.update":
                        await HandleConnectionUpdate(instanceName, json);
                        break;

                    case "messages.update":
                        await HandleMessageStatusUpdate(instanceName, json);
                        break;

                    case "messages.upsert":
                        _logger.LogInformation("Inbound message on {Instance}", instanceName);
                        break;
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Evolution API webhook");
                return Ok(); // Always return 200 to avoid retries
            }
        }

        private async Task HandleConnectionUpdate(string instanceName, JsonElement json)
        {
            var state = "close";
            if (json.TryGetProperty("data", out var data))
            {
                if (data.TryGetProperty("state", out var s))
                    state = s.GetString() ?? "close";
            }

            var connection = await _context.TenantWhatsAppConnections
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.InstanceName == instanceName);

            if (connection == null) return;

            connection.Status = state;
            connection.UpdatedAt = DateTime.UtcNow;

            if (state == "open")
            {
                connection.ConnectedAt ??= DateTime.UtcNow;
            }
            else if (state == "close")
            {
                connection.DisconnectedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("WhatsApp connection {Instance} status updated to {State}", instanceName, state);
        }

        private async Task HandleMessageStatusUpdate(string instanceName, JsonElement json)
        {
            if (!json.TryGetProperty("data", out var data)) return;

            string? messageId = null;
            string? status = null;

            if (data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray())
                {
                    messageId = item.TryGetProperty("key", out var key) && key.TryGetProperty("id", out var id)
                        ? id.GetString() : null;
                    status = item.TryGetProperty("update", out var upd) && upd.TryGetProperty("status", out var st)
                        ? st.GetString() : null;

                    if (messageId != null && status != null)
                        await UpdateMessageLogStatus(messageId, status);
                }
            }
            else
            {
                messageId = data.TryGetProperty("key", out var key) && key.TryGetProperty("id", out var id)
                    ? id.GetString() : null;
                status = data.TryGetProperty("update", out var upd) && upd.TryGetProperty("status", out var st)
                    ? st.GetString() : null;

                if (messageId != null && status != null)
                    await UpdateMessageLogStatus(messageId, status);
            }
        }

        private async Task UpdateMessageLogStatus(string providerMessageId, string status)
        {
            var mappedStatus = status switch
            {
                "DELIVERY_ACK" or "READ" or "PLAYED" => "delivered",
                "SERVER_ACK" => "sent",
                "ERROR" => "failed",
                _ => null
            };

            if (mappedStatus == null) return;

            var log = await _context.MessageLogs
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => l.ProviderMessageId == providerMessageId);

            if (log == null) return;

            log.Status = mappedStatus;
            if (mappedStatus == "delivered")
                log.DeliveredAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}