using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/webhooks")]
    public class WebhooksController : ControllerBase
    {
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly ILogger<WebhooksController> _logger;

        public WebhooksController(
            IMercadoPagoService mercadoPagoService,
            ILogger<WebhooksController> logger)
        {
            _mercadoPagoService = mercadoPagoService;
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

                // Process the webhook notification
                var result = await _mercadoPagoService.ProcessWebhookNotificationAsync(tenantId, data);

                if (result.Success)
                {
                    return Ok();
                }
                else
                {
                    _logger.LogWarning("Failed to process webhook: {Error}", result.Message);
                    return StatusCode(500);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MercadoPago webhook for tenant {TenantId}", tenantId);
                return StatusCode(500);
            }
        }
    }
}