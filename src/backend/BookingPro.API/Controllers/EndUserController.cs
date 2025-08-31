using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/enduser")]
    public class EndUserController : ControllerBase
    {
        private readonly IEndUserService _endUserService;
        private readonly ILogger<EndUserController> _logger;

        public EndUserController(
            IEndUserService endUserService,
            ILogger<EndUserController> logger)
        {
            _endUserService = endUserService;
            _logger = logger;
        }

        /// <summary>
        /// Register new end user and start 7-day demo
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> RegisterEndUser([FromBody] RegisterEndUserDto dto)
        {
            try
            {
                var result = await _endUserService.RegisterEndUserAsync(dto);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        success = true,
                        data = result.Data,
                        message = "Demo de 7 días activado exitosamente"
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering end user");
                return StatusCode(500, new { error = "Error al registrar usuario" });
            }
        }

        /// <summary>
        /// Get end user status and access information
        /// </summary>
        [HttpGet("status/{email}")]
        public async Task<IActionResult> GetEndUserStatus(string email)
        {
            try
            {
                var result = await _endUserService.GetEndUserStatusAsync(email);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(result.Data);
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting end user status");
                return StatusCode(500, new { error = "Error al obtener estado del usuario" });
            }
        }

        /// <summary>
        /// Create subscription payment after demo period
        /// </summary>
        [HttpPost("subscribe")]
        public async Task<IActionResult> CreateSubscription([FromBody] CreateEndUserSubscriptionDto dto)
        {
            try
            {
                var result = await _endUserService.CreateEndUserSubscriptionAsync(dto);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        success = true,
                        paymentLink = result.Data.PaymentLink,
                        preferenceId = result.Data.PreferenceId,
                        amount = result.Data.Amount,
                        expiresAt = result.Data.ExpiresAt,
                        qrCode = result.Data.QrCode,
                        deepLink = result.Data.DeepLink,
                        membershipId = result.Data.MembershipId
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating end user subscription");
                return StatusCode(500, new { error = "Error al crear suscripción" });
            }
        }

        /// <summary>
        /// Create renewal payment for existing end user
        /// </summary>
        [HttpPost("renew")]
        public async Task<IActionResult> CreateRenewal([FromBody] CreateRenewalPaymentDto dto)
        {
            try
            {
                var result = await _endUserService.CreateRenewalPaymentAsync(dto);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        success = true,
                        paymentLink = result.Data.PaymentLink,
                        preferenceId = result.Data.PreferenceId,
                        amount = result.Data.Amount,
                        expiresAt = result.Data.ExpiresAt,
                        qrCode = result.Data.QrCode
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating renewal payment");
                return StatusCode(500, new { error = "Error al crear pago de renovación" });
            }
        }

        /// <summary>
        /// Check if user has active access
        /// </summary>
        [HttpGet("access/{email}")]
        public async Task<IActionResult> CheckAccess(string email)
        {
            try
            {
                var result = await _endUserService.HasActiveAccessAsync(email);
                
                return Ok(new { hasAccess = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking user access");
                return StatusCode(500, new { error = "Error al verificar acceso" });
            }
        }

        /// <summary>
        /// Webhook endpoint for MercadoPago payments (B2C)
        /// </summary>
        [HttpPost("/api/webhooks/enduser/mercadopago/{tenantId}")]
        public async Task<IActionResult> EndUserPaymentWebhook(string tenantId, [FromQuery] string id, [FromQuery] string topic)
        {
            try
            {
                _logger.LogInformation("Received end user webhook for tenant {TenantId}, payment {PaymentId}, topic {Topic}", 
                    tenantId, id, topic);

                if (topic == "payment")
                {
                    var result = await _endUserService.ProcessEndUserPaymentWebhookAsync(tenantId, id);
                    
                    if (result.Success)
                    {
                        return Ok();
                    }
                    else
                    {
                        _logger.LogWarning("End user webhook processing failed: {Error}", result.Message);
                        return Ok(); // Return 200 to prevent retries for business logic failures
                    }
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing end user webhook");
                return Ok(); // Always return 200 to prevent webhook retries
            }
        }

        /// <summary>
        /// Get all end users for current tenant (admin only)
        /// </summary>
        [HttpGet("list")]
        public async Task<IActionResult> GetEndUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                var result = await _endUserService.GetTenantEndUsersAsync(page, pageSize);
                
                if (result.Success)
                {
                    return Ok(new
                    {
                        success = true,
                        data = result.Data,
                        page,
                        pageSize
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting end users");
                return StatusCode(500, new { error = "Error al obtener usuarios" });
            }
        }
    }
}