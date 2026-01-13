using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Services
{
    public interface IPreapprovalService
    {
        /// <summary>
        /// Crea un Preapproval en MercadoPago para que el tenant autorice débito automático.
        /// </summary>
        Task<ServiceResult<TenantPreapproval>> CreatePreapprovalAsync(Guid tenantId, Guid subscriptionPlanId, string? payerEmail = null);

        /// <summary>
        /// Obtiene información actualizada del Preapproval desde MercadoPago.
        /// </summary>
        Task<ServiceResult<PreapprovalInfo>> GetPreapprovalAsync(string preapprovalId);

        /// <summary>
        /// Cancela un Preapproval en MercadoPago.
        /// </summary>
        Task<ServiceResult<bool>> CancelPreapprovalAsync(string preapprovalId);

        /// <summary>
        /// Pausa un Preapproval en MercadoPago.
        /// </summary>
        Task<ServiceResult<bool>> PausePreapprovalAsync(string preapprovalId);

        /// <summary>
        /// Procesa webhook de cambio de estado del Preapproval (authorized, paused, cancelled).
        /// </summary>
        Task<ServiceResult<bool>> ProcessPreapprovalWebhookAsync(string preapprovalId, string action);

        /// <summary>
        /// Procesa webhook de pago autorizado (cobro recurrente).
        /// </summary>
        Task<ServiceResult<bool>> ProcessAuthorizedPaymentWebhookAsync(string authorizedPaymentId);

        /// <summary>
        /// Obtiene el Preapproval activo de un tenant.
        /// </summary>
        Task<TenantPreapproval?> GetActivePreapprovalForTenantAsync(Guid tenantId);

        /// <summary>
        /// Obtiene todos los Preapprovals de un tenant.
        /// </summary>
        Task<List<TenantPreapproval>> GetTenantPreapprovalsAsync(Guid tenantId);
    }

    public class PreapprovalInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? PayerId { get; set; }
        public string? PayerEmail { get; set; }
        public DateTime? DateCreated { get; set; }
        public DateTime? LastModified { get; set; }
        public DateTime? NextPaymentDate { get; set; }
        public decimal? TransactionAmount { get; set; }
        public string? CurrencyId { get; set; }
        public string? ExternalReference { get; set; }
        public string? Reason { get; set; }
    }

    public class PreapprovalService : IPreapprovalService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PreapprovalService> _logger;

        private const string MP_API_BASE = "https://api.mercadopago.com";

        public PreapprovalService(
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<PreapprovalService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<ServiceResult<TenantPreapproval>> CreatePreapprovalAsync(
            Guid tenantId,
            Guid subscriptionPlanId,
            string? payerEmail = null)
        {
            try
            {
                // Obtener tenant
                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null)
                {
                    return ServiceResult<TenantPreapproval>.Fail("Tenant not found");
                }

                // Obtener plan
                var plan = await _context.SubscriptionPlans.FindAsync(subscriptionPlanId);
                if (plan == null)
                {
                    return ServiceResult<TenantPreapproval>.Fail("Subscription plan not found");
                }

                // Verificar si ya tiene un preapproval activo
                var existingActive = await _context.TenantPreapprovals
                    .Where(p => p.TenantId == tenantId && p.Status == "authorized")
                    .FirstOrDefaultAsync();

                if (existingActive != null)
                {
                    return ServiceResult<TenantPreapproval>.Fail("Tenant already has an active subscription. Cancel it first.");
                }

                // Obtener credenciales de la plataforma
                var platformConfig = await _context.PlatformMercadoPagoConfigurations
                    .Where(c => c.IsActive)
                    .FirstOrDefaultAsync();

                if (platformConfig == null || string.IsNullOrEmpty(platformConfig.AccessToken))
                {
                    return ServiceResult<TenantPreapproval>.Fail("Platform MercadoPago not configured");
                }

                // Preparar datos para MercadoPago
                var email = !string.IsNullOrWhiteSpace(payerEmail) ? payerEmail : tenant.OwnerEmail;
                var externalReference = $"PREAPPROVAL-{tenantId}-{subscriptionPlanId}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
                var startDate = DateTime.UtcNow.AddMinutes(5);
                var endDate = startDate.AddYears(10); // 10 años de suscripción máxima

                var backUrl = _configuration["MercadoPago:PreapprovalBackUrl"]
                    ?? $"https://{tenant.Subdomain}.turnos-pro.com/subscription/recurring?status=success";
                var notificationUrl = _configuration["MercadoPago:PreapprovalWebhookUrl"]
                    ?? _configuration["MercadoPago:WebhookUrl"]?.Replace("/mercadopago", "/preapproval")
                    ?? "https://turnos-pro.com/api/webhooks/preapproval";

                var requestBody = new
                {
                    payer_email = email,
                    back_url = backUrl,
                    reason = $"Suscripción {plan.Name} - {tenant.BusinessName}",
                    auto_recurring = new
                    {
                        frequency = 1,
                        frequency_type = "months",
                        start_date = startDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        end_date = endDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        transaction_amount = plan.Price,
                        currency_id = plan.Currency ?? "ARS"
                    },
                    external_reference = externalReference,
                    notification_url = notificationUrl
                };

                // Llamar a MercadoPago API
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformConfig.AccessToken}");

                var jsonContent = JsonSerializer.Serialize(requestBody);
                _logger.LogInformation("Creating preapproval for tenant {TenantId}: {Request}", tenantId, jsonContent);

                var response = await client.PostAsync(
                    $"{MP_API_BASE}/preapproval",
                    new StringContent(jsonContent, Encoding.UTF8, "application/json"));

                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("MercadoPago response: {StatusCode} - {Response}", response.StatusCode, responseBody);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to create preapproval: {Response}", responseBody);
                    return ServiceResult<TenantPreapproval>.Fail($"MercadoPago error: {responseBody}");
                }

                var mpResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);

                // Crear registro en base de datos
                var preapproval = new TenantPreapproval
                {
                    TenantId = tenantId,
                    SubscriptionPlanId = subscriptionPlanId,
                    MercadoPagoPreapprovalId = mpResponse.GetProperty("id").GetString()!,
                    InitPoint = mpResponse.TryGetProperty("init_point", out var ip) ? ip.GetString() : null,
                    SandboxInitPoint = mpResponse.TryGetProperty("sandbox_init_point", out var sip) ? sip.GetString() : null,
                    Status = "pending",
                    PayerEmail = email,
                    FrequencyValue = 1,
                    FrequencyType = "months",
                    TransactionAmount = plan.Price,
                    CurrencyId = plan.Currency ?? "ARS",
                    ExternalReference = externalReference,
                    Reason = $"Suscripción {plan.Name}",
                    StartDate = startDate,
                    EndDate = endDate,
                    DateCreated = DateTime.UtcNow
                };

                _context.TenantPreapprovals.Add(preapproval);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Preapproval created successfully: {PreapprovalId} for tenant {TenantId}",
                    preapproval.MercadoPagoPreapprovalId, tenantId);

                return ServiceResult<TenantPreapproval>.Ok(preapproval);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating preapproval for tenant {TenantId}", tenantId);
                return ServiceResult<TenantPreapproval>.Fail($"Error creating preapproval: {ex.Message}");
            }
        }

        public async Task<ServiceResult<PreapprovalInfo>> GetPreapprovalAsync(string preapprovalId)
        {
            try
            {
                var platformConfig = await _context.PlatformMercadoPagoConfigurations
                    .Where(c => c.IsActive)
                    .FirstOrDefaultAsync();

                if (platformConfig == null)
                {
                    return ServiceResult<PreapprovalInfo>.Fail("Platform not configured");
                }

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformConfig.AccessToken}");

                var response = await client.GetAsync($"{MP_API_BASE}/preapproval/{preapprovalId}");
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to get preapproval {Id}: {Response}", preapprovalId, responseBody);
                    return ServiceResult<PreapprovalInfo>.Fail($"MercadoPago error: {responseBody}");
                }

                var data = JsonSerializer.Deserialize<JsonElement>(responseBody);

                var info = new PreapprovalInfo
                {
                    Id = data.GetProperty("id").GetString() ?? string.Empty,
                    Status = data.GetProperty("status").GetString() ?? "unknown",
                    PayerId = data.TryGetProperty("payer_id", out var pid) ? pid.GetString() : null,
                    ExternalReference = data.TryGetProperty("external_reference", out var er) ? er.GetString() : null,
                    Reason = data.TryGetProperty("reason", out var r) ? r.GetString() : null
                };

                // Parsear fechas
                if (data.TryGetProperty("date_created", out var dc) && DateTime.TryParse(dc.GetString(), out var dateCreated))
                    info.DateCreated = dateCreated;

                if (data.TryGetProperty("last_modified", out var lm) && DateTime.TryParse(lm.GetString(), out var lastModified))
                    info.LastModified = lastModified;

                if (data.TryGetProperty("next_payment_date", out var npd) && DateTime.TryParse(npd.GetString(), out var nextPayment))
                    info.NextPaymentDate = nextPayment;

                // Parsear auto_recurring
                if (data.TryGetProperty("auto_recurring", out var ar))
                {
                    if (ar.TryGetProperty("transaction_amount", out var ta))
                        info.TransactionAmount = ta.GetDecimal();
                    if (ar.TryGetProperty("currency_id", out var ci))
                        info.CurrencyId = ci.GetString();
                }

                return ServiceResult<PreapprovalInfo>.Ok(info);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting preapproval {Id}", preapprovalId);
                return ServiceResult<PreapprovalInfo>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> CancelPreapprovalAsync(string preapprovalId)
        {
            return await UpdatePreapprovalStatusAsync(preapprovalId, "cancelled");
        }

        public async Task<ServiceResult<bool>> PausePreapprovalAsync(string preapprovalId)
        {
            return await UpdatePreapprovalStatusAsync(preapprovalId, "paused");
        }

        private async Task<ServiceResult<bool>> UpdatePreapprovalStatusAsync(string preapprovalId, string newStatus)
        {
            try
            {
                var platformConfig = await _context.PlatformMercadoPagoConfigurations
                    .Where(c => c.IsActive)
                    .FirstOrDefaultAsync();

                if (platformConfig == null)
                {
                    return ServiceResult<bool>.Fail("Platform not configured");
                }

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformConfig.AccessToken}");

                var requestBody = new { status = newStatus };
                var response = await client.PutAsync(
                    $"{MP_API_BASE}/preapproval/{preapprovalId}",
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));

                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to update preapproval {Id} to {Status}: {Response}",
                        preapprovalId, newStatus, responseBody);
                    return ServiceResult<bool>.Fail($"MercadoPago error: {responseBody}");
                }

                // Actualizar en base de datos (IgnoreQueryFilters para webhooks sin contexto de tenant)
                var preapproval = await _context.TenantPreapprovals
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(p => p.MercadoPagoPreapprovalId == preapprovalId);

                if (preapproval != null)
                {
                    preapproval.Status = newStatus;
                    preapproval.UpdatedAt = DateTime.UtcNow;

                    if (newStatus == "cancelled")
                        preapproval.CancelledAt = DateTime.UtcNow;
                    else if (newStatus == "paused")
                        preapproval.PausedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();
                }

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating preapproval {Id} to {Status}", preapprovalId, newStatus);
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> ProcessPreapprovalWebhookAsync(string preapprovalId, string action)
        {
            try
            {
                _logger.LogInformation("Processing preapproval webhook: {Id}, action: {Action}", preapprovalId, action);

                // Obtener info actualizada de MercadoPago
                var infoResult = await GetPreapprovalAsync(preapprovalId);
                if (!infoResult.Success || infoResult.Data == null)
                {
                    _logger.LogWarning("Could not get preapproval info for {Id}", preapprovalId);
                    return ServiceResult<bool>.Fail("Could not get preapproval info");
                }

                var info = infoResult.Data;

                // Buscar preapproval en base de datos (IgnoreQueryFilters para webhooks sin contexto de tenant)
                var preapproval = await _context.TenantPreapprovals
                    .IgnoreQueryFilters()
                    .Include(p => p.Tenant)
                    .FirstOrDefaultAsync(p => p.MercadoPagoPreapprovalId == preapprovalId);

                if (preapproval == null)
                {
                    _logger.LogWarning("Preapproval {Id} not found in database", preapprovalId);
                    return ServiceResult<bool>.Fail("Preapproval not found");
                }

                var previousStatus = preapproval.Status;
                preapproval.Status = info.Status;
                preapproval.UpdatedAt = DateTime.UtcNow;

                switch (info.Status.ToLower())
                {
                    case "authorized":
                        preapproval.AuthorizedAt = DateTime.UtcNow;
                        preapproval.PayerId = info.PayerId;
                        preapproval.NextPaymentDate = info.NextPaymentDate ?? DateTime.UtcNow.AddMonths(1);

                        // ACTIVAR SUSCRIPCIÓN DEL TENANT
                        await ActivateTenantSubscriptionAsync(preapproval);
                        _logger.LogInformation("Tenant {TenantId} subscription activated via preapproval {Id}",
                            preapproval.TenantId, preapprovalId);
                        break;

                    case "paused":
                        preapproval.PausedAt = DateTime.UtcNow;
                        _logger.LogInformation("Preapproval {Id} paused", preapprovalId);
                        break;

                    case "cancelled":
                        preapproval.CancelledAt = DateTime.UtcNow;
                        // No desactivar inmediatamente - dejar que termine el período pagado
                        _logger.LogInformation("Preapproval {Id} cancelled", preapprovalId);
                        break;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Preapproval {Id} status changed: {OldStatus} -> {NewStatus}",
                    preapprovalId, previousStatus, info.Status);

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing preapproval webhook for {Id}", preapprovalId);
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> ProcessAuthorizedPaymentWebhookAsync(string authorizedPaymentId)
        {
            try
            {
                _logger.LogInformation("Processing authorized payment webhook: {Id}", authorizedPaymentId);

                // Obtener info del pago desde MercadoPago
                var platformConfig = await _context.PlatformMercadoPagoConfigurations
                    .Where(c => c.IsActive)
                    .FirstOrDefaultAsync();

                if (platformConfig == null)
                {
                    return ServiceResult<bool>.Fail("Platform not configured");
                }

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformConfig.AccessToken}");

                // Obtener info del authorized_payment
                var response = await client.GetAsync($"{MP_API_BASE}/authorized_payments/{authorizedPaymentId}");
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to get authorized payment {Id}: {Response}", authorizedPaymentId, responseBody);
                    return ServiceResult<bool>.Fail($"MercadoPago error");
                }

                var paymentData = JsonSerializer.Deserialize<JsonElement>(responseBody);

                // Extraer preapproval_id
                var preapprovalId = paymentData.TryGetProperty("preapproval_id", out var pid)
                    ? pid.GetString()
                    : null;

                if (string.IsNullOrEmpty(preapprovalId))
                {
                    _logger.LogWarning("No preapproval_id in authorized payment {Id}", authorizedPaymentId);
                    return ServiceResult<bool>.Fail("No preapproval_id");
                }

                // Buscar preapproval (IgnoreQueryFilters para webhooks sin contexto de tenant)
                var preapproval = await _context.TenantPreapprovals
                    .IgnoreQueryFilters()
                    .Include(p => p.Tenant)
                    .FirstOrDefaultAsync(p => p.MercadoPagoPreapprovalId == preapprovalId);

                if (preapproval == null)
                {
                    _logger.LogWarning("Preapproval {Id} not found for payment", preapprovalId);
                    return ServiceResult<bool>.Fail("Preapproval not found");
                }

                // Extraer datos del pago
                var paymentId = paymentData.TryGetProperty("payment", out var paymentNode)
                    && paymentNode.TryGetProperty("id", out var paymentIdNode)
                    ? paymentIdNode.GetInt64().ToString()
                    : authorizedPaymentId;

                var status = paymentData.TryGetProperty("payment", out var pn)
                    && pn.TryGetProperty("status", out var sn)
                    ? sn.GetString() ?? "unknown"
                    : "unknown";

                var statusDetail = paymentData.TryGetProperty("payment", out var pn2)
                    && pn2.TryGetProperty("status_detail", out var sd)
                    ? sd.GetString()
                    : null;

                var amount = paymentData.TryGetProperty("transaction_amount", out var ta)
                    ? ta.GetDecimal()
                    : preapproval.TransactionAmount;

                // Verificar si ya existe este pago (IgnoreQueryFilters para webhooks)
                var existingPayment = await _context.PreapprovalPayments
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(p => p.MercadoPagoPaymentId == paymentId);

                if (existingPayment != null)
                {
                    // Actualizar estado si cambió
                    if (existingPayment.Status != status)
                    {
                        existingPayment.Status = status;
                        existingPayment.StatusDetail = statusDetail;
                        await _context.SaveChangesAsync();
                    }
                    return ServiceResult<bool>.Ok(true);
                }

                // Crear registro de pago
                var payment = new PreapprovalPayment
                {
                    TenantId = preapproval.TenantId,
                    TenantPreapprovalId = preapproval.Id,
                    MercadoPagoPaymentId = paymentId,
                    MercadoPagoPreapprovalId = preapprovalId,
                    Amount = amount,
                    CurrencyId = preapproval.CurrencyId,
                    Status = status,
                    StatusDetail = statusDetail,
                    PaymentDate = DateTime.UtcNow,
                    ExternalReference = preapproval.ExternalReference,
                    PeriodStart = preapproval.LastPaymentDate ?? preapproval.AuthorizedAt ?? DateTime.UtcNow,
                    PeriodEnd = DateTime.UtcNow.AddMonths(1),
                    RawResponse = responseBody
                };

                _context.PreapprovalPayments.Add(payment);

                // Actualizar preapproval según resultado
                if (status == "approved")
                {
                    preapproval.LastPaymentDate = DateTime.UtcNow;
                    preapproval.NextPaymentDate = DateTime.UtcNow.AddMonths(1);
                    preapproval.ConsecutiveFailedPayments = 0;
                    preapproval.TotalPaymentsProcessed++;
                    preapproval.TotalAmountPaid += amount;

                    // Extender suscripción del tenant
                    await ExtendTenantSubscriptionAsync(preapproval);

                    _logger.LogInformation(
                        "Payment {PaymentId} approved for preapproval {PreapprovalId}, tenant {TenantId}",
                        paymentId, preapprovalId, preapproval.TenantId);
                }
                else if (status == "rejected")
                {
                    preapproval.ConsecutiveFailedPayments++;
                    preapproval.LastFailureReason = statusDetail;
                    payment.FailureReason = statusDetail;

                    _logger.LogWarning(
                        "Payment {PaymentId} rejected for preapproval {PreapprovalId}: {Reason}",
                        paymentId, preapprovalId, statusDetail);

                    // MercadoPago cancela automáticamente después de varios fallos
                    if (preapproval.ConsecutiveFailedPayments >= 3)
                    {
                        _logger.LogWarning(
                            "Preapproval {PreapprovalId} has {Count} consecutive failures",
                            preapprovalId, preapproval.ConsecutiveFailedPayments);
                    }
                }

                preapproval.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing authorized payment {Id}", authorizedPaymentId);
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        private async Task ActivateTenantSubscriptionAsync(TenantPreapproval preapproval)
        {
            // IgnoreQueryFilters porque este método es llamado desde webhooks sin contexto de tenant
            var tenant = preapproval.Tenant ?? await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == preapproval.TenantId);
            if (tenant == null) return;

            // Actualizar tenant
            tenant.Status = "active";
            tenant.PlanId = preapproval.SubscriptionPlanId;
            tenant.TrialEndsAt = preapproval.NextPaymentDate;
            tenant.UpdatedAt = DateTime.UtcNow;

            // Crear o actualizar Subscription (IgnoreQueryFilters para webhooks)
            var subscription = await _context.Subscriptions
                .IgnoreQueryFilters()
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(s => s.TenantId == preapproval.TenantId);

            var plan = await _context.SubscriptionPlans.FindAsync(preapproval.SubscriptionPlanId);

            if (subscription == null)
            {
                subscription = new Subscription
                {
                    TenantId = preapproval.TenantId,
                    PlanType = plan?.Code ?? "pro",
                    MonthlyAmount = preapproval.TransactionAmount,
                    MercadoPagoPreapprovalId = preapproval.MercadoPagoPreapprovalId,
                    PayerEmail = preapproval.PayerEmail,
                    Status = "active",
                    IsTrialPeriod = false,
                    ActivatedAt = DateTime.UtcNow,
                    NextPaymentDate = preapproval.NextPaymentDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Subscriptions.Add(subscription);
            }
            else
            {
                subscription.PlanType = plan?.Code ?? subscription.PlanType;
                subscription.MonthlyAmount = preapproval.TransactionAmount;
                subscription.MercadoPagoPreapprovalId = preapproval.MercadoPagoPreapprovalId;
                subscription.PayerEmail = preapproval.PayerEmail;
                subscription.Status = "active";
                subscription.IsTrialPeriod = false;
                subscription.ActivatedAt = subscription.ActivatedAt ?? DateTime.UtcNow;
                subscription.NextPaymentDate = preapproval.NextPaymentDate;
                subscription.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task ExtendTenantSubscriptionAsync(TenantPreapproval preapproval)
        {
            // IgnoreQueryFilters porque este método es llamado desde webhooks sin contexto de tenant
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == preapproval.TenantId);
            if (tenant != null)
            {
                tenant.TrialEndsAt = preapproval.NextPaymentDate;
                tenant.UpdatedAt = DateTime.UtcNow;
            }

            var subscription = await _context.Subscriptions
                .IgnoreQueryFilters()
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(s => s.TenantId == preapproval.TenantId);

            if (subscription != null)
            {
                subscription.NextPaymentDate = preapproval.NextPaymentDate;
                subscription.UpdatedAt = DateTime.UtcNow;
            }
        }

        public async Task<TenantPreapproval?> GetActivePreapprovalForTenantAsync(Guid tenantId)
        {
            return await _context.TenantPreapprovals
                .Include(p => p.SubscriptionPlan)
                .Where(p => p.TenantId == tenantId && p.Status == "authorized")
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<List<TenantPreapproval>> GetTenantPreapprovalsAsync(Guid tenantId)
        {
            return await _context.TenantPreapprovals
                .Include(p => p.SubscriptionPlan)
                .Include(p => p.Payments)
                .Where(p => p.TenantId == tenantId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }
}
