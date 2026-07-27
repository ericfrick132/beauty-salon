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

        public class ManualTokenDto
        {
            public string AccessToken { get; set; } = string.Empty;
            public string? PublicKey { get; set; }
        }

        [HttpGet("providers")]
        public async Task<IActionResult> GetProviders()
        {
            var mp = await _connectionService.GetActiveAsync("mercadopago");
            var stripe = await _connectionService.GetActiveAsync("stripe");
            var mpToken = await _connectionService.ResolveAccessTokenAsync("mercadopago");
            var stripeToken = await _connectionService.ResolveAccessTokenAsync("stripe");

            return Ok(new[]
            {
                new {
                    code = "mercadopago", label = "Mercado Pago",
                    connected = mp != null, accountEmail = mp?.AccountEmail, externalAccountId = mp?.ExternalAccountId,
                    connectedAt = mp?.ConnectedAt, expiresAt = mp?.ExpiresAt,
                    mode = mp?.ConnectionMode,
                    // De dónde sale el token con el que hoy se cobra: oauth | manual | legacydatabase | appsettings | none
                    tokenSource = mpToken.Source.ToString().ToLowerInvariant(),
                    canCharge = !string.IsNullOrWhiteSpace(mpToken.AccessToken),
                    legacyFallback = mp == null && !string.IsNullOrWhiteSpace(mpToken.AccessToken),
                    redirectUri = (string?)_connectionService.GetMercadoPagoRedirectUri(RequestBaseUrl())
                },
                new {
                    code = "stripe", label = "Stripe",
                    connected = stripe != null, accountEmail = stripe?.AccountEmail, externalAccountId = stripe?.ExternalAccountId,
                    connectedAt = stripe?.ConnectedAt, expiresAt = stripe?.ExpiresAt,
                    mode = stripe?.ConnectionMode,
                    tokenSource = stripeToken.Source.ToString().ToLowerInvariant(),
                    canCharge = !string.IsNullOrWhiteSpace(stripeToken.AccessToken),
                    legacyFallback = stripe == null && !string.IsNullOrWhiteSpace(stripeToken.AccessToken),
                    redirectUri = (string?)null
                }
            });
        }

        [HttpGet("mercadopago/connect-url")]
        public IActionResult GetMercadoPagoConnectUrl()
        {
            if (string.IsNullOrWhiteSpace(_configuration["MercadoPago:ClientId"]))
                return BadRequest(new { error = "Falta MercadoPago:ClientId en la configuración del servidor" });

            // El prefijo hace que el callback compartido con el flujo por tenant sepa que
            // esta autorización es de la plataforma; la firma evita que la falsifiquen.
            var state = _connectionService.CreatePlatformState();
            var baseUrl = RequestBaseUrl();
            var authUrl = _connectionService.BuildMercadoPagoAuthorizationUrl(state, baseUrl);
            var qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + Uri.EscapeDataString(authUrl);
            return Ok(new
            {
                authUrl,
                qrCodeUrl,
                state,
                redirectUri = _connectionService.GetMercadoPagoRedirectUri(baseUrl),
                instructions = "Escaneá con el celular donde tengas sesión MP."
            });
        }

        [HttpGet("mercadopago/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> MercadoPagoCallback([FromQuery] string code, [FromQuery] string? state, [FromQuery] string? error)
        {
            var frontendUrl = FrontendBaseUrl();
            var successRedirect = $"{frontendUrl}/super-admin/payments?mp=connected";
            var errorRedirect = $"{frontendUrl}/super-admin/payments?mp=error";

            // Endpoint anónimo: sin state firmado, cualquiera podría cambiar la cuenta que cobra.
            if (!_connectionService.ValidatePlatformState(state))
            {
                _logger.LogWarning("Platform MP callback rejected: invalid or expired state");
                return Redirect($"{errorRedirect}&reason=invalid_state");
            }

            if (!string.IsNullOrEmpty(error)) return Redirect($"{errorRedirect}&reason={Uri.EscapeDataString(error)}");
            if (string.IsNullOrEmpty(code)) return Redirect($"{errorRedirect}&reason=missing_code");

            try
            {
                await _connectionService.HandleMercadoPagoCallbackAsync(code, state!, RequestBaseUrl());
                return Redirect(successRedirect);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MP OAuth callback error");
                return Redirect($"{errorRedirect}&reason=exchange_failed");
            }
        }

        /// <summary>
        /// Alta manual del access token de la cuenta que cobra (fallback al flujo OAuth).
        /// </summary>
        [HttpPost("mercadopago/manual")]
        public async Task<IActionResult> SaveManualMercadoPagoToken([FromBody] ManualTokenDto dto)
        {
            if (dto is null || string.IsNullOrWhiteSpace(dto.AccessToken))
                return BadRequest(new { error = "Pegá el access token de MercadoPago" });

            try
            {
                var conn = await _connectionService.SaveManualMercadoPagoTokenAsync(dto.AccessToken, dto.PublicKey);
                return Ok(new { connected = true, accountEmail = conn.AccountEmail, externalAccountId = conn.ExternalAccountId });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving manual MP token");
                return StatusCode(500, new { error = "No pudimos guardar el token" });
            }
        }

        /// <summary>
        /// Verifica contra MercadoPago que el token con el que se cobra hoy siga siendo válido.
        /// </summary>
        [HttpPost("{providerCode}/test")]
        public async Task<IActionResult> TestConnection(string providerCode)
        {
            if (providerCode != "mercadopago")
                return BadRequest(new { error = "Solo soportamos test de MercadoPago por ahora" });

            var resolution = await _connectionService.ResolveAccessTokenAsync(providerCode);
            if (string.IsNullOrWhiteSpace(resolution.AccessToken))
                return BadRequest(new { ok = false, error = "No hay ninguna cuenta configurada: la plataforma no puede cobrar" });

            var account = await _connectionService.FetchMercadoPagoAccountAsync(resolution.AccessToken);
            if (account is null)
                return BadRequest(new { ok = false, error = "MercadoPago rechazó el token (vencido o revocado)" });

            return Ok(new
            {
                ok = true,
                source = resolution.Source.ToString().ToLowerInvariant(),
                email = account.Email,
                nickname = account.Nickname,
                userId = account.UserId,
                siteId = account.SiteId
            });
        }

        [HttpPost("{providerCode}/disconnect")]
        public async Task<IActionResult> Disconnect(string providerCode)
        {
            await _connectionService.DisconnectAsync(providerCode);
            return Ok(new { disconnected = true });
        }

        private string RequestBaseUrl() => $"{Request.Scheme}://{Request.Host}";

        private string FrontendBaseUrl()
        {
            var configured = _configuration["FrontendUrl"];
            if (!string.IsNullOrWhiteSpace(configured) && !configured.Contains("localhost"))
                return configured.TrimEnd('/');
            return RequestBaseUrl();
        }
    }
}
