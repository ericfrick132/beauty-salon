using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookingPro.API.Models.Constants;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/platform")]
    [Authorize(Roles = Roles.SuperAdmin)]
    public class PlatformController : ControllerBase
    {
        private readonly IPlatformPaymentService _platformPaymentService;
        private readonly ILogger<PlatformController> _logger;

        public PlatformController(
            IPlatformPaymentService platformPaymentService,
            ILogger<PlatformController> logger)
        {
            _platformPaymentService = platformPaymentService;
            _logger = logger;
        }

        /// <summary>
        /// Configure platform MercadoPago credentials
        /// </summary>
        [HttpPost("configure-mercadopago")]
        public async Task<IActionResult> ConfigureMercadoPago([FromBody] ConfigurePlatformMercadoPagoDto dto)
        {
            try
            {
                var result = await _platformPaymentService.ConfigurePlatformMercadoPagoAsync(
                    dto.AccessToken, dto.RefreshToken, dto.IsSandbox);
                
                if (result.Success)
                {
                    return Ok(new { message = "Platform MercadoPago configured successfully" });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error configuring platform MercadoPago");
                return StatusCode(500, new { error = "Error configuring payment system" });
            }
        }

        /// <summary>
        /// Check if platform is configured
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetPlatformStatus()
        {
            try
            {
                var result = await _platformPaymentService.IsPlatformConfiguredAsync();
                
                return Ok(new { isConfigured = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting platform status");
                return StatusCode(500, new { error = "Error checking platform status" });
            }
        }

        /// <summary>
        /// Create subscription payment for a tenant
        /// </summary>
        [HttpPost("tenant-subscription")]
        public async Task<IActionResult> CreateTenantSubscription([FromBody] CreateTenantSubscriptionPaymentDto dto)
        {
            try
            {
                var result = await _platformPaymentService.CreateTenantSubscriptionPaymentAsync(dto);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        success = true,
                        paymentId = result.Data.PaymentId,
                        paymentLink = result.Data.PaymentLink,
                        amount = result.Data.Amount,
                        period = result.Data.Period,
                        expiresAt = result.Data.ExpiresAt,
                        periodStart = result.Data.PeriodStart,
                        periodEnd = result.Data.PeriodEnd
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tenant subscription");
                return StatusCode(500, new { error = "Error creating tenant subscription" });
            }
        }

        /// <summary>
        /// Get payment history for a tenant
        /// </summary>
        [HttpGet("tenant/{tenantId}/payments")]
        public async Task<IActionResult> GetTenantPayments(Guid tenantId)
        {
            try
            {
                var result = await _platformPaymentService.GetTenantPaymentHistoryAsync(tenantId);
                
                if (result.Success)
                {
                    return Ok(new
                    {
                        success = true,
                        data = result.Data
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tenant payments");
                return StatusCode(500, new { error = "Error retrieving payment history" });
            }
        }

        /// <summary>
        /// Check if tenant has active subscription
        /// </summary>
        [HttpGet("tenant/{tenantId}/active")]
        public async Task<IActionResult> CheckTenantSubscription(Guid tenantId)
        {
            try
            {
                var activeResult = await _platformPaymentService.HasActiveSubscriptionAsync(tenantId);
                var dueDateResult = await _platformPaymentService.GetNextPaymentDueDateAsync(tenantId);
                
                return Ok(new
                {
                    hasActiveSubscription = activeResult.Data,
                    nextPaymentDue = dueDateResult.Data
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking tenant subscription");
                return StatusCode(500, new { error = "Error checking subscription status" });
            }
        }

        /// <summary>
        /// Create renewal payment for expired tenant
        /// </summary>
        [HttpPost("tenant/{tenantId}/renew")]
        public async Task<IActionResult> CreateTenantRenewal(Guid tenantId, [FromBody] CreateTenantRenewalDto dto)
        {
            try
            {
                var result = await _platformPaymentService.CreateTenantRenewalPaymentAsync(tenantId, dto.Period);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        success = true,
                        paymentLink = result.Data.PaymentLink,
                        amount = result.Data.Amount,
                        period = result.Data.Period,
                        expiresAt = result.Data.ExpiresAt
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tenant renewal");
                return StatusCode(500, new { error = "Error creating renewal payment" });
            }
        }

        /// <summary>
        /// Webhook endpoint for platform payments (B2B)
        /// </summary>
        [HttpPost("/api/webhooks/platform/mercadopago")]
        [AllowAnonymous]
        public async Task<IActionResult> PlatformPaymentWebhook([FromQuery] string id, [FromQuery] string topic)
        {
            try
            {
                _logger.LogInformation("Received platform webhook, payment {PaymentId}, topic {Topic}", id, topic);

                if (topic == "payment")
                {
                    var result = await _platformPaymentService.ProcessPlatformPaymentWebhookAsync(id);
                    
                    if (result.Success)
                    {
                        return Ok();
                    }
                    else
                    {
                        _logger.LogWarning("Platform webhook processing failed: {Error}", result.Message);
                        return Ok(); // Return 200 to prevent retries
                    }
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing platform webhook");
                return Ok(); // Always return 200 to prevent webhook retries
            }
        }
    }

    // Supporting DTOs
    public class ConfigurePlatformMercadoPagoDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string? RefreshToken { get; set; }
        public bool IsSandbox { get; set; } = true;
    }

        public class CreateTenantRenewalDto
        {
            public string Period { get; set; } = "monthly";
        }

        public class CreateMessagePurchaseDto
        {
            public Guid PackageId { get; set; }
        }
}
