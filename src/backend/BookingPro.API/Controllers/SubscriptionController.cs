using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/subscription")]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly ILogger<SubscriptionController> _logger;

        public SubscriptionController(
            ISubscriptionService subscriptionService,
            ILogger<SubscriptionController> logger)
        {
            _subscriptionService = subscriptionService;
            _logger = logger;
        }

        private string GetTenantId()
        {
            return User.FindFirst("tenantId")?.Value ?? 
                   User.FindFirst("tenant_id")?.Value ?? 
                   User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                   throw new UnauthorizedAccessException("TenantId not found in claims");
        }

        [HttpGet("plans")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans()
        {
            try
            {
                var result = await _subscriptionService.GetAvailablePlansAsync();
                
                if (result.Success)
                {
                    return Ok(result.Data);
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription plans");
                return StatusCode(500, new { error = "Error al obtener planes" });
            }
        }

        [HttpPost("subscribe")]
        [Authorize]
        public async Task<IActionResult> Subscribe([FromBody] CreateSubscriptionDto dto)
        {
            try
            {
                var tenantId = GetTenantId();
                
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return BadRequest(new { error = "Invalid tenant ID" });
                }
                
                var result = await _subscriptionService.CreateSubscriptionAsync(tenantGuid, dto.PlanCode);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(new
                    {
                        subscriptionId = result.Data.Id,
                        status = result.Data.Status,
                        planType = result.Data.PlanType,
                        monthlyAmount = result.Data.MonthlyAmount,
                        qrCode = result.Data.QrCode,
                        paymentUrl = result.Data.InitPoint
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription");
                return StatusCode(500, new { error = "Error al crear suscripción" });
            }
        }

        [HttpPost("initialize-trial")]
        [Authorize]
        public async Task<IActionResult> InitializeTrial()
        {
            try
            {
                var tenantId = GetTenantId();
                
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return BadRequest(new { error = "Invalid tenant ID" });
                }
                
                var result = await _subscriptionService.CreateTrialSubscriptionAsync(tenantGuid);
                
                if (result.Success)
                {
                    return Ok(new { 
                        message = "Período de prueba iniciado exitosamente",
                        subscription = result.Data
                    });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing trial subscription");
                return StatusCode(500, new { error = "Error al inicializar período de prueba" });
            }
        }

        [HttpGet("status")]
        [Authorize]
        public async Task<IActionResult> GetStatus()
        {
            try
            {
                var tenantId = GetTenantId();
                
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return BadRequest(new { error = "Invalid tenant ID" });
                }
                
                var result = await _subscriptionService.GetSubscriptionStatusAsync(tenantGuid);
                
                if (result.Success && result.Data != null)
                {
                    return Ok(result.Data);
                }
                
                return NotFound(new { error = "Suscripción no encontrada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription status");
                return StatusCode(500, new { error = "Error al obtener estado de suscripción" });
            }
        }

        [HttpPost("cancel")]
        [Authorize]
        public async Task<IActionResult> Cancel()
        {
            try
            {
                var tenantId = GetTenantId();
                
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return BadRequest(new { error = "Invalid tenant ID" });
                }
                
                var result = await _subscriptionService.CancelSubscriptionAsync(tenantGuid);
                
                if (result.Success)
                {
                    return Ok(new { message = "Suscripción cancelada exitosamente" });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling subscription");
                return StatusCode(500, new { error = "Error al cancelar suscripción" });
            }
        }

        [HttpGet("payment-qr/{planCode}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentQR(string planCode)
        {
            try
            {
                var tenantId = GetTenantId();

                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return BadRequest(new { error = "Invalid tenant ID" });
                }

                var result = await _subscriptionService.GeneratePaymentQRWithUrlAsync(tenantGuid, planCode);

                if (result.Success && result.Data != null)
                {
                    return Ok(new {
                        qrCode = result.Data.QrCode,
                        paymentUrl = result.Data.PaymentUrl
                    });
                }

                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating payment QR");
                return StatusCode(500, new { error = "Error al generar código QR" });
            }
        }

        [HttpPost("check-trial")]
        [Authorize]
        public async Task<IActionResult> CheckTrialStatus()
        {
            try
            {
                var tenantId = GetTenantId();
                
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return BadRequest(new { error = "Invalid tenant ID" });
                }
                
                var result = await _subscriptionService.CheckAndUpdateTrialStatusAsync(tenantGuid);
                
                if (result.Success)
                {
                    return Ok(new { isActive = result.Data, message = result.Message });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking trial status");
                return StatusCode(500, new { error = "Error al verificar estado de prueba" });
            }
        }

        // Webhook endpoint for MercadoPago subscription notifications
        [HttpPost("/api/webhooks/mercadopago/subscription")]
        [AllowAnonymous]
        public async Task<IActionResult> WebhookSubscription([FromBody] Dictionary<string, object> data)
        {
            try
            {
                // Log the webhook for debugging
                _logger.LogInformation($"Received MercadoPago subscription webhook: {System.Text.Json.JsonSerializer.Serialize(data)}");
                
                // Verify webhook signature if configured
                var webhookSecret = Request.Headers["X-Signature"];
                // TODO: Implement signature verification
                
                var result = await _subscriptionService.ProcessSubscriptionWebhookAsync(data);
                
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing subscription webhook");
                return Ok(); // Always return OK to avoid webhook retries
            }
        }

        [HttpPost("initialize-plans")]
        [Authorize(Roles = "super_admin")]
        public async Task<IActionResult> InitializePlans()
        {
            try
            {
                var result = await _subscriptionService.InitializePlansAsync();
                
                if (result.Success)
                {
                    return Ok(new { message = "Planes inicializados correctamente" });
                }
                
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing plans");
                return StatusCode(500, new { error = "Error al inicializar planes" });
            }
        }
    }
}