using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Controllers
{
    /// <summary>Body de la app Android tras una compra de Google Play Billing.</summary>
    public class GooglePlayVerifyDto
    {
        public string PurchaseToken { get; set; } = string.Empty;
        public string? ProductId { get; set; }
    }

    /// <summary>
    /// Google Play Billing (app Android): verify de la compra + Real-time developer notifications.
    /// Espejo del verify/webhook de Apple de <see cref="SubscriptionController"/> (y del de Bunker).
    /// </summary>
    [ApiController]
    public class GooglePlayController : ControllerBase
    {
        private readonly IGooglePlayBillingService _billing;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GooglePlayController> _logger;

        public GooglePlayController(IGooglePlayBillingService billing, IConfiguration configuration, ILogger<GooglePlayController> logger)
        {
            _billing = billing;
            _configuration = configuration;
            _logger = logger;
        }

        // Solo el dueño/admin compra en la app. La ruta vive bajo /api/subscription, que el
        // SubscriptionMiddleware exime: un negocio bloqueado puede activar lo que compró.
        [HttpPost("api/subscription/google-play/verify")]
        [Authorize(Roles = "admin,super_admin")]
        public async Task<IActionResult> Verify([FromBody] GooglePlayVerifyDto dto)
        {
            try
            {
                if (dto == null || string.IsNullOrWhiteSpace(dto.PurchaseToken))
                    return BadRequest(new { activated = false, error = "purchaseToken requerido", code = "INVALID_REQUEST" });

                var tenantClaim = User.FindFirst("tenantId")?.Value ?? User.FindFirst("tenant_id")?.Value;
                if (!Guid.TryParse(tenantClaim, out var tenantId))
                    return BadRequest(new { activated = false, error = "Negocio no identificado", code = "INVALID_TENANT" });

                var result = await _billing.ActivateAsync(tenantId, dto.PurchaseToken, dto.ProductId);
                if (result.Success)
                    return Ok(new { activated = true, subscription = result.Status });

                if (result.Code == GooglePlayBillingService.NotConfiguredCode)
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, new { activated = false, error = result.Error, code = result.Code });

                return BadRequest(new { activated = false, error = result.Error, code = result.Code });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying Google Play purchase");
                return StatusCode(500, new { activated = false, error = "Error al verificar la compra", code = "ERROR" });
            }
        }

        /// <summary>
        /// Real-time developer notifications: Pub/Sub push subscription → este endpoint.
        /// Body: { message: { data: base64(DeveloperNotification) }, subscription }.
        /// Con GooglePlay:WebhookToken configurado, el push endpoint debe llevar ?token=&lt;valor&gt;.
        /// /api/webhooks/* lo saltean TenantResolutionMiddleware y SubscriptionMiddleware.
        /// </summary>
        [HttpPost("api/webhooks/google-play")]
        [AllowAnonymous]
        public async Task<IActionResult> Notifications([FromBody] JsonElement body, [FromQuery] string? token)
        {
            try
            {
                var expected = _configuration["GooglePlay:WebhookToken"];
                if (string.IsNullOrEmpty(expected))
                {
                    _logger.LogWarning("Google Play RTDN received without GooglePlay:WebhookToken configured (state is re-read from Google anyway)");
                }
                else if (token != expected)
                {
                    _logger.LogWarning("Google Play RTDN with wrong token — ignored");
                    return Ok(); // 200 para que Pub/Sub no reintente.
                }

                if (body.ValueKind == JsonValueKind.Object &&
                    body.TryGetProperty("message", out var message) &&
                    message.TryGetProperty("data", out var data) &&
                    data.ValueKind == JsonValueKind.String)
                {
                    await _billing.ProcessNotificationAsync(data.GetString() ?? string.Empty);
                }
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Google Play notification");
                return Ok();
            }
        }
    }
}
