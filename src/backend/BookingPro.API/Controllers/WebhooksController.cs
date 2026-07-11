using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
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
        private readonly IChytapayService _chytapayService;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<WebhooksController> _logger;
        private readonly IWhatsAppConnectionService _whatsAppConnectionService;
        private readonly IFeatureAddonService _featureAddonService;
        private readonly BookingPro.API.Services.IWhatsAppAgentService _whatsAppAgentService;
        private readonly BookingPro.API.Services.ISalesHubHubClient _salesHubClient;

        public WebhooksController(
            IMercadoPagoService mercadoPagoService,
            ISubscriptionService subscriptionService,
            IChytapayService chytapayService,
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<WebhooksController> logger,
            IWhatsAppConnectionService whatsAppConnectionService,
            IFeatureAddonService featureAddonService,
            BookingPro.API.Services.IWhatsAppAgentService whatsAppAgentService,
            BookingPro.API.Services.ISalesHubHubClient salesHubClient)
        {
            _mercadoPagoService = mercadoPagoService;
            _subscriptionService = subscriptionService;
            _chytapayService = chytapayService;
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _whatsAppConnectionService = whatsAppConnectionService;
            _featureAddonService = featureAddonService;
            _whatsAppAgentService = whatsAppAgentService;
            _salesHubClient = salesHubClient;
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
        /// Chytapay webhook — fires when a payment_request transitions to
        /// PAID / PARTIAL_PAID. The URL is configured once at the Chytapay
        /// integration-admin level (no tenantId in the path), so we identify
        /// the transaction by the GUID referenceId we set when creating the
        /// payment_request.
        /// </summary>
        [HttpPost("chytapay")]
        public async Task<IActionResult> ChytapayWebhook()
        {
            try
            {
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                _logger.LogInformation("Received Chytapay webhook: {Body}", body);

                // Optional validation-token check (configured in Chytapay
                // integration-admin "client/url" with the same value we put
                // here). Per docs, the header name is "validation-token".
                var expected = _configuration["Chytapay:ValidationToken"];
                if (!string.IsNullOrEmpty(expected))
                {
                    var got = Request.Headers["validation-token"].ToString();
                    if (!string.Equals(got, expected, StringComparison.Ordinal))
                    {
                        _logger.LogWarning("Chytapay webhook rejected: validation-token mismatch");
                        return Unauthorized();
                    }
                }

                var payload = JsonSerializer.Deserialize<ChytapayWebhookPayloadDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (payload == null)
                {
                    _logger.LogWarning("Failed to parse Chytapay webhook body");
                    return Ok(); // 200 to suppress retries — body is unrecoverable.
                }

                var result = await _chytapayService.ProcessWebhookAsync(payload);
                if (!result.Success)
                {
                    _logger.LogWarning("Chytapay webhook processing reported: {Error}", result.Message);
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Chytapay webhook");
                return Ok();
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
                        await HandleInboundMessage(instanceName, json);
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

        // Bot de confirmación de turnos: procesa la respuesta del cliente
        // (1/sí = confirmar, 2/no = cancelar) al pedido enviado por BookingConfirmationBotService.
        private async Task HandleInboundMessage(string instanceName, JsonElement json)
        {
            if (!json.TryGetProperty("data", out var data)) return;

            if (data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray())
                {
                    await ProcessInboundMessage(instanceName, item);
                }
            }
            else
            {
                await ProcessInboundMessage(instanceName, data);
            }
        }

        // Relay al cerebro de sales-hub de un inbound de la línea de PLATAFORMA, sólo si el
        // teléfono corresponde a alguien que estamos siguiendo (OTP abandonado u onboarding).
        // Gate: SalesHub:RelayEnabled (default false). El hub igual descarta lo que no matchea
        // un lead; este filtro es defensa contra ruido, no correctness.
        private async Task RelayPlatformInboundAsync(string remoteJid, string text, JsonElement key, JsonElement item)
        {
            if (!_configuration.GetValue("SalesHub:RelayEnabled", false)) return;

            var phone = remoteJid.Split('@')[0];
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.Length < 8) return;
            var suffix = digits[^Math.Min(10, digits.Length)..];

            var followed = await _context.PhoneVerifications
                .AnyAsync(p => p.FollowupCount > 0 && p.Phone.Replace(" ", "").Replace("-", "").Replace("+", "").EndsWith(suffix))
                || await _context.Tenants
                .AnyAsync(t => t.OnboardingFollowupCount > 0 && t.OwnerPhone != null
                            && t.OwnerPhone.Replace(" ", "").Replace("-", "").Replace("+", "").EndsWith(suffix));
            if (!followed)
            {
                _logger.LogInformation("Inbound de línea plataforma sin seguimiento activo ({Phone}) — no se relaya", digits);
                return;
            }

            var providerMessageId = key.TryGetProperty("id", out var mid) ? mid.GetString() : null;
            long? timestampUnix = item.TryGetProperty("messageTimestamp", out var ts) && ts.ValueKind == JsonValueKind.Number
                ? ts.GetInt64() : null;

            await _salesHubClient.ForwardInboundAsync(phone, text, providerMessageId, timestampUnix);
            _logger.LogInformation("Inbound de línea plataforma relayado al hub ({Phone})", digits);
        }

        private async Task ProcessInboundMessage(string instanceName, JsonElement item)
        {
            if (!item.TryGetProperty("key", out var key)) return;

            var fromMe = key.TryGetProperty("fromMe", out var fm) && fm.ValueKind == JsonValueKind.True;
            if (fromMe) return;

            var remoteJid = key.TryGetProperty("remoteJid", out var jid) ? jid.GetString() ?? "" : "";
            if (string.IsNullOrEmpty(remoteJid) || remoteJid.Contains("@g.us")) return; // ignorar grupos

            var text = ExtractMessageText(item);
            if (string.IsNullOrWhiteSpace(text)) return;

            // LÍNEA DE PLATAFORMA (la que manda OTPs y follow-ups al DUEÑO del negocio): si el
            // que escribe es un lead/tenant que estamos siguiendo, la respuesta va al cerebro
            // central de sales-hub (relay). No toca el flujo de las líneas de los tenants.
            var platformInstance = _configuration["EVOLUTION_API_INSTANCE"];
            if (!string.IsNullOrEmpty(platformInstance) && instanceName == platformInstance)
            {
                await RelayPlatformInboundAsync(remoteJid, text, key, item);
                return;
            }

            var connection = await _context.TenantWhatsAppConnections
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.InstanceName == instanceName);
            if (connection == null) return;

            var tenantId = connection.TenantId;

            var settings = await _context.TenantMessagingSettings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            var hasAiAgent = await _featureAddonService.HasActiveAddonAsync(tenantId, BookingPro.API.Models.Constants.FeatureCodes.AiAgent);
            var confirmationEnabled = settings != null && settings.ConfirmationBotEnabled
                && await _featureAddonService.HasActiveAddonAsync(tenantId, BookingPro.API.Models.Constants.FeatureCodes.ConfirmationBot);

            if (!hasAiAgent && !confirmationEnabled) return;

            // Sin bot de confirmación pero con Agente IA → el agente atiende cualquier mensaje entrante.
            if (!confirmationEnabled)
            {
                await HandleAiAgentMessageAsync(tenantId, remoteJid, text);
                return;
            }

            // Matchear el remitente con un pedido de confirmación pendiente (sufijo de 8 dígitos
            // para tolerar variantes de prefijo AR: 549..., 54..., 0..., 15...)
            var senderDigits = new string(remoteJid.Split('@')[0].Where(char.IsDigit).ToArray());
            if (senderDigits.Length < 8) return;
            var senderSuffix = senderDigits[^8..];

            var pendingRequests = await _context.BookingConfirmationRequests
                .IgnoreQueryFilters()
                .Where(r => r.TenantId == tenantId && r.Status == "sent")
                .OrderByDescending(r => r.SentAt)
                .Take(100)
                .ToListAsync();

            var request = pendingRequests.FirstOrDefault(r =>
                r.Phone.Length >= 8 && r.Phone.EndsWith(senderSuffix));
            if (request == null)
            {
                // No es respuesta a una confirmación pendiente → si tiene el add-on de IA, lo atiende el agente.
                if (hasAiAgent) await HandleAiAgentMessageAsync(tenantId, remoteJid, text);
                return;
            }

            var booking = await _context.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Customer)
                .Include(b => b.Service)
                .FirstOrDefaultAsync(b => b.Id == request.BookingId && b.TenantId == tenantId);
            if (booking == null) return;

            if (booking.StartTime <= DateTime.UtcNow)
            {
                request.Status = "expired";
                request.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return;
            }

            var intent = ParseConfirmationIntent(text);
            if (intent == null)
            {
                // Respuesta no reconocida: forzar la respuesta re-preguntando,
                // con tope de reintentos para no loopear si el cliente se pone a chatear
                const int maxReprompts = 2;
                if (request.RepromptCount >= maxReprompts) return;

                request.RepromptCount++;
                request.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var repromptTime = booking.StartTime.ToLocalTime();
                var reprompt = $"No te entendí 🙂 Sobre tu turno del {repromptTime:dd/MM} a las {repromptTime:HH:mm}: " +
                    "respondé solo *1* para confirmarlo ✅ o *2* para cancelarlo ❌";
                try
                {
                    var repromptResult = await _whatsAppConnectionService.SendTextAsync(tenantId, senderDigits, reprompt);
                    _context.MessageLogs.Add(new MessageLog
                    {
                        TenantId = tenantId,
                        BookingId = booking.Id,
                        CustomerId = booking.CustomerId,
                        Channel = "whatsapp",
                        MessageType = "confirmation_reprompt",
                        Status = repromptResult.Success ? "sent" : "failed",
                        To = senderDigits,
                        Body = reprompt,
                        SentAt = repromptResult.Success ? DateTime.UtcNow : null,
                        ProviderMessageId = repromptResult.Data,
                        ErrorMessage = repromptResult.Success ? null : repromptResult.Message
                    });
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send confirmation reprompt to {Phone}", senderDigits);
                }
                return;
            }

            var now = DateTime.UtcNow;
            var timeLocal = booking.StartTime.ToLocalTime();
            var firstName = booking.Customer?.FirstName ?? "";
            string ack;

            if (intent == "confirm")
            {
                if (booking.Status == "pending")
                {
                    _context.BookingStatusHistory.Add(new BookingStatusHistory
                    {
                        TenantId = tenantId,
                        BookingId = booking.Id,
                        FromStatus = booking.Status,
                        ToStatus = "confirmed",
                        Reason = "Confirmado por el cliente vía WhatsApp",
                        ChangedAt = now,
                        ChangedBy = "confirmation-bot"
                    });
                    booking.Status = "confirmed";
                    booking.UpdatedAt = now;
                }

                request.Status = "confirmed";
                ack = $"¡Gracias {firstName}! Tu turno del {timeLocal:dd/MM} a las {timeLocal:HH:mm} quedó confirmado. Te esperamos 😊";
            }
            else
            {
                if (booking.Status != "cancelled")
                {
                    _context.BookingStatusHistory.Add(new BookingStatusHistory
                    {
                        TenantId = tenantId,
                        BookingId = booking.Id,
                        FromStatus = booking.Status,
                        ToStatus = "cancelled",
                        Reason = "Cancelado por el cliente vía WhatsApp",
                        ChangedAt = now,
                        ChangedBy = "confirmation-bot"
                    });
                    booking.Status = "cancelled";
                    booking.CancelledAt = now;
                    booking.CancellationReason = "Cancelado por el cliente vía el bot de WhatsApp";
                    booking.UpdatedAt = now;
                }

                request.Status = "cancelled";
                ack = $"Listo {firstName}, tu turno del {timeLocal:dd/MM} a las {timeLocal:HH:mm} fue cancelado. ¡Podés reservar de nuevo cuando quieras!";
            }

            request.RespondedAt = now;
            request.ResponseText = text.Length > 500 ? text[..500] : text;
            request.UpdatedAt = now;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Confirmation bot: booking {BookingId} -> {Intent} (tenant {TenantId})",
                booking.Id, intent, tenantId);

            // Ack al cliente: no descuenta créditos del wallet
            try
            {
                var sendResult = await _whatsAppConnectionService.SendTextAsync(tenantId, senderDigits, ack);
                _context.MessageLogs.Add(new MessageLog
                {
                    TenantId = tenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Channel = "whatsapp",
                    MessageType = "confirmation_reply",
                    Status = sendResult.Success ? "sent" : "failed",
                    To = senderDigits,
                    Body = ack,
                    SentAt = sendResult.Success ? DateTime.UtcNow : null,
                    ProviderMessageId = sendResult.Data,
                    ErrorMessage = sendResult.Success ? null : sendResult.Message
                });
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send confirmation ack to {Phone}", senderDigits);
            }
        }

        // Agente IA (add-on ai_agent): delega el turno del cliente al asistente conversacional,
        // que responde servicios/precios/disponibilidad y crea reservas reales. Envía la respuesta
        // por WhatsApp y la registra en MessageLogs.
        private async Task HandleAiAgentMessageAsync(Guid tenantId, string remoteJid, string text)
        {
            if (!_whatsAppAgentService.IsEnabled) return;

            var senderDigits = new string(remoteJid.Split('@')[0].Where(char.IsDigit).ToArray());
            if (senderDigits.Length < 8) return;

            string? reply;
            try
            {
                reply = await _whatsAppAgentService.HandleMessageAsync(tenantId, senderDigits, text);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI agent failed to handle message for tenant {TenantId}", tenantId);
                return;
            }
            if (string.IsNullOrWhiteSpace(reply)) return;

            try
            {
                var sendResult = await _whatsAppConnectionService.SendTextAsync(tenantId, senderDigits, reply);
                _context.MessageLogs.Add(new MessageLog
                {
                    TenantId = tenantId,
                    Channel = "whatsapp",
                    MessageType = "ai_agent_reply",
                    Status = sendResult.Success ? "sent" : "failed",
                    To = senderDigits,
                    Body = reply,
                    SentAt = sendResult.Success ? DateTime.UtcNow : null,
                    ProviderMessageId = sendResult.Data,
                    ErrorMessage = sendResult.Success ? null : sendResult.Message
                });
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send AI agent reply to {Phone}", senderDigits);
            }
        }

        private static string? ExtractMessageText(JsonElement item)
        {
            if (!item.TryGetProperty("message", out var message)) return null;

            if (message.TryGetProperty("conversation", out var conv))
                return conv.GetString();

            if (message.TryGetProperty("extendedTextMessage", out var ext) &&
                ext.TryGetProperty("text", out var extText))
                return extText.GetString();

            // Mensajes efímeros envuelven el contenido real
            if (message.TryGetProperty("ephemeralMessage", out var eph) &&
                eph.TryGetProperty("message", out var ephMsg))
            {
                if (ephMsg.TryGetProperty("conversation", out var ephConv))
                    return ephConv.GetString();
                if (ephMsg.TryGetProperty("extendedTextMessage", out var ephExt) &&
                    ephExt.TryGetProperty("text", out var ephText))
                    return ephText.GetString();
            }

            return null;
        }

        private static string? ParseConfirmationIntent(string text)
        {
            var normalized = text.Trim().ToLowerInvariant()
                .Replace("í", "i").Replace("é", "e").Replace("á", "a").Replace("ó", "o").Replace("ú", "u")
                .TrimEnd('.', '!', '?', ' ');

            // Cancelación primero: "no puedo confirmar" debe cancelar, no confirmar
            if (normalized == "2" || normalized == "no" ||
                normalized.Contains("cancel") || normalized.Contains("no puedo") ||
                normalized.Contains("no voy") || normalized.Contains("no llego"))
            {
                return "cancel";
            }

            if (normalized == "1" || normalized == "si" || normalized == "ok" ||
                normalized == "dale" || normalized == "sip" ||
                normalized.Contains("confirm") || normalized.StartsWith("si,") || normalized.StartsWith("si "))
            {
                return "confirm";
            }

            return null;
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