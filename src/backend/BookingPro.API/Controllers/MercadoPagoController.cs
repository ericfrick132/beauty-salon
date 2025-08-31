using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.DTOs;
using System.Security.Claims;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/mercadopago")]
    [Authorize]
    public class MercadoPagoController : ControllerBase
    {
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly ILogger<MercadoPagoController> _logger;

        public MercadoPagoController(
            IMercadoPagoService mercadoPagoService,
            ILogger<MercadoPagoController> logger)
        {
            _mercadoPagoService = mercadoPagoService;
            _logger = logger;
        }

        private string GetTenantId()
        {
            return User.FindFirst("tenantId")?.Value ?? 
                   User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                   throw new UnauthorizedAccessException("TenantId not found in claims");
        }

        [HttpGet("auth-url")]
        public async Task<IActionResult> GetAuthUrl()
        {
            try
            {
                var tenantId = GetTenantId();
                var result = await _mercadoPagoService.GetAuthorizationUrlAsync(tenantId);
                
                if (result.Success)
                {
                    return Ok(new { url = result.Data });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting MercadoPago auth URL");
                return StatusCode(500, new { error = "Error generating authorization URL" });
            }
        }

        [HttpGet("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> HandleCallback([FromQuery] string code, [FromQuery] string state)
        {
            try
            {
                if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
                {
                    return Redirect("/mercadopago-settings?error=missing_params");
                }

                var result = await _mercadoPagoService.ProcessOAuthCallbackAsync(code, state);
                
                if (result.Success)
                {
                    return Redirect("/mercadopago-settings?success=true");
                }
                
                return Redirect($"/mercadopago-settings?error={Uri.EscapeDataString(result.Message ?? "Connection failed")}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MercadoPago callback");
                return Redirect("/mercadopago-settings?error=callback_error");
            }
        }

        [HttpGet("configuration")]
        public async Task<IActionResult> GetConfiguration()
        {
            try
            {
                var tenantId = GetTenantId();
                var result = await _mercadoPagoService.GetConfigurationAsync(tenantId);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        id = result.Data.Id,
                        isActive = result.Data.IsActive,
                        connectedAt = result.Data.ConnectedAt,
                        userEmail = result.Data.UserEmail,
                        paymentExpirationMinutes = result.Data.PaymentExpirationMinutes
                    });
                }
                
                return Ok(new
                {
                    isActive = false,
                    paymentExpirationMinutes = 5
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting MercadoPago configuration");
                return StatusCode(500, new { error = "Error loading configuration" });
            }
        }

        [HttpPut("configuration")]
        public async Task<IActionResult> UpdateConfiguration([FromBody] UpdateMercadoPagoConfigDto dto)
        {
            try
            {
                var tenantId = GetTenantId();
                var result = await _mercadoPagoService.UpdateConfigurationAsync(tenantId, dto);
                
                if (result.Success)
                {
                    return Ok(new { message = "Configuration updated successfully" });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating MercadoPago configuration");
                return StatusCode(500, new { error = "Error updating configuration" });
            }
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect()
        {
            try
            {
                var tenantId = GetTenantId();
                var result = await _mercadoPagoService.DisconnectAsync(tenantId);
                
                if (result.Success)
                {
                    return Ok(new { message = "MercadoPago disconnected successfully" });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting MercadoPago");
                return StatusCode(500, new { error = "Error disconnecting MercadoPago" });
            }
        }

        [HttpPost("create-payment-link")]
        public async Task<IActionResult> CreatePaymentLink([FromBody] CreatePaymentLinkDto dto)
        {
            try
            {
                var tenantId = GetTenantId();
                var result = await _mercadoPagoService.CreatePaymentLinkAsync(tenantId, dto);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        paymentLink = result.Data.PaymentLink,
                        preferenceId = result.Data.PreferenceId,
                        expiresAt = result.Data.ExpiresAt
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment link");
                return StatusCode(500, new { error = "Error creating payment link" });
            }
        }

        [HttpGet("deposit-calculation/{serviceId}")]
        public async Task<IActionResult> CalculateDeposit(Guid serviceId, [FromQuery] Guid? customerId, [FromQuery] DateTime bookingDate)
        {
            try
            {
                var result = await _mercadoPagoService.CalculateDepositAsync(serviceId, customerId, bookingDate);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(result.Data);
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating deposit");
                return StatusCode(500, new { error = "Error calculating deposit" });
            }
        }
    }
}