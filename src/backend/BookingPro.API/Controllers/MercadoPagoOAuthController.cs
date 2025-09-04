using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/mercadopago/oauth")]
    public class MercadoPagoOAuthController : ControllerBase
    {
        private readonly IMercadoPagoOAuthService _oauthService;
        private readonly ILogger<MercadoPagoOAuthController> _logger;

        public MercadoPagoOAuthController(
            IMercadoPagoOAuthService oauthService,
            ILogger<MercadoPagoOAuthController> logger)
        {
            _oauthService = oauthService;
            _logger = logger;
        }

        /// <summary>
        /// Initiates OAuth flow and returns authorization URL for tenant
        /// </summary>
        [HttpPost("initiate")]
        [Authorize]
        public async Task<IActionResult> InitiateOAuth([FromBody] InitiateMercadoPagoOAuthDto dto)
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
                        expiresAt = result.Data.ExpiresAt,
                        message = "Open this URL in a popup or redirect user to complete OAuth"
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating OAuth");
                return StatusCode(500, new { error = "Error initiating OAuth flow" });
            }
        }

        /// <summary>
        /// OAuth callback endpoint that MercadoPago redirects to
        /// </summary>
        [HttpGet("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> OAuthCallback([FromQuery] string code, [FromQuery] string state, [FromQuery] string? error, [FromQuery] string? error_description)
        {
            try
            {
                _logger.LogInformation("OAuth callback received - Code: {Code}, State: {State}, Error: {Error}", 
                    code?.Substring(0, Math.Min(10, code?.Length ?? 0)) ?? "null", 
                    state ?? "null", 
                    error ?? "none");

                var callbackDto = new MercadoPagoOAuthCallbackDto
                {
                    Code = code ?? "",
                    State = state ?? "",
                    Error = error,
                    ErrorDescription = error_description
                };

                var result = await _oauthService.ProcessOAuthCallbackAsync(callbackDto);
                
                if (result.Success)
                {
                    // Return HTML page that closes popup and notifies parent window
                    var successHtml = GenerateCallbackHtml(true, "MercadoPago conectado exitosamente", null);
                    return Content(successHtml, "text/html");
                }
                else
                {
                    _logger.LogWarning("OAuth callback failed: {Message}", result.Message);
                    var errorHtml = GenerateCallbackHtml(false, "Error conectando MercadoPago", result.Message);
                    return Content(errorHtml, "text/html");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing OAuth callback");
                var errorHtml = GenerateCallbackHtml(false, "Error procesando callback", ex.Message);
                return Content(errorHtml, "text/html");
            }
        }

        /// <summary>
        /// Get current OAuth connection status for tenant
        /// </summary>
        [HttpGet("status")]
        [Authorize]
        public async Task<IActionResult> GetConnectionStatus()
        {
            try
            {
                var result = await _oauthService.GetConnectionStatusAsync();
                
                if (result.Success && result.Data != null)
                {
                    return Ok(result.Data);
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting connection status");
                return StatusCode(500, new { error = "Error getting connection status" });
            }
        }

        /// <summary>
        /// Manually refresh access token
        /// </summary>
        [HttpPost("refresh")]
        [Authorize]
        public async Task<IActionResult> RefreshToken()
        {
            try
            {
                var result = await _oauthService.RefreshAccessTokenAsync();
                
                if (result.Success)
                {
                    return Ok(new 
                    { 
                        success = true, 
                        message = "Token refreshed successfully" 
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing token");
                return StatusCode(500, new { error = "Error refreshing token" });
            }
        }

        /// <summary>
        /// Disconnect MercadoPago OAuth integration
        /// </summary>
        [HttpPost("disconnect")]
        [Authorize]
        public async Task<IActionResult> DisconnectOAuth([FromBody] DisconnectMercadoPagoDto dto)
        {
            try
            {
                var result = await _oauthService.DisconnectOAuthAsync(dto);
                
                if (result.Success)
                {
                    return Ok(new 
                    { 
                        success = true, 
                        message = "MercadoPago disconnected successfully" 
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting OAuth");
                return StatusCode(500, new { error = "Error disconnecting OAuth" });
            }
        }

        /// <summary>
        /// Test the current OAuth connection
        /// </summary>
        [HttpPost("test")]
        [Authorize]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                var result = await _oauthService.TestConnectionAsync();
                
                return Ok(new 
                { 
                    success = result.Success, 
                    message = result.Message,
                    isConnected = result.Success
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing connection");
                return StatusCode(500, new { error = "Error testing connection" });
            }
        }

        /// <summary>
        /// Get account information from MercadoPago
        /// </summary>
        [HttpGet("account-info")]
        [Authorize]
        public async Task<IActionResult> GetAccountInfo()
        {
            try
            {
                var result = await _oauthService.GetAccountInfoAsync();
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        success = true,
                        account = result.Data
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account info");
                return StatusCode(500, new { error = "Error getting account info" });
            }
        }

        /// <summary>
        /// Platform admin endpoint to configure OAuth settings
        /// </summary>
        [HttpPost("platform/configure")]
        [Authorize(Roles = "super_admin")]
        public async Task<IActionResult> ConfigurePlatformOAuth([FromBody] PlatformOAuthConfigDto dto)
        {
            try
            {
                var result = await _oauthService.ConfigurePlatformOAuthAsync(dto);
                
                if (result.Success)
                {
                    return Ok(new 
                    { 
                        success = true, 
                        message = "Platform OAuth configured successfully" 
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error configuring platform OAuth");
                return StatusCode(500, new { error = "Error configuring OAuth" });
            }
        }

        #region Private Methods

        private string GenerateCallbackHtml(bool success, string message, string? error)
        {
            var statusClass = success ? "success" : "error";
            var icon = success ? "✅" : "❌";
            
            return $@"
<!DOCTYPE html>
<html>
<head>
    <title>MercadoPago OAuth</title>
    <meta charset='utf-8'>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }}
        .container {{
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
        }}
        .icon {{
            font-size: 48px;
            margin-bottom: 20px;
        }}
        .message {{
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
        }}
        .error {{
            color: #dc3545;
            font-size: 14px;
            margin-top: 10px;
        }}
        .success {{
            color: #28a745;
        }}
        .loading {{
            font-size: 14px;
            color: #666;
            margin-top: 20px;
        }}
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
        // Send result to parent window if opened in popup
        if (window.opener) {{
            window.opener.postMessage({{
                type: 'mercadopago-oauth-result',
                success: {success.ToString().ToLower()},
                message: '{message}',
                error: '{error ?? ""}'
            }}, '*');
            
            setTimeout(() => {{
                window.close();
            }}, 2000);
        }} else {{
            // If not in popup, redirect to app after 3 seconds
            setTimeout(() => {{
                window.location.href = '/dashboard/settings/payments';
            }}, 3000);
        }}
    </script>
</body>
</html>";
        }

        #endregion
    }
}