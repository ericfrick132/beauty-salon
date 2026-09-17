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
        Task<ServiceResult<TenantPreapproval>> CreatePreapprovalAsync(
            Guid tenantId,
            Guid subscriptionPlanId,
            string? payerEmail = null,
            string? backUrlOverride = null);

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
        /// Consulta a MP las preapprovals pending recientes del tenant y aplica su estado real.
        /// Devuelve si el tenant quedó con una preapproval autorizada.
        /// </summary>
        Task<bool> ReconcileTenantPendingPreapprovalsAsync(Guid tenantId);

        /// <summary>
        /// Deja al tenant con una sola preapproval authorized (con dos, MP debita las dos): queda activa la más
        /// nueva que MP confirma autorizada y las demás se cancelan en MP. Devuelve cuántas se cancelaron.
        /// </summary>
        Task<int> ResolveDuplicateAuthorizedPreapprovalsAsync(Guid tenantId);

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

        /// <summary>
        /// Cambia de plan la preapproval autorizada del tenant sin crear otra: PUT /preapproval/{id} con el
        /// monto del plan nuevo, que MP cobra desde el próximo débito. Si MP no lo acepta no se toca nada local.
        /// </summary>
        Task<ServiceResult<PreapprovalPlanChange>> ChangePlanAsync(Guid tenantId, Guid subscriptionPlanId);
    }

    /// <summary>
    /// Códigos de <see cref="ServiceResult.Reason"/> de PreapprovalService.
    /// </summary>
    public static class PreapprovalFailReasons
    {
        /// <summary>
        /// CreatePreapprovalAsync no crea otra porque el tenant ya tiene una autorizada: el que llama pasa a
        /// ChangePlanAsync.
        /// </summary>
        public const string ActivePreapproval = "active_preapproval";
    }

    public class PreapprovalPlanChange
    {
        public Guid PreapprovalId { get; set; }
        public string MercadoPagoPreapprovalId { get; set; } = string.Empty;
        public Guid PlanId { get; set; }
        public string PlanCode { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string CurrencyId { get; set; } = "ARS";
        public DateTime? NextPaymentDate { get; set; }
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

        private readonly IPlatformPaymentConnectionService _platformConnections;

        public PreapprovalService(
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<PreapprovalService> logger,
            IPlatformPaymentConnectionService platformConnections)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _platformConnections = platformConnections;
        }

        /// <summary>
        /// Token de la cuenta que cobra, configurada en super admin → Cobros.
        /// </summary>
        private Task<string?> GetPlatformAccessTokenAsync()
            => _platformConnections.GetAccessTokenAsync("mercadopago");

        public async Task<ServiceResult<TenantPreapproval>> CreatePreapprovalAsync(
            Guid tenantId,
            Guid subscriptionPlanId,
            string? payerEmail = null,
            string? backUrlOverride = null)
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

                // Antes de mirar si ya tiene tarjeta, consultar MP por las pending recientes: si el negocio
                // autorizó y el webhook no llegó, no hay que mandarlo a autorizar otra vez.
                await ReconcileTenantPendingPreapprovalsAsync(tenantId);

                // Verificar si ya tiene un preapproval activo
                var existingActive = await _context.TenantPreapprovals
                    .Where(p => p.TenantId == tenantId && p.Status == "authorized")
                    .FirstOrDefaultAsync();

                // Nunca una segunda preapproval con una autorizada: MP cobraría las dos. El controller lo
                // toma por el Reason y cambia el plan de la misma (ChangePlanAsync).
                static ServiceResult<TenantPreapproval> AlreadyAuthorized() => new()
                {
                    Success = false,
                    Message = "Ya tenés el débito automático activo. Para pasarte a otro plan usá el cambio de plan.",
                    Reason = PreapprovalFailReasons.ActivePreapproval
                };

                if (existingActive != null)
                {
                    return AlreadyAuthorized();
                }

                // Obtener credenciales de la plataforma
                var platformAccessToken = await GetPlatformAccessTokenAsync();

                if (string.IsNullOrWhiteSpace(platformAccessToken))
                {
                    return ServiceResult<TenantPreapproval>.Fail("Platform MercadoPago not configured");
                }

                // Con credenciales TEST-, MP solo reconoce la preapproval en el checkout de
                // sandbox: mandar al usuario al init_point de producción muestra "esta página
                // no existe" aunque la preapproval se haya creado bien. Mismo criterio que ya
                // usa MercadoPagoService para pagos de seña.
                var isTestToken = platformAccessToken.StartsWith("TEST-", StringComparison.OrdinalIgnoreCase);
                if (isTestToken)
                {
                    _logger.LogWarning("Platform MercadoPago token is a TEST token; preapproval for tenant {TenantId} will redirect to the sandbox checkout.", tenantId);
                }

                // Preparar datos para MercadoPago
                var email = !string.IsNullOrWhiteSpace(payerEmail) ? payerEmail : tenant.OwnerEmail;

                // Reusar el checkout pending reciente (mismo plan, monto y email) en vez de crear otra
                // preapproval por click: con varias vivas el negocio podía autorizar dos y MP cobraría
                // las dos. El email tiene que coincidir porque MP ata la preapproval a ese payer_email.
                var planCurrency = plan.Currency ?? "ARS";
                var reusableFrom = DateTime.UtcNow.AddHours(-6);
                var reusable = await _context.TenantPreapprovals
                    .Where(p => p.TenantId == tenantId
                        && p.SubscriptionPlanId == subscriptionPlanId
                        && p.Status == "pending"
                        && p.TransactionAmount == plan.Price
                        && p.CurrencyId == planCurrency
                        && p.PayerEmail == email
                        && p.InitPoint != null
                        && p.CreatedAt >= reusableFrom)
                    .OrderByDescending(p => p.CreatedAt)
                    .FirstOrDefaultAsync();

                // Un solo checkout vivo por negocio: las demás pending se cancelan en MP antes de devolver la
                // reusada o crear otra. Si alguna ya estaba autorizada se aplica y no se lo manda a autorizar
                // de nuevo (el controller cambia el plan de esa).
                if (await CancelOtherPendingPreapprovalsAsync(tenantId, reusable?.Id))
                {
                    return AlreadyAuthorized();
                }

                if (reusable != null)
                {
                    // Las creadas antes del fix de "activation=true" guardaron el link que abre
                    // "Esta página no existe": se limpia igual que al crear.
                    var cleanInitPoint = CleanSubscriptionCheckoutUrl(reusable.InitPoint);
                    if (cleanInitPoint != reusable.InitPoint)
                    {
                        reusable.InitPoint = cleanInitPoint;
                        reusable.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }

                    _logger.LogInformation(
                        "Reusing pending preapproval {PreapprovalId} for tenant {TenantId} instead of creating another one",
                        reusable.MercadoPagoPreapprovalId, tenantId);
                    return ServiceResult<TenantPreapproval>.Ok(reusable);
                }

                var externalReference = $"PREAPPROVAL-{tenantId}-{subscriptionPlanId}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
                var startDate = DateTime.UtcNow.AddMinutes(5);
                var endDate = startDate.AddYears(10); // 10 años de suscripción máxima

                // back_url: el que pidió el caller (/empezar vuelve a /subscription/success?flow=trial),
                // si no el configurado, si no la página de suscripción recurrente del tenant.
                var backUrl = backUrlOverride
                    ?? _configuration["MercadoPago:PreapprovalBackUrl"]
                    ?? $"https://{tenant.Subdomain}.turnos-pro.com/subscription/recurring?status=success";
                var notificationUrl = _configuration["MercadoPago:PreapprovalWebhookUrl"]
                    ?? _configuration["MercadoPago:WebhookUrl"]?.Replace("/mercadopago", "/preapproval")
                    ?? "https://turnos-pro.com/api/webhooks/preapproval";

                // Prueba gratis nativa de MP (como PlayCrew y GymHero): mientras el tenant esté en trial la
                // tarjeta se autoriza HOY pero MP recién debita al terminar la prueba. MP lo muestra como
                // "X días gratis, luego $.../mes" y devuelve next_payment_date = fin de la prueba, que es lo
                // que ProcessPreapprovalWebhookAsync usa como próximo cobro al recibir "authorized".
                var trialDaysLeft = await GetTrialDaysLeftAsync(tenant);
                var autoRecurring = new Dictionary<string, object?>
                {
                    ["frequency"] = 1,
                    ["frequency_type"] = "months",
                    ["start_date"] = startDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    ["end_date"] = endDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    ["transaction_amount"] = plan.Price,
                    ["currency_id"] = plan.Currency ?? "ARS"
                };
                if (trialDaysLeft > 0)
                {
                    autoRecurring["free_trial"] = new Dictionary<string, object?>
                    {
                        ["frequency"] = trialDaysLeft,
                        ["frequency_type"] = "days"
                    };
                    _logger.LogInformation("Preapproval con free_trial de {Days} días para tenant {TenantId}", trialDaysLeft, tenantId);
                }

                var requestBody = new Dictionary<string, object?>
                {
                    ["payer_email"] = email,
                    ["back_url"] = backUrl,
                    ["reason"] = MercadoPagoText.TruncateForReason(trialDaysLeft > 0
                        ? $"Suscripción {plan.Name} - {tenant.BusinessName} · {trialDaysLeft} días gratis"
                        : $"Suscripción {plan.Name} - {tenant.BusinessName}"),
                    ["auto_recurring"] = autoRecurring,
                    ["external_reference"] = externalReference,
                    ["notification_url"] = notificationUrl,
                    ["status"] = "pending"
                };

                // Llamar a MercadoPago API
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformAccessToken}");

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

                var mpInitPoint = CleanSubscriptionCheckoutUrl(mpResponse.TryGetProperty("init_point", out var ip) ? ip.GetString() : null);
                var mpSandboxInitPoint = mpResponse.TryGetProperty("sandbox_init_point", out var sip) ? sip.GetString() : null;
                // InitPoint es lo que el frontend usa para redirigir al usuario: con token de
                // prueba, tiene que ser el de sandbox (si MP no lo devolvió, no hay URL válida
                // a la que mandarlo, así que preferimos null antes que la de producción rota).
                var effectiveInitPoint = isTestToken ? mpSandboxInitPoint : mpInitPoint;

                // Crear registro en base de datos
                var preapproval = new TenantPreapproval
                {
                    TenantId = tenantId,
                    SubscriptionPlanId = subscriptionPlanId,
                    MercadoPagoPreapprovalId = mpResponse.GetProperty("id").GetString()!,
                    InitPoint = effectiveInitPoint,
                    SandboxInitPoint = mpSandboxInitPoint,
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

        /// <summary>
        /// Días que faltan para que termine la prueba del tenant: 0 si no está en trial o si ya venció.
        /// Es lo que va como free_trial del preapproval (MP no cobra hasta entonces).
        /// </summary>
        private async Task<int> GetTrialDaysLeftAsync(Tenant tenant)
        {
            var subscription = await _context.Subscriptions
                .IgnoreQueryFilters()
                .Where(s => s.TenantId == tenant.Id)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
            var inTrial = string.Equals(tenant.Status, "trial", StringComparison.OrdinalIgnoreCase)
                || (subscription?.IsTrialPeriod ?? false);
            if (!inTrial) return 0;
            var trialEnd = subscription?.TrialEndsAt ?? tenant.TrialEndsAt ?? tenant.DemoExpiresAt;
            if (!trialEnd.HasValue) return 0;
            return Math.Max(0, (int)Math.Ceiling((trialEnd.Value - DateTime.UtcNow).TotalDays));
        }

        /// <summary>
        /// Con free_trial MP devuelve el init_point con "&amp;activation=true" (también con token de
        /// producción), y ese link abre "Esta página no existe" si el negocio no tiene sesión en MP.
        /// Sin el parámetro el mismo checkout llega al formulario de tarjeta (verificado en vivo
        /// 2026-09-16 con el preapproval 3e4373dd…, igual que el fix de GymHero).
        /// </summary>
        internal static string? CleanSubscriptionCheckoutUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return url;
            return System.Text.RegularExpressions.Regex.Replace(url, @"[?&]activation=true(?=&|$)", m => m.Value.StartsWith('?') ? "?" : string.Empty)
                .Replace("?&", "?")
                .TrimEnd('?');
        }

        public async Task<ServiceResult<PreapprovalInfo>> GetPreapprovalAsync(string preapprovalId)
        {
            try
            {
                var platformAccessToken = await GetPlatformAccessTokenAsync();

                if (string.IsNullOrWhiteSpace(platformAccessToken))
                {
                    return ServiceResult<PreapprovalInfo>.Fail("Platform not configured");
                }

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformAccessToken}");

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
                    // MP manda payer_id como número: con GetString() cada GET de preapproval tiraba y ni el
                    // webhook ni la conciliación podían activar al negocio.
                    PayerId = data.TryGetProperty("payer_id", out var pid)
                        ? pid.ValueKind switch
                        {
                            JsonValueKind.Number => pid.GetRawText(),
                            JsonValueKind.String => pid.GetString(),
                            _ => null
                        }
                        : null,
                    ExternalReference = data.TryGetProperty("external_reference", out var er) ? er.GetString() : null,
                    Reason = data.TryGetProperty("reason", out var r) ? r.GetString() : null
                };

                // Parsear fechas
                info.DateCreated = ParseMercadoPagoDate(data, "date_created");
                info.LastModified = ParseMercadoPagoDate(data, "last_modified");
                info.NextPaymentDate = ParseMercadoPagoDate(data, "next_payment_date");

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

        /// <summary>
        /// Fecha de una respuesta de MP en UTC. MP las manda con offset ("...-04:00") y DateTime.TryParse las
        /// deja en Kind=Local, que Npgsql no acepta en timestamptz: guardar el next_payment_date así hacía
        /// fallar el SaveChanges del "authorized" (mismo arreglo que GymHero).
        /// </summary>
        private static DateTime? ParseMercadoPagoDate(JsonElement data, string property)
        {
            return data.TryGetProperty(property, out var value)
                && value.ValueKind == JsonValueKind.String
                && DateTime.TryParse(value.GetString(), out var parsed)
                ? parsed.ToUniversalTime()
                : null;
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
                var platformAccessToken = await GetPlatformAccessTokenAsync();

                if (string.IsNullOrWhiteSpace(platformAccessToken))
                {
                    return ServiceResult<bool>.Fail("Platform not configured");
                }

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformAccessToken}");

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
                var resolveDuplicates = false;

                switch (info.Status.ToLower())
                {
                    case "authorized":
                        preapproval.AuthorizedAt = DateTime.UtcNow;
                        preapproval.PayerId = info.PayerId;
                        preapproval.NextPaymentDate = info.NextPaymentDate ?? DateTime.UtcNow.AddMonths(1);

                        // Con otra authorized del mismo negocio MP debita las dos: después de guardar,
                        // ResolveDuplicateAuthorizedAsync deja activa la más nueva y cancela las demás. Esta se activa
                        // ya salvo que haya una authorized más nueva (no se pisa el plan/fecha de la que queda).
                        var otherAuthorizedCreatedAt = await _context.TenantPreapprovals
                            .IgnoreQueryFilters()
                            .Where(p => p.TenantId == preapproval.TenantId && p.Id != preapproval.Id && p.Status == "authorized")
                            .Select(p => p.CreatedAt)
                            .ToListAsync();
                        resolveDuplicates = otherAuthorizedCreatedAt.Count > 0;

                        if (!otherAuthorizedCreatedAt.Any(createdAt => createdAt > preapproval.CreatedAt))
                        {
                            // ACTIVAR SUSCRIPCIÓN DEL TENANT
                            await ActivateTenantSubscriptionAsync(preapproval);
                            _logger.LogInformation("Tenant {TenantId} subscription activated via preapproval {Id}",
                                preapproval.TenantId, preapprovalId);
                        }
                        break;

                    // Pausada o cancelada no toca al tenant ni a su Subscription: ni suspended/cancelled ni "sin
                    // tarjeta". Lo que deja entrar es tener OTRA authorized (el gate de la tarjeta la busca por
                    // estado) o el período ya pagado; así la vieja de una duplicada que se cancela no degrada a nadie.
                    case "paused":
                        preapproval.PausedAt = DateTime.UtcNow;
                        _logger.LogInformation("Preapproval {Id} paused", preapprovalId);
                        break;

                    case "cancelled":
                        // ??= : la cancelación de una duplicada la marca al cancelarla y el webhook de MP llega después.
                        preapproval.CancelledAt ??= DateTime.UtcNow;
                        // No desactivar inmediatamente - dejar que termine el período pagado
                        _logger.LogInformation("Preapproval {Id} cancelled", preapprovalId);
                        break;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Preapproval {Id} status changed: {OldStatus} -> {NewStatus}",
                    preapprovalId, previousStatus, info.Status);

                if (resolveDuplicates)
                {
                    // Nunca tira: si falla algo loguea y el sync (PreapprovalSyncBackgroundService) lo reintenta.
                    await ResolveDuplicateAuthorizedAsync(preapproval.TenantId, confirmedAuthorized: preapproval, source: action);
                }

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing preapproval webhook for {Id}", preapprovalId);
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Consulta a MP las pending de las últimas 48 h del tenant (las más nuevas primero, hasta 5) y
        /// aplica su estado real. Es lo que evita depender del webhook: se llama al consultar el estado
        /// (la vuelta del checkout hace polling ahí), cuando el gate de la tarjeta va a bloquear y antes
        /// de crear otra preapproval.
        /// </summary>
        public async Task<bool> ReconcileTenantPendingPreapprovalsAsync(Guid tenantId)
        {
            var since = DateTime.UtcNow.AddHours(-48);
            var pendingIds = await _context.TenantPreapprovals
                .Where(p => p.TenantId == tenantId && p.Status == "pending" && p.CreatedAt >= since)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => p.MercadoPagoPreapprovalId)
                .Take(5)
                .ToListAsync();

            foreach (var id in pendingIds)
            {
                // ProcessPreapprovalWebhookAsync ya loguea y no tira: si MP falla con una, sigue con las demás.
                await ProcessPreapprovalWebhookAsync(id, "reconcile");
            }

            return await _context.TenantPreapprovals
                .AnyAsync(p => p.TenantId == tenantId && p.Status == "authorized");
        }

        /// <summary>
        /// Cancela en MP las demás checkouts pending del tenant (todas menos <paramref name="exceptId"/>, la que se
        /// devuelve): con varias vivas el negocio puede autorizar dos y MP cobraría las dos. Antes se pregunta a
        /// MP por cada una: si sigue pending se cancela; si ya está authorized se aplica (activa al negocio) y no
        /// se cancela; si MP ya no la cobra se guarda ese estado. Los errores de MP se loguean y se sigue: nunca
        /// rompe el alta. Devuelve si alguna resultó authorized.
        /// </summary>
        private async Task<bool> CancelOtherPendingPreapprovalsAsync(Guid tenantId, Guid? exceptId)
        {
            List<TenantPreapproval> others;
            try
            {
                others = await _context.TenantPreapprovals
                    .IgnoreQueryFilters()
                    .Where(p => p.TenantId == tenantId
                        && p.Status == "pending"
                        && (exceptId == null || p.Id != exceptId.Value))
                    .OrderBy(p => p.CreatedAt)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not list old pending preapprovals of tenant {TenantId} before a new checkout", tenantId);
                return false;
            }

            var foundAuthorized = false;
            foreach (var old in others)
            {
                var mpId = old.MercadoPagoPreapprovalId;
                try
                {
                    var info = await GetPreapprovalAsync(mpId);
                    if (!info.Success || info.Data == null)
                    {
                        _logger.LogWarning("Could not check old pending preapproval {PreapprovalId} of tenant {TenantId} with MercadoPago; left as is: {Error}",
                            mpId, tenantId, info.Message);
                        continue;
                    }

                    var mpStatus = info.Data.Status;
                    if (IsAuthorized(mpStatus))
                    {
                        // Autorizó ese checkout y el webhook no llegó: se aplica como el webhook, no se cancela.
                        var applied = await ProcessPreapprovalWebhookAsync(mpId, "checkout");
                        if (applied.Success)
                            foundAuthorized = true;
                        else
                            _logger.LogWarning("Old preapproval {PreapprovalId} of tenant {TenantId} is authorized in MercadoPago but could not be applied: {Error}",
                                mpId, tenantId, applied.Message);
                    }
                    else if (string.Equals(mpStatus, "pending", StringComparison.OrdinalIgnoreCase))
                    {
                        var cancel = await CancelPreapprovalAsync(mpId);
                        if (cancel.Success)
                            _logger.LogInformation("Cancelled old pending preapproval {PreapprovalId} of tenant {TenantId} (new checkout {KeptId})",
                                mpId, tenantId, exceptId?.ToString() ?? "new");
                        else
                            _logger.LogWarning("Could not cancel old pending preapproval {PreapprovalId} of tenant {TenantId}: {Error}",
                                mpId, tenantId, cancel.Message);
                    }
                    else
                    {
                        await ApplyNotChargingStatusAsync(old, mpStatus);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error handling old pending preapproval {PreapprovalId} of tenant {TenantId} before a new checkout",
                        mpId, tenantId);
                }
            }

            return foundAuthorized;
        }

        public Task<int> ResolveDuplicateAuthorizedPreapprovalsAsync(Guid tenantId)
            => ResolveDuplicateAuthorizedAsync(tenantId, confirmedAuthorized: null, source: "sync");

        /// <summary>
        /// Una sola preapproval authorized por negocio: con dos, MP debita las dos. Se queda la más nueva (CreatedAt)
        /// que MP confirma autorizada (caso legítimo: dejó otra tarjeta). Primero queda activa en el tenant
        /// (ActivateTenantSubscriptionAsync), así el negocio nunca se queda sin la suya aunque falle lo que sigue;
        /// después cada vieja se consulta a MP: si sigue authorized se cancela allá y la fila pasa a cancelled, si
        /// MP ya no la cobra se guarda su estado real. Si MP no contesta por una candidata más nueva no se cancela
        /// nada (no se sabe cuál está viva) y el sync reintenta. Nunca tira. Devuelve cuántas canceló.
        /// </summary>
        /// <param name="confirmedAuthorized">Fila que MP acaba de confirmar authorized en este request (no se re-consulta).</param>
        private async Task<int> ResolveDuplicateAuthorizedAsync(Guid tenantId, TenantPreapproval? confirmedAuthorized, string source)
        {
            var cancelled = 0;
            try
            {
                var authorized = (await _context.TenantPreapprovals
                        .IgnoreQueryFilters()
                        .Where(p => p.TenantId == tenantId && p.Status == "authorized")
                        .ToListAsync())
                    .OrderByDescending(p => p.CreatedAt)
                    .ToList();
                if (authorized.Count < 2) return 0;

                // 1. La que queda: la más nueva que MP confirma authorized. Las más nuevas que MP ya no cobra
                //    quedan con su estado real.
                TenantPreapproval? keep = null;
                var olderOnes = new List<TenantPreapproval>();
                foreach (var candidate in authorized)
                {
                    if (keep != null)
                    {
                        olderOnes.Add(candidate);
                        continue;
                    }
                    if (confirmedAuthorized != null && candidate.Id == confirmedAuthorized.Id)
                    {
                        keep = candidate;
                        continue;
                    }

                    var info = await GetPreapprovalAsync(candidate.MercadoPagoPreapprovalId);
                    if (!info.Success || info.Data == null)
                    {
                        _logger.LogWarning(
                            "Duplicate authorized preapprovals for tenant {TenantId}: could not check {PreapprovalId} with MercadoPago, nothing cancelled this time",
                            tenantId, candidate.MercadoPagoPreapprovalId);
                        return 0;
                    }
                    if (IsAuthorized(info.Data.Status))
                        keep = candidate;
                    else
                        await ApplyNotChargingStatusAsync(candidate, info.Data.Status);
                }

                if (keep == null) return 0;

                // 2. Activa y apuntada a la que queda antes de cancelar nada.
                await ActivateTenantSubscriptionAsync(keep);
                await _context.SaveChangesAsync();

                // 3. Las viejas: se cancelan en MP solo si MP las sigue viendo authorized.
                foreach (var old in olderOnes)
                {
                    try
                    {
                        string mpStatus;
                        if (confirmedAuthorized != null && old.Id == confirmedAuthorized.Id)
                        {
                            mpStatus = "authorized";
                        }
                        else
                        {
                            var info = await GetPreapprovalAsync(old.MercadoPagoPreapprovalId);
                            if (!info.Success || info.Data == null)
                            {
                                _logger.LogWarning(
                                    "Duplicate authorized preapproval {PreapprovalId} of tenant {TenantId} could not be checked with MercadoPago; retried on the next sync",
                                    old.MercadoPagoPreapprovalId, tenantId);
                                continue;
                            }
                            mpStatus = info.Data.Status;
                        }

                        if (!IsAuthorized(mpStatus))
                        {
                            await ApplyNotChargingStatusAsync(old, mpStatus);
                            continue;
                        }

                        var cancel = await CancelPreapprovalAsync(old.MercadoPagoPreapprovalId);
                        if (!cancel.Success)
                        {
                            _logger.LogError(
                                "SUSCRIPCION DUPLICADA: tenant {TenantId}, no se pudo cancelar la vieja {OldPreapprovalId} (queda {KeptPreapprovalId}), MP puede cobrar las dos: {Error}",
                                tenantId, old.MercadoPagoPreapprovalId, keep.MercadoPagoPreapprovalId, cancel.Message);
                            continue;
                        }

                        cancelled++;
                        _logger.LogError(
                            "SUSCRIPCION DUPLICADA: tenant {TenantId}, se canceló la vieja {OldPreapprovalId}, queda {KeptPreapprovalId} (origen: {Source})",
                            tenantId, old.MercadoPagoPreapprovalId, keep.MercadoPagoPreapprovalId, source);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error cancelling duplicate authorized preapproval {PreapprovalId} of tenant {TenantId}",
                            old.MercadoPagoPreapprovalId, tenantId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving duplicate authorized preapprovals for tenant {TenantId}", tenantId);
            }

            return cancelled;
        }

        /// <summary>
        /// MP ya no cobra esta preapproval (cancelled, paused): se guarda ese estado en la fila sin tocar al tenant.
        /// </summary>
        private async Task ApplyNotChargingStatusAsync(TenantPreapproval preapproval, string mpStatus)
        {
            var now = DateTime.UtcNow;
            var previousStatus = preapproval.Status;
            preapproval.Status = mpStatus;
            preapproval.UpdatedAt = now;
            if (string.Equals(mpStatus, "cancelled", StringComparison.OrdinalIgnoreCase))
                preapproval.CancelledAt ??= now;
            else if (string.Equals(mpStatus, "paused", StringComparison.OrdinalIgnoreCase))
                preapproval.PausedAt ??= now;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Preapproval {Id} of tenant {TenantId} status changed: {OldStatus} -> {NewStatus} (MercadoPago no longer charges it)",
                preapproval.MercadoPagoPreapprovalId, preapproval.TenantId, previousStatus, mpStatus);
        }

        private static bool IsAuthorized(string? mpStatus)
            => string.Equals(mpStatus, "authorized", StringComparison.OrdinalIgnoreCase);

        public async Task<ServiceResult<bool>> ProcessAuthorizedPaymentWebhookAsync(string authorizedPaymentId)
        {
            try
            {
                _logger.LogInformation("Processing authorized payment webhook: {Id}", authorizedPaymentId);

                // Obtener info del pago desde MercadoPago
                var platformAccessToken = await GetPlatformAccessTokenAsync();

                if (string.IsNullOrWhiteSpace(platformAccessToken))
                {
                    return ServiceResult<bool>.Fail("Platform not configured");
                }

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformAccessToken}");

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

                // Llega un cobro de una preapproval que acá sigue pending (o que el sync dio por abandonada):
                // el webhook de la autorización no llegó. Se consulta MP primero para que quede authorized y
                // el negocio activo; si eso falla se corta antes de registrar el pago, así MP reintenta y no
                // queda el pago guardado con la preapproval todavía pending.
                if (preapproval.Status == "pending" || preapproval.Status == "expired")
                {
                    var synced = await ProcessPreapprovalWebhookAsync(preapprovalId, "payment");
                    if (!synced.Success)
                    {
                        _logger.LogWarning("Could not sync preapproval {PreapprovalId} before payment {PaymentId}: {Error}",
                            preapprovalId, authorizedPaymentId, synced.Message);
                        return ServiceResult<bool>.Fail($"Could not sync preapproval: {synced.Message}");
                    }
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
            tenant.SubscriptionPlanId = preapproval.SubscriptionPlanId;
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

        public async Task<ServiceResult<PreapprovalPlanChange>> ChangePlanAsync(Guid tenantId, Guid subscriptionPlanId)
        {
            static ServiceResult<PreapprovalPlanChange> Fail(string message) => ServiceResult<PreapprovalPlanChange>.Fail(message);

            var preapproval = await _context.TenantPreapprovals
                .Where(p => p.TenantId == tenantId && p.Status == "authorized")
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();
            if (preapproval == null)
                return Fail("No tenés el débito automático activo, así que no hay plan para cambiar.");

            var plan = await _context.SubscriptionPlans.FindAsync(subscriptionPlanId);
            if (plan == null || !plan.IsActive)
                return Fail("El plan elegido no está disponible.");

            if (preapproval.SubscriptionPlanId == plan.Id)
                return Fail("Ya tenés ese plan");

            if (plan.Price <= 0)
                return Fail("Ese plan no se cobra con débito automático. Elegí un plan pago.");

            // MP no convierte moneda ni frecuencia de una preapproval existente: esos casos no se tocan.
            var planCurrency = string.IsNullOrWhiteSpace(plan.Currency) ? "ARS" : plan.Currency;
            if (!string.Equals(planCurrency, preapproval.CurrencyId, StringComparison.OrdinalIgnoreCase))
                return Fail($"No se puede cambiar a {plan.Name}: se cobra en {planCurrency} y tu débito automático es en {preapproval.CurrencyId}. Escribinos y lo resolvemos.");

            if (preapproval.FrequencyValue != 1 || !string.Equals(preapproval.FrequencyType, "months", StringComparison.OrdinalIgnoreCase))
                return Fail("Tu débito automático no es mensual y los planes sí, así que el cambio no se puede hacer desde acá. Escribinos y lo resolvemos.");

            var platformAccessToken = await GetPlatformAccessTokenAsync();
            if (string.IsNullOrWhiteSpace(platformAccessToken))
                return Fail("No pudimos conectar con Mercado Pago para cambiar el plan. Tu plan sigue igual; probá de nuevo en unos minutos.");

            var requestBody = new Dictionary<string, object?>
            {
                ["reason"] = MercadoPagoText.TruncateForReason($"Suscripción {plan.Name}"),
                ["auto_recurring"] = new Dictionary<string, object?>
                {
                    ["transaction_amount"] = plan.Price,
                    ["currency_id"] = preapproval.CurrencyId
                }
            };
            var jsonContent = JsonSerializer.Serialize(requestBody);

            string responseBody;
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {platformAccessToken}");

                _logger.LogInformation("Changing plan of preapproval {PreapprovalId} (tenant {TenantId}) to {PlanCode}: {Request}",
                    preapproval.MercadoPagoPreapprovalId, tenantId, plan.Code, jsonContent);

                var response = await client.PutAsync(
                    $"{MP_API_BASE}/preapproval/{preapproval.MercadoPagoPreapprovalId}",
                    new StringContent(jsonContent, Encoding.UTF8, "application/json"));
                responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("MercadoPago rejected plan change of preapproval {PreapprovalId} to {PlanCode}: {StatusCode} - {Response}",
                        preapproval.MercadoPagoPreapprovalId, plan.Code, response.StatusCode, responseBody);
                    return Fail("Mercado Pago no aceptó el cambio de plan. Tu plan y tu débito siguen como estaban; probá de nuevo en unos minutos.");
                }
            }
            catch (Exception ex)
            {
                // Sin respuesta no se sabe si MP lo aplicó: no se toca nada local. Reintentar es seguro
                // (el PUT manda el mismo monto).
                _logger.LogError(ex, "Error calling MercadoPago to change plan of preapproval {PreapprovalId} to {PlanCode}",
                    preapproval.MercadoPagoPreapprovalId, plan.Code);
                return Fail("No pudimos confirmar el cambio con Mercado Pago. Tu plan sigue igual; probá de nuevo en unos minutos.");
            }

            DateTime? nextPaymentDate = null;
            try
            {
                nextPaymentDate = ParseMercadoPagoDate(JsonSerializer.Deserialize<JsonElement>(responseBody), "next_payment_date");
            }
            catch (JsonException)
            {
                // La fecha es solo para el mensaje: si la respuesta no se puede leer, va la guardada.
            }

            try
            {
                var now = DateTime.UtcNow;
                preapproval.SubscriptionPlanId = plan.Id;
                preapproval.TransactionAmount = plan.Price;
                preapproval.Reason = $"Suscripción {plan.Name}";
                preapproval.UpdatedAt = now;

                // Lo que el panel muestra como plan actual: /api/subscription/status sale de Subscription.PlanType
                // (y cae a Tenant.SubscriptionPlanId), /api/preapproval/status de la preapproval, y el super
                // admin de Tenant.SubscriptionPlanId. Mismo criterio que ActivateTenantSubscriptionAsync.
                var tenant = await _context.Tenants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant != null)
                {
                    tenant.SubscriptionPlanId = plan.Id;
                    tenant.UpdatedAt = now;
                }

                var subscription = await _context.Subscriptions
                    .IgnoreQueryFilters()
                    .Where(s => s.TenantId == tenantId)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();
                if (subscription != null)
                {
                    subscription.PlanType = plan.Code;
                    subscription.MonthlyAmount = plan.Price;
                    subscription.UpdatedAt = now;
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "MercadoPago already charges plan {PlanCode} ({Amount}) on preapproval {PreapprovalId} but saving the plan change for tenant {TenantId} failed: fix it by hand",
                    plan.Code, plan.Price, preapproval.MercadoPagoPreapprovalId, tenantId);
                return Fail("Mercado Pago tomó el cambio de plan pero no lo pudimos guardar. Escribinos para que lo corrijamos.");
            }

            _logger.LogInformation("Preapproval {PreapprovalId} of tenant {TenantId} changed to plan {PlanCode} ({Amount} {Currency})",
                preapproval.MercadoPagoPreapprovalId, tenantId, plan.Code, plan.Price, preapproval.CurrencyId);

            return ServiceResult<PreapprovalPlanChange>.Ok(new PreapprovalPlanChange
            {
                PreapprovalId = preapproval.Id,
                MercadoPagoPreapprovalId = preapproval.MercadoPagoPreapprovalId,
                PlanId = plan.Id,
                PlanCode = plan.Code,
                PlanName = plan.Name,
                Amount = plan.Price,
                CurrencyId = preapproval.CurrencyId,
                NextPaymentDate = nextPaymentDate ?? preapproval.NextPaymentDate
            });
        }
    }
}
