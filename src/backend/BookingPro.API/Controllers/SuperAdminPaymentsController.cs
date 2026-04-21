using System.Security.Cryptography;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/super-admin/payments")]
    [Authorize(Roles = "super_admin,SuperAdmin")]
    public class SuperAdminPaymentsController : ControllerBase
    {
        private readonly IPlatformPaymentConnectionService _connectionService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SuperAdminPaymentsController> _logger;

        public SuperAdminPaymentsController(
            IPlatformPaymentConnectionService connectionService,
            IConfiguration configuration,
            ILogger<SuperAdminPaymentsController> logger)
        {
            _connectionService = connectionService;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("providers")]
        public async Task<IActionResult> GetProviders()
        {
            var mp = await _connectionService.GetActiveAsync("mercadopago");
            var stripe = await _connectionService.GetActiveAsync("stripe");
            return Ok(new[]
            {
                new {
                    code = "mercadopago", label = "Mercado Pago",
                    connected = mp != null, accountEmail = mp?.AccountEmail, externalAccountId = mp?.ExternalAccountId,
                    connectedAt = mp?.ConnectedAt, expiresAt = mp?.ExpiresAt,
                    legacyFallback = mp == null && !string.IsNullOrWhiteSpace(_configuration["MercadoPago:AccessToken"])
                },
                new {
                    code = "stripe", label = "Stripe",
                    connected = stripe != null, accountEmail = stripe?.AccountEmail, externalAccountId = stripe?.ExternalAccountId,
                    connectedAt = stripe?.ConnectedAt, expiresAt = stripe?.ExpiresAt,
                    legacyFallback = stripe == null && !string.IsNullOrWhiteSpace(_configuration["Stripe:SecretKey"])
                }
            });
        }

        [HttpGet("mercadopago/connect-url")]
        public IActionResult GetMercadoPagoConnectUrl()
        {
            var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18))
                .Replace("+", "-").Replace("/", "_").TrimEnd('=');
            var authUrl = _connectionService.BuildMercadoPagoAuthorizationUrl(state);
            var qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + Uri.EscapeDataString(authUrl);
            return Ok(new { authUrl, qrCodeUrl, state, instructions = "Escaneá con el celular donde tengas sesión MP." });
        }

        [HttpGet("mercadopago/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> MercadoPagoCallback([FromQuery] string code, [FromQuery] string? error)
        {
            var frontendUrl = _configuration["FrontendUrl"] ?? string.Empty;
            var successRedirect = $"{frontendUrl.TrimEnd('/')}/super-admin/payments?mp=connected";
            var errorRedirect = $"{frontendUrl.TrimEnd('/')}/super-admin/payments?mp=error";

            if (!string.IsNullOrEmpty(error)) return Redirect($"{errorRedirect}&reason={Uri.EscapeDataString(error)}");
            if (string.IsNullOrEmpty(code)) return Redirect($"{errorRedirect}&reason=missing_code");

            try
            {
                await _connectionService.HandleMercadoPagoCallbackAsync(code);
                return Redirect(successRedirect);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MP OAuth callback error");
                return Redirect($"{errorRedirect}&reason=exchange_failed");
            }
        }

        [HttpPost("{providerCode}/disconnect")]
        public async Task<IActionResult> Disconnect(string providerCode)
        {
            await _connectionService.DisconnectAsync(providerCode);
            return Ok(new { disconnected = true });
        }
    }
}
