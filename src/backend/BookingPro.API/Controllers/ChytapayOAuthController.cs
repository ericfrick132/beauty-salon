using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/chytapay/oauth")]
    public class ChytapayOAuthController : ControllerBase
    {
        private readonly IChytapayOAuthService _oauthService;
        private readonly ILogger<ChytapayOAuthController> _logger;
        private readonly ApplicationDbContext _context;

        public ChytapayOAuthController(
            IChytapayOAuthService oauthService,
            ILogger<ChytapayOAuthController> logger,
            ApplicationDbContext context)
        {
            _oauthService = oauthService;
            _logger = logger;
            _context = context;
        }

        [HttpPost("initiate")]
        [Authorize]
        public async Task<IActionResult> InitiateOAuth([FromBody] InitiateChytapayOAuthDto dto)
        {
            try
            {
                var result = await _oauthService.InitiateOAuthFlowAsync(dto);
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        success = true,
                        authorizationUrl = result.Data.AuthorizationUrl,
                        state = result.Data.State,
                        expiresAt = result.Data.ExpiresAt
                    });
                }
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating Chytapay OAuth");
                return StatusCode(500, new { error = "Error initiating OAuth flow" });
            }
        }

        [HttpGet("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> OAuthCallback(
            [FromQuery] string code,
            [FromQuery] string state,
            [FromQuery] string? error,
            [FromQuery] string? error_description)
        {
            try
            {
                string? tenantSubdomain = null;
                if (!string.IsNullOrEmpty(state))
                {
                    // State format: ctp_{tenantId}_{randomString}
                    var parts = state.Split('_');
                    if (parts.Length >= 2 && parts[0] == "ctp" && Guid.TryParse(parts[1], out var tenantId))
                    {
                        var tenant = await _context.Set<Tenant>()
                            .Where(t => t.Id == tenantId)
                            .Select(t => new { t.Subdomain })
                            .FirstOrDefaultAsync();
                        tenantSubdomain = tenant?.Subdomain;
                    }
                }

                var callbackDto = new ChytapayOAuthCallbackDto
                {
                    Code = code ?? "",
                    State = state ?? "",
                    Error = error,
                    ErrorDescription = error_description
                };

                var result = await _oauthService.ProcessOAuthCallbackAsync(callbackDto);

                var html = GenerateCallbackHtml(
                    success: result.Success,
                    message: result.Success ? "Chytapay conectado exitosamente" : "Error conectando Chytapay",
                    error: result.Success ? null : result.Message,
                    tenantSubdomain);

                return Content(html, "text/html");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Chytapay OAuth callback");
                return Content(GenerateCallbackHtml(false, "Error procesando callback", ex.Message, null), "text/html");
            }
        }

        [HttpGet("status")]
        [Authorize]
        public async Task<IActionResult> GetStatus()
        {
            var result = await _oauthService.GetConnectionStatusAsync();
            return result.Success && result.Data != null
                ? Ok(result.Data)
                : BadRequest(new { error = result.Message });
        }

        [HttpPost("refresh")]
        [Authorize]
        public async Task<IActionResult> RefreshToken()
        {
            var result = await _oauthService.RefreshAccessTokenAsync();
            return result.Success
                ? Ok(new { success = true, message = "Token refreshed successfully" })
                : BadRequest(new { error = result.Message });
        }

        [HttpPost("disconnect")]
        [Authorize]
        public async Task<IActionResult> Disconnect([FromBody] DisconnectChytapayDto dto)
        {
            var result = await _oauthService.DisconnectOAuthAsync(dto);
            return result.Success
                ? Ok(new { success = true, message = "Chytapay disconnected successfully" })
                : BadRequest(new { error = result.Message });
        }

        [HttpPost("test")]
        [Authorize]
        public async Task<IActionResult> TestConnection()
        {
            var result = await _oauthService.TestConnectionAsync();
            return Ok(new { success = result.Success, message = result.Message, isConnected = result.Success });
        }

        private static string GenerateCallbackHtml(bool success, string message, string? error, string? tenantSubdomain)
        {
            var statusClass = success ? "success" : "error";
            var icon = success ? "✅" : "❌";

            var redirectUrl = !string.IsNullOrEmpty(tenantSubdomain)
                ? $"https://{tenantSubdomain}.turnos-pro.com/chytapay-settings"
                : "/dashboard/settings/payments";

            return $@"
<!DOCTYPE html>
<html>
<head>
    <title>Chytapay OAuth</title>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }}
        .container {{ text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; }}
        .icon {{ font-size: 48px; margin-bottom: 20px; }}
        .message {{ font-size: 18px; margin-bottom: 20px; color: #333; }}
        .error {{ color: #dc3545; font-size: 14px; margin-top: 10px; }}
        .success {{ color: #28a745; }}
        .loading {{ font-size: 14px; color: #666; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='icon'>{icon}</div>
        <div class='message {statusClass}'>{message}</div>
        {(error != null ? $"<div class='error'>Error: {error}</div>" : "")}
        <div class='loading'>Esta ventana se cerrará automáticamente...</div>
    </div>
    <script>
        if (window.opener) {{
            window.opener.postMessage({{
                type: 'chytapay-oauth-result',
                success: {success.ToString().ToLower()},
                message: '{message}',
                error: '{error ?? ""}',
                tenantSubdomain: '{tenantSubdomain ?? ""}',
                redirectUrl: '{redirectUrl}'
            }}, '*');
            setTimeout(() => window.close(), 2000);
        }} else {{
            setTimeout(() => {{ window.location.href = '{redirectUrl}'; }}, 3000);
        }}
    </script>
</body>
</html>";
        }
    }
}
