using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using BookingPro.API.Services;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Controller para gestionar suscripciones recurrentes con MercadoPago Preapproval.
    /// </summary>
    [ApiController]
    [Route("api/preapproval")]
    public class PreapprovalController : ControllerBase
    {
        private readonly IPreapprovalService _preapprovalService;
        private readonly ILogger<PreapprovalController> _logger;

        public PreapprovalController(
            IPreapprovalService preapprovalService,
            ILogger<PreapprovalController> logger)
        {
            _preapprovalService = preapprovalService;
            _logger = logger;
        }

        /// <summary>
        /// Crea un nuevo Preapproval para que el tenant autorice débito automático.
        /// Devuelve una URL (init_point) donde el usuario debe autorizar.
        /// </summary>
        [HttpPost("create")]
        [Authorize]
        public async Task<IActionResult> CreatePreapproval([FromBody] CreatePreapprovalDto dto)
        {
            try
            {
                // Obtener TenantId del usuario actual
                var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return BadRequest(new { error = "No tenant context" });
                }

                var result = await _preapprovalService.CreatePreapprovalAsync(
                    tenantId,
                    dto.SubscriptionPlanId,
                    dto.PayerEmail);

                if (!result.Success || result.Data == null)
                {
                    return BadRequest(new { error = result.Message });
                }

                var preapproval = result.Data;

                return Ok(new
                {
                    success = true,
                    preapprovalId = preapproval.Id,
                    mercadoPagoId = preapproval.MercadoPagoPreapprovalId,
                    initPoint = preapproval.InitPoint,
                    sandboxInitPoint = preapproval.SandboxInitPoint,
                    status = preapproval.Status,
                    amount = preapproval.TransactionAmount,
                    currency = preapproval.CurrencyId,
                    message = "Redirige al usuario a initPoint para que autorice el débito automático"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating preapproval");
                return StatusCode(500, new { error = "Error creating preapproval" });
            }
        }

        /// <summary>
        /// Obtiene el estado actual del Preapproval activo del tenant.
        /// </summary>
        [HttpGet("status")]
        [Authorize]
        public async Task<IActionResult> GetPreapprovalStatus()
        {
            try
            {
                var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return BadRequest(new { error = "No tenant context" });
                }

                var preapproval = await _preapprovalService.GetActivePreapprovalForTenantAsync(tenantId);

                if (preapproval == null)
                {
                    return Ok(new
                    {
                        hasActivePreapproval = false,
                        message = "No active recurring subscription"
                    });
                }

                return Ok(new
                {
                    hasActivePreapproval = true,
                    preapprovalId = preapproval.Id,
                    mercadoPagoId = preapproval.MercadoPagoPreapprovalId,
                    status = preapproval.Status,
                    planId = preapproval.SubscriptionPlanId,
                    planName = preapproval.SubscriptionPlan?.Name,
                    amount = preapproval.TransactionAmount,
                    currency = preapproval.CurrencyId,
                    payerEmail = preapproval.PayerEmail,
                    authorizedAt = preapproval.AuthorizedAt,
                    nextPaymentDate = preapproval.NextPaymentDate,
                    lastPaymentDate = preapproval.LastPaymentDate,
                    totalPayments = preapproval.TotalPaymentsProcessed,
                    totalPaid = preapproval.TotalAmountPaid
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting preapproval status");
                return StatusCode(500, new { error = "Error getting status" });
            }
        }

        /// <summary>
        /// Obtiene el historial de preapprovals del tenant.
        /// </summary>
        [HttpGet("history")]
        [Authorize]
        public async Task<IActionResult> GetPreapprovalHistory()
        {
            try
            {
                var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return BadRequest(new { error = "No tenant context" });
                }

                var preapprovals = await _preapprovalService.GetTenantPreapprovalsAsync(tenantId);

                return Ok(new
                {
                    success = true,
                    data = preapprovals.Select(p => new
                    {
                        id = p.Id,
                        mercadoPagoId = p.MercadoPagoPreapprovalId,
                        status = p.Status,
                        planName = p.SubscriptionPlan?.Name,
                        amount = p.TransactionAmount,
                        currency = p.CurrencyId,
                        createdAt = p.CreatedAt,
                        authorizedAt = p.AuthorizedAt,
                        cancelledAt = p.CancelledAt,
                        totalPayments = p.TotalPaymentsProcessed,
                        payments = p.Payments.Select(pay => new
                        {
                            id = pay.Id,
                            amount = pay.Amount,
                            status = pay.Status,
                            paymentDate = pay.PaymentDate
                        }).ToList()
                    }).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting preapproval history");
                return StatusCode(500, new { error = "Error getting history" });
            }
        }

        /// <summary>
        /// Cancela el Preapproval activo del tenant.
        /// </summary>
        [HttpPost("cancel")]
        [Authorize]
        public async Task<IActionResult> CancelPreapproval()
        {
            try
            {
                var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return BadRequest(new { error = "No tenant context" });
                }

                var preapproval = await _preapprovalService.GetActivePreapprovalForTenantAsync(tenantId);
                if (preapproval == null)
                {
                    return BadRequest(new { error = "No active preapproval to cancel" });
                }

                var result = await _preapprovalService.CancelPreapprovalAsync(preapproval.MercadoPagoPreapprovalId);

                if (!result.Success)
                {
                    return BadRequest(new { error = result.Message });
                }

                return Ok(new
                {
                    success = true,
                    message = "Subscription cancelled. Access will continue until the current period ends."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling preapproval");
                return StatusCode(500, new { error = "Error cancelling preapproval" });
            }
        }

        /// <summary>
        /// Pausa el Preapproval activo del tenant.
        /// </summary>
        [HttpPost("pause")]
        [Authorize]
        public async Task<IActionResult> PausePreapproval()
        {
            try
            {
                var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return BadRequest(new { error = "No tenant context" });
                }

                var preapproval = await _preapprovalService.GetActivePreapprovalForTenantAsync(tenantId);
                if (preapproval == null)
                {
                    return BadRequest(new { error = "No active preapproval to pause" });
                }

                var result = await _preapprovalService.PausePreapprovalAsync(preapproval.MercadoPagoPreapprovalId);

                if (!result.Success)
                {
                    return BadRequest(new { error = result.Message });
                }

                return Ok(new
                {
                    success = true,
                    message = "Subscription paused"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error pausing preapproval");
                return StatusCode(500, new { error = "Error pausing preapproval" });
            }
        }
    }

    /// <summary>
    /// Controller para recibir webhooks de MercadoPago Preapproval.
    /// </summary>
    [ApiController]
    [Route("api/webhooks")]
    public class PreapprovalWebhookController : ControllerBase
    {
        private readonly IPreapprovalService _preapprovalService;
        private readonly ILogger<PreapprovalWebhookController> _logger;

        public PreapprovalWebhookController(
            IPreapprovalService preapprovalService,
            ILogger<PreapprovalWebhookController> logger)
        {
            _preapprovalService = preapprovalService;
            _logger = logger;
        }

        /// <summary>
        /// Webhook endpoint para notificaciones de MercadoPago Preapproval.
        /// Recibe notificaciones cuando:
        /// - subscription_preapproval: El usuario autoriza, pausa o cancela la suscripción
        /// - subscription_authorized_payment: Se procesa un pago recurrente
        /// </summary>
        [HttpPost("preapproval")]
        [AllowAnonymous]
        public async Task<IActionResult> HandlePreapprovalNotification()
        {
            try
            {
                // Leer body
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                _logger.LogInformation("Preapproval webhook received: {Body}", body);

                if (string.IsNullOrWhiteSpace(body))
                {
                    // Query params (legacy format)
                    var id = Request.Query["id"].FirstOrDefault();
                    var topic = Request.Query["topic"].FirstOrDefault();

                    if (!string.IsNullOrEmpty(id) && topic == "preapproval")
                    {
                        await _preapprovalService.ProcessPreapprovalWebhookAsync(id, "updated");
                    }
                    else if (!string.IsNullOrEmpty(id) && topic == "authorized_payment")
                    {
                        await _preapprovalService.ProcessAuthorizedPaymentWebhookAsync(id);
                    }

                    return Ok(new { status = "processed_query" });
                }

                // JSON body format
                var notification = JsonSerializer.Deserialize<JsonElement>(body);

                var type = notification.TryGetProperty("type", out var t) ? t.GetString() : null;
                var action = notification.TryGetProperty("action", out var a) ? a.GetString() : null;

                string? dataId = null;
                if (notification.TryGetProperty("data", out var data) && data.TryGetProperty("id", out var dataIdProp))
                {
                    dataId = dataIdProp.ValueKind == JsonValueKind.String
                        ? dataIdProp.GetString()
                        : dataIdProp.GetRawText();
                }

                _logger.LogInformation(
                    "Webhook notification - Type: {Type}, Action: {Action}, DataId: {DataId}",
                    type, action, dataId);

                // subscription_preapproval: cambios en estado de la suscripción
                if (type == "subscription_preapproval" && !string.IsNullOrWhiteSpace(dataId))
                {
                    await _preapprovalService.ProcessPreapprovalWebhookAsync(dataId, action ?? "updated");
                    return Ok(new { status = "processed_preapproval" });
                }

                // subscription_authorized_payment: pago recurrente procesado
                if (type == "subscription_authorized_payment" && !string.IsNullOrWhiteSpace(dataId))
                {
                    await _preapprovalService.ProcessAuthorizedPaymentWebhookAsync(dataId);
                    return Ok(new { status = "processed_payment" });
                }

                // payment: pago directo (fallback)
                if (type == "payment" && !string.IsNullOrWhiteSpace(dataId))
                {
                    // Podría ser un pago de preapproval
                    await _preapprovalService.ProcessAuthorizedPaymentWebhookAsync(dataId);
                    return Ok(new { status = "processed_payment_fallback" });
                }

                _logger.LogInformation("Webhook ignored - unhandled type: {Type}", type);
                return Ok(new { status = "ignored" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing preapproval webhook");
                // Siempre devolver 200 para evitar reintentos de MP
                return Ok(new { status = "error", message = ex.Message });
            }
        }
    }

    // DTOs
    public class CreatePreapprovalDto
    {
        public Guid SubscriptionPlanId { get; set; }
        public string? PayerEmail { get; set; }
    }
}
