using System;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Services
{
    /// <summary>Resultado del verify de Google Play. <see cref="Code"/> es estable para la app.</summary>
    public record GooglePlayActivationResult(bool Success, string? Error = null, string? Code = null, SubscriptionStatusDto? Status = null);

    public interface IGooglePlayBillingService
    {
        /// <summary>
        /// Verifica una compra de Google Play Billing con la Developer API y, si es la suscripción de
        /// TurnosPro vigente, activa el negocio y reconoce (acknowledge) la compra. Idempotente por
        /// purchaseToken / orderId: la app la reenvía al volver y en "Restaurar compras".
        /// </summary>
        Task<GooglePlayActivationResult> ActivateAsync(Guid tenantId, string purchaseToken, string? productId);

        /// <summary>Real-time developer notification (Pub/Sub push). Siempre best-effort.</summary>
        Task ProcessNotificationAsync(string base64Data);
    }

    /// <summary>
    /// Espejo de la compra de Apple (<see cref="SubscriptionService.ActivateAppleSubscriptionAsync"/>)
    /// para Android, con el estado de Google en <see cref="TenantGooglePlaySubscription"/>:
    ///  - El plan base comprado decide el plan (mensual → pro, trimestral → promo, semestral → 6meses,
    ///    anual → 12meses) y Google decide hasta cuándo (expiryTime).
    ///  - Las fechas nunca retroceden (Subscription.NextPaymentDate, Tenant.TrialEndsAt).
    ///  - Las compras de prueba (licencias de testing) solo extienden el acceso hasta su vencimiento:
    ///    nunca dejan la suscripción en "active", que el SubscriptionMiddleware respeta sin fecha.
    ///  - Una suscripción de Google paga un solo negocio y cada cobro (orderId) se registra una vez en
    ///    SubscriptionPayments (PaymentMethod google_play_iap; MercadoPagoPaymentId = orderId).
    ///  - Vencimiento, retención (on hold), pausa o reembolso no cortan el acceso si el negocio lo tiene
    ///    pago por otro lado (web, débito de Mercado Pago, Apple).
    /// </summary>
    public class GooglePlayBillingService : IGooglePlayBillingService
    {
        public const string PaymentMethod = "google_play_iap";
        public const string NotConfiguredCode = "GOOGLE_PLAY_NOT_CONFIGURED";

        private readonly ApplicationDbContext _context;
        private readonly IGooglePlayDeveloperService _google;
        private readonly ISubscriptionService _subscriptions;
        private readonly ILogger<GooglePlayBillingService> _logger;

        public GooglePlayBillingService(ApplicationDbContext context, IGooglePlayDeveloperService google,
            ISubscriptionService subscriptions, ILogger<GooglePlayBillingService> logger)
        {
            _context = context;
            _google = google;
            _subscriptions = subscriptions;
            _logger = logger;
        }

        public async Task<GooglePlayActivationResult> ActivateAsync(Guid tenantId, string purchaseToken, string? productId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(purchaseToken))
                    return new(false, "purchaseToken requerido", "INVALID_REQUEST");
                if (!_google.IsConfigured)
                {
                    _logger.LogError(
                        "Google Play verify for tenant {TenantId} rejected: GooglePlay:ServiceAccountJson is not configured (package {Package})",
                        tenantId, _google.PackageName);
                    return new(false, "Las compras de Google Play todavía no están habilitadas en el servidor. Tu compra quedó registrada en Google y la activamos apenas estén.", NotConfiguredCode);
                }

                purchaseToken = purchaseToken.Trim();
                var info = await _google.GetSubscriptionAsync(purchaseToken);
                if (info == null)
                    return new(false, "No pudimos verificar la compra con Google Play.", "NOT_VERIFIABLE");

                if (!GooglePlayCatalog.IsKnownProduct(info.ProductId ?? productId))
                {
                    _logger.LogWarning("Google Play purchase for tenant {TenantId} is product {Product}, not a TurnosPro plan", tenantId, info.ProductId);
                    return new(false, "La compra no corresponde a un plan de TurnosPro.", "UNKNOWN_PRODUCT");
                }

                // La app manda obfuscatedAccountId = tenantId (como el appAccountToken de Apple).
                if (Guid.TryParse(info.ObfuscatedAccountId, out var purchasedFor) && purchasedFor != tenantId)
                {
                    _logger.LogWarning("Google Play purchase was made for tenant {Other}, verify from {TenantId}", purchasedFor, tenantId);
                    return new(false, "Esta suscripción de Google Play ya está asociada a otro negocio.", "OTHER_TENANT");
                }

                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null) return new(false, "Negocio no encontrado.", "TENANT_NOT_FOUND");

                // Una suscripción de Google paga un solo negocio (el token nuevo de un cambio de plan trae el viejo en linked).
                var claimedByOther = await _context.TenantGooglePlaySubscriptions.AnyAsync(s => s.TenantId != tenantId &&
                    (s.PurchaseToken == purchaseToken ||
                     (info.LinkedPurchaseToken != null && s.PurchaseToken == info.LinkedPurchaseToken)));
                if (claimedByOther)
                {
                    _logger.LogWarning("Google Play token already activates another tenant; rejected for {TenantId}", tenantId);
                    return new(false, "Esta suscripción de Google Play ya está asociada a otro negocio.", "OTHER_TENANT");
                }

                var row = await _context.TenantGooglePlaySubscriptions.FirstOrDefaultAsync(s => s.TenantId == tenantId);
                var now = DateTime.UtcNow;

                if (!info.GrantsAccess(now))
                {
                    // Token conocido que ya no da acceso (venció sin que llegara la notificación): se aplica.
                    if (row != null && row.PurchaseToken == purchaseToken && info.IsLapsed(now))
                    {
                        CopyState(row, info);
                        await LapseAsync(row, tenant, now, "Google Play: la suscripción venció");
                        await _context.SaveChangesAsync();
                    }
                    return new(false, info.State == "SUBSCRIPTION_STATE_PENDING"
                        ? "El pago todavía está pendiente en Google Play. Cuando se confirme, el plan se activa solo."
                        : "Esta suscripción de Google Play no está vigente.", info.State == "SUBSCRIPTION_STATE_PENDING" ? "PENDING" : "NOT_ACTIVE");
                }

                if (row == null)
                {
                    row = new TenantGooglePlaySubscription { TenantId = tenantId, CreatedAt = now };
                    _context.TenantGooglePlaySubscriptions.Add(row);
                }
                if (!string.IsNullOrEmpty(row.PurchaseToken) && row.PurchaseToken != purchaseToken)
                    row.LinkedPurchaseToken = info.LinkedPurchaseToken ?? row.PurchaseToken;
                row.PurchaseToken = purchaseToken;

                await GrantAsync(row, tenant, info, now);
                await SaveAsync();

                // Google reembolsa a los 3 días lo que no se reconoce.
                if (!info.Acknowledged)
                {
                    var acked = await _google.AcknowledgeAsync(info.ProductId ?? GooglePlayCatalog.ProductId, purchaseToken);
                    if (!acked) _logger.LogWarning("Google Play purchase for tenant {TenantId} activated but acknowledge failed (the app retries)", tenantId);
                }

                _logger.LogInformation(
                    "Google Play subscription activated for tenant {TenantId}: {Product}/{BasePlan}, order {Order}, expires {Expires:o}{Test}, access until {AccessEnds:o}",
                    tenantId, info.ProductId, info.BasePlanId, info.LatestOrderId, info.ExpiresAt, info.IsTest ? " (test)" : "", tenant.TrialEndsAt);

                var status = await _subscriptions.GetSubscriptionStatusAsync(tenantId, includePaymentLink: false);
                return new(true, Status: status.Data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error activating Google Play subscription for tenant {TenantId}", tenantId);
                return new(false, "Error al activar la suscripción de Google Play.", "ERROR");
            }
        }

        public async Task ProcessNotificationAsync(string base64Data)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(base64Data)) return;
                using var doc = JsonDocument.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(base64Data)));
                var root = doc.RootElement;
                if (root.TryGetProperty("packageName", out var pkg) && pkg.GetString() != _google.PackageName)
                {
                    _logger.LogInformation("Google Play RTDN for another package ({Pkg}) — ignored", pkg.GetString());
                    return;
                }
                if (!root.TryGetProperty("subscriptionNotification", out var sub))
                {
                    if (root.TryGetProperty("testNotification", out _))
                        _logger.LogInformation("Google Play RTDN test notification received");
                    return; // oneTimeProductNotification / voidedPurchaseNotification: nada que hacer acá.
                }

                var purchaseToken = sub.TryGetProperty("purchaseToken", out var t) ? t.GetString() : null;
                var type = sub.TryGetProperty("notificationType", out var nt) && nt.TryGetInt32(out var n) ? n : 0;
                if (string.IsNullOrEmpty(purchaseToken)) return;

                // El webhook es anónimo: el estado se toma de la API de Google, nunca del payload.
                if (!_google.IsConfigured)
                {
                    _logger.LogError("Google Play RTDN {Type} ignored: GooglePlay:ServiceAccountJson is not configured", type);
                    return;
                }
                var info = await _google.GetSubscriptionAsync(purchaseToken);
                if (info == null)
                {
                    _logger.LogWarning("Google Play RTDN {Type}: token not verifiable — ignored", type);
                    return;
                }

                var row = await _context.TenantGooglePlaySubscriptions.FirstOrDefaultAsync(s => s.PurchaseToken == purchaseToken);
                if (row == null && info.LinkedPurchaseToken != null)
                {
                    // Token nuevo de un cambio de plan cuyo verify no llegó: reemplaza al anterior.
                    row = await _context.TenantGooglePlaySubscriptions.FirstOrDefaultAsync(s => s.PurchaseToken == info.LinkedPurchaseToken);
                    if (row != null)
                    {
                        row.LinkedPurchaseToken = row.PurchaseToken;
                        row.PurchaseToken = purchaseToken;
                    }
                }
                if (row == null)
                {
                    var superseded = await _context.TenantGooglePlaySubscriptions.AnyAsync(s => s.LinkedPurchaseToken == purchaseToken);
                    _logger.LogInformation(superseded
                        ? "Google Play RTDN {Type} for a replaced token — ignored"
                        : "Google Play RTDN {Type} for unknown token — ignored (the app verifies first)", type);
                    return;
                }

                var tenant = await _context.Tenants.FindAsync(row.TenantId);
                if (tenant == null) return;
                var now = DateTime.UtcNow;

                if (type == 12) // SUBSCRIPTION_REVOKED: reembolso / revocación
                {
                    await MarkPaymentRefundedAsync(info.LatestOrderId);
                    CopyState(row, info);
                    await RevokeAsync(row, tenant, now);
                }
                else if (info.GrantsAccess(now))
                {
                    await GrantAsync(row, tenant, info, now);
                }
                else if (info.IsLapsed(now))
                {
                    CopyState(row, info);
                    await LapseAsync(row, tenant, now, $"Google Play: {info.State}");
                }
                else
                {
                    CopyState(row, info);
                }

                row.UpdatedAt = now;
                await SaveAsync();
                _logger.LogInformation("Processed Google Play RTDN {Type} for tenant {TenantId} ({State}, expires {Expires:o})",
                    type, row.TenantId, info.State, info.ExpiresAt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Google Play RTDN");
            }
        }

        // --- helpers ------------------------------------------------------

        /// <summary>Compra vigente: plan, fechas (sin retroceder), estado activo y cobro registrado.</summary>
        private async Task GrantAsync(TenantGooglePlaySubscription row, Tenant tenant, GooglePlaySubscriptionInfo info, DateTime now)
        {
            var basePlan = GooglePlayCatalog.Resolve(info.BasePlanId);
            var expires = info.ExpiresAt ?? now.AddMonths(basePlan.Months);
            var isLatest = !row.ExpiresAt.HasValue || expires >= row.ExpiresAt.Value;
            CopyState(row, info);
            if (isLatest)
            {
                row.ProductId = info.ProductId ?? GooglePlayCatalog.ProductId;
                row.BasePlanId = info.BasePlanId ?? basePlan.Id;
                row.LatestOrderId = info.LatestOrderId ?? row.LatestOrderId;
            }

            var plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == basePlan.PlanCode && p.IsActive)
                       ?? await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == "pro" && p.IsActive);
            if (plan == null || plan.Code != basePlan.PlanCode)
                _logger.LogError("Google Play base plan {BasePlan} has no active SubscriptionPlan with code {Code} — using {Fallback}",
                    info.BasePlanId, basePlan.PlanCode, plan?.Code ?? "(none)");

            // La fila que lee el middleware: la última suscripción del negocio.
            var subscription = await _context.Subscriptions
                .Where(s => s.TenantId == tenant.Id)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
            if (subscription == null)
            {
                subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = plan?.Code ?? "pro",
                    MonthlyAmount = plan?.Price ?? 0,
                    PayerEmail = tenant.OwnerEmail,
                    IsTrialPeriod = false,
                    CreatedAt = now
                };
                _context.Subscriptions.Add(subscription);
            }

            subscription.NextPaymentDate = Later(subscription.NextPaymentDate, expires);
            tenant.TrialEndsAt = Later(tenant.TrialEndsAt, expires);

            if (!info.IsTest)
            {
                if (plan != null && isLatest)
                {
                    subscription.PlanType = plan.Code;
                    subscription.MonthlyAmount = plan.Price;
                    tenant.SubscriptionPlanId = plan.Id;
                }
                if (subscription.Status != "active") subscription.ActivatedAt = now;
                subscription.Status = "active";
                subscription.IsTrialPeriod = false;
                subscription.CancelledAt = null;
                subscription.CancellationReason = null;
                tenant.Status = "active";
            }
            subscription.UpdatedAt = now;
            tenant.UpdatedAt = now;
            row.UpdatedAt = now;

            await RecordPaymentOnceAsync(subscription, info, plan, basePlan);
        }

        /// <summary>Vencida / en retención / pausada: corta el acceso salvo que esté pago por otro lado.</summary>
        private async Task LapseAsync(TenantGooglePlaySubscription row, Tenant tenant, DateTime now, string reason)
        {
            if (await AccessOutlivesGoogleAsync(row, tenant, now))
            {
                _logger.LogInformation("Google Play lapse for tenant {TenantId}: access runs further — kept", tenant.Id);
                return;
            }
            var subscription = await LatestSubscriptionAsync(tenant.Id);
            if (subscription == null || (subscription.PaidViaApple && subscription.AppleExpiresAt > now)) return;
            // Solo la suscripción: suspender el tenant lo dejaría sin resolver ("Tenant not found") y el
            // dueño no podría entrar a suscribirse de nuevo (mismo criterio que Apple).
            subscription.Status = "expired";
            subscription.CancellationReason = reason;
            subscription.UpdatedAt = now;
        }

        /// <summary>Reembolso / revocación: el período reembolsado deja de dar acceso.</summary>
        private async Task RevokeAsync(TenantGooglePlaySubscription row, Tenant tenant, DateTime now)
        {
            if (await AccessOutlivesGoogleAsync(row, tenant, now))
            {
                _logger.LogInformation("Google Play revoke for tenant {TenantId}: access runs further — kept", tenant.Id);
                return;
            }
            var subscription = await LatestSubscriptionAsync(tenant.Id);
            if (subscription == null) return;
            subscription.Status = "cancelled";
            subscription.CancelledAt = now;
            subscription.CancellationReason = "Google Play: compra reembolsada o revocada";
            if (subscription.NextPaymentDate > now) subscription.NextPaymentDate = now;
            if (tenant.TrialEndsAt > now) tenant.TrialEndsAt = now;
            subscription.UpdatedAt = now;
            tenant.UpdatedAt = now;
        }

        private Task<Subscription?> LatestSubscriptionAsync(Guid tenantId) =>
            _context.Subscriptions
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

        private static void CopyState(TenantGooglePlaySubscription row, GooglePlaySubscriptionInfo info)
        {
            row.State = info.State;
            row.AutoRenewing = info.AutoRenewing;
            row.IsTest = info.IsTest;
            if (info.LinkedPurchaseToken != null) row.LinkedPurchaseToken = info.LinkedPurchaseToken;
            if (info.ExpiresAt.HasValue) row.ExpiresAt = Later(row.ExpiresAt, info.ExpiresAt.Value);
        }

        /// <summary>
        /// Un cobro por orderId (cada renovación trae otro: GPA.x..0, ..1). La API v2 no informa el monto
        /// cobrado: queda el de lista (precio mensual del plan × meses del plan base), que es el que se
        /// carga en Play Console. Las compras de prueba quedan con estado "sandbox".
        /// </summary>
        private async Task RecordPaymentOnceAsync(Subscription subscription, GooglePlaySubscriptionInfo info,
            SubscriptionPlan? plan, GooglePlayCatalog.BasePlan basePlan)
        {
            if (string.IsNullOrEmpty(info.LatestOrderId)) return;
            var already =
                _context.SubscriptionPayments.Local.Any(p => p.PaymentMethod == PaymentMethod && p.MercadoPagoPaymentId == info.LatestOrderId)
                || await _context.SubscriptionPayments.AnyAsync(p => p.PaymentMethod == PaymentMethod && p.MercadoPagoPaymentId == info.LatestOrderId);
            if (already) return;

            var monthly = plan?.Price ?? subscription.MonthlyAmount;
            _context.SubscriptionPayments.Add(new SubscriptionPayment
            {
                TenantId = subscription.TenantId,
                SubscriptionId = subscription.Id,
                MercadoPagoPaymentId = info.LatestOrderId,
                Amount = monthly * basePlan.Months,
                Status = info.IsTest ? "sandbox" : "approved",
                PaymentDate = DateTime.UtcNow,
                PaymentMethod = PaymentMethod,
                CreatedAt = DateTime.UtcNow
            });
            _logger.LogInformation("Google Play payment recorded for tenant {TenantId}: order {Order}, {BasePlan}, {Amount} ARS (list){Test}",
                subscription.TenantId, info.LatestOrderId, basePlan.Id, monthly * basePlan.Months, info.IsTest ? " (test)" : "");
        }

        private async Task MarkPaymentRefundedAsync(string? orderId)
        {
            if (string.IsNullOrEmpty(orderId)) return;
            var payment = await _context.SubscriptionPayments
                .FirstOrDefaultAsync(p => p.PaymentMethod == PaymentMethod && p.MercadoPagoPaymentId == orderId);
            if (payment != null) payment.Status = "refunded";
        }

        /// <summary>Mismo criterio que Apple: compra de prueba, acceso que va más allá o débito de MP autorizado.</summary>
        private async Task<bool> AccessOutlivesGoogleAsync(TenantGooglePlaySubscription row, Tenant tenant, DateTime now)
        {
            if (row.IsTest) return true;
            var googleEnds = Later(row.ExpiresAt, now);
            if (tenant.TrialEndsAt.HasValue && tenant.TrialEndsAt.Value > googleEnds) return true;
            return await _context.TenantPreapprovals
                .IgnoreQueryFilters()
                .AnyAsync(p => p.TenantId == tenant.Id && p.Status == "authorized");
        }

        private async Task SaveAsync()
        {
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                // Dos verify simultáneos del mismo negocio chocan con la fila única por tenant: el otro
                // ya la guardó; la app reintenta y el segundo intento es idempotente.
                _logger.LogWarning(ex, "Google Play subscription save failed (concurrent verify or schema)");
                throw;
            }
        }

        private static DateTime Later(DateTime? current, DateTime candidate) =>
            current.HasValue && current.Value > candidate ? current.Value : candidate;
    }
}
