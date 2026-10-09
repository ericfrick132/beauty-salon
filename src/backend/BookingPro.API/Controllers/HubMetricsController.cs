using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;

namespace BookingPro.API.Controllers;

/// <summary>
/// Métricas de negocio por tenant para el dashboard de sales-hub (lo consulta cada 3 h).
/// Solo lectura, cruza TODOS los tenants (IgnoreQueryFilters) y se autentica por API key:
/// header X-Api-Key contra SalesHub:HubApiKey (la misma key que usa SalesHubHubClient para
/// pushear al hub). Sin key configurada → 401.
/// </summary>
[ApiController]
[Route("api/hub")]
[AllowAnonymous]
public class HubMetricsController : ControllerBase
{
    // Días de gracia después del fin del período pago antes de darlo por cancelado.
    private const int PastDueGraceDays = 15;

    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public HubMetricsController(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private bool ApiKeyOk()
    {
        var expected = _config["SalesHub:HubApiKey"];
        var given = Request.Headers["X-Api-Key"].FirstOrDefault();
        return !string.IsNullOrEmpty(expected) && !string.IsNullOrEmpty(given)
            && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(expected));
    }

    private static int PeriodMonths(string? period) => (period ?? "").ToLowerInvariant() switch
    {
        "quarterly" => 3,
        "annual" or "yearly" => 12,
        _ => 1
    };

    private static DateTimeOffset? Iso(DateTime? d) =>
        d.HasValue ? new DateTimeOffset(DateTime.SpecifyKind(d.Value, DateTimeKind.Utc)) : null;

    private static DateTime? Max(DateTime? a, DateTime? b) =>
        !a.HasValue ? b : !b.HasValue ? a : (a > b ? a : b);

    private static DateTime? Min(DateTime? a, DateTime? b) =>
        !a.HasValue ? b : !b.HasValue ? a : (a < b ? a : b);

    [HttpGet("tenant-metrics")]
    public async Task<IActionResult> TenantMetrics()
    {
        if (!ApiKeyOk()) return Unauthorized();

        var now = DateTime.UtcNow;

        var tenants = await _db.Tenants.IgnoreQueryFilters().AsNoTracking()
            .Select(t => new
            {
                t.Id, t.BusinessName, t.Status, t.IsDemo, t.DemoExpiresAt, t.TrialEndsAt,
                t.SuspendedAt, t.CreatedAt, t.SubscriptionPlanId
            })
            .ToListAsync();

        var plans = await _db.SubscriptionPlans.IgnoreQueryFilters().AsNoTracking()
            .Select(p => new { p.Id, p.Name, p.Price, p.Currency })
            .ToDictionaryAsync(p => p.Id);

        // Pagos B2B de la plataforma (manuales / preferencia MP) — mismo origen que el
        // subscriptionStatus ACTIVE/EXPIRED del listado de super-admin.
        var platformPayments = (await _db.TenantSubscriptionPayments.IgnoreQueryFilters().AsNoTracking()
                .Where(p => p.Status == "approved")
                .Select(p => new { p.TenantId, p.Amount, p.Period, p.PeriodStart, p.PeriodEnd, p.PaidAt, p.CreatedAt })
                .ToListAsync())
            .ToLookup(p => p.TenantId);

        // Cobros de la suscripción recurrente (preapproval de MP y Apple), siempre mensuales.
        var subPayments = (await _db.SubscriptionPayments.IgnoreQueryFilters().AsNoTracking()
                .Where(p => p.Status == "approved")
                .Select(p => new { p.TenantId, p.Amount, p.PaymentDate })
                .ToListAsync())
            .ToLookup(p => p.TenantId);

        var subscriptions = (await _db.Subscriptions.IgnoreQueryFilters().AsNoTracking()
                .Select(s => new
                {
                    s.TenantId, s.Status, s.PlanType, s.MonthlyAmount, s.IsTrialPeriod, s.ActivatedAt,
                    s.CancelledAt, s.NextPaymentDate, s.PaidViaApple, s.AppleExpiresAt, s.UpdatedAt
                })
                .ToListAsync())
            .GroupBy(s => s.TenantId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.UpdatedAt).First());

        var result = new List<object>(tenants.Count);

        foreach (var t in tenants)
        {
            var tsp = platformPayments[t.Id].ToList();
            var sp = subPayments[t.Id].ToList();
            subscriptions.TryGetValue(t.Id, out var sub);
            var plan = t.SubscriptionPlanId.HasValue && plans.TryGetValue(t.SubscriptionPlanId.Value, out var pl) ? pl : null;

            var subStatus = (sub?.Status ?? "").ToLowerInvariant();
            var tenantStatus = (t.Status ?? "").ToLowerInvariant();

            // ¿Pagó alguna vez? Pago aprobado en cualquiera de las dos tablas, o suscripción
            // activada fuera de prueba (MP preapproval / Apple).
            var subPaid = sub != null && sub.ActivatedAt.HasValue && (!sub.IsTrialPeriod || sub.PaidViaApple);
            var hasPaid = tsp.Count > 0 || sp.Count > 0 || subPaid;

            // Primer cobro.
            DateTime? firstPaidAt = null;
            foreach (var p in tsp) firstPaidAt = Min(firstPaidAt, p.PaidAt ?? p.PeriodStart);
            foreach (var p in sp) firstPaidAt = Min(firstPaidAt, p.PaymentDate);
            if (subPaid) firstPaidAt = Min(firstPaidAt, sub!.ActivatedAt);

            // Hasta cuándo está cubierto por lo que pagó.
            DateTime? paidUntil = null;
            foreach (var p in tsp) paidUntil = Max(paidUntil, p.PeriodEnd);
            foreach (var p in sp) paidUntil = Max(paidUntil, p.PaymentDate.AddMonths(1));
            if (sub != null && sub.PaidViaApple) paidUntil = Max(paidUntil, sub.AppleExpiresAt);

            // Débito automático de MP vigente: la suscripción sigue "active" fuera de prueba.
            var recurringActive = sub != null && subStatus == "active" && !sub.IsTrialPeriod && !sub.PaidViaApple
                && (!sub.NextPaymentDate.HasValue || sub.NextPaymentDate.Value > now.AddDays(-PastDueGraceDays));

            string status;
            DateTime? cancelledAt = null;

            if (hasPaid)
            {
                var paidNow = (paidUntil.HasValue && paidUntil.Value > now) || recurringActive;
                var stoppedExplicitly = tenantStatus is "cancelled" or "suspended"
                    || subStatus is "cancelled" or "expired";

                if (paidNow)
                    status = "active";
                else if (!stoppedExplicitly && paidUntil.HasValue && paidUntil.Value > now.AddDays(-PastDueGraceDays))
                    status = "past_due";
                else
                {
                    status = "cancelled";
                    cancelledAt = sub?.CancelledAt ?? t.SuspendedAt ?? paidUntil ?? sub?.NextPaymentDate;
                }
            }
            else
            {
                // Nunca pagó: prueba / demo vigente o vencida.
                var trialEnd = t.IsDemo ? (t.DemoExpiresAt ?? t.TrialEndsAt) : t.TrialEndsAt;
                var running = (tenantStatus is "trial" or "active") && trialEnd.HasValue && trialEnd.Value > now;
                status = running ? "trial" : "trial_expired";
            }

            // MRR del tenant: último pago aprobado normalizado a mes; si no, monto de la
            // suscripción; si no, precio del plan.
            decimal monthlyAmount = 0;
            if (status is "active" or "past_due")
            {
                var lastTsp = tsp.OrderByDescending(p => p.PaidAt ?? p.PeriodStart).FirstOrDefault();
                var lastSp = sp.OrderByDescending(p => p.PaymentDate).FirstOrDefault();
                var lastTspAt = lastTsp != null ? (lastTsp.PaidAt ?? lastTsp.PeriodStart) : (DateTime?)null;

                if (lastTsp != null && (lastSp == null || lastTspAt >= lastSp.PaymentDate))
                    monthlyAmount = lastTsp.Amount / PeriodMonths(lastTsp.Period);
                else if (lastSp != null)
                    monthlyAmount = lastSp.Amount;

                if (monthlyAmount <= 0 && sub != null && sub.MonthlyAmount > 0)
                    monthlyAmount = sub.MonthlyAmount;
                if (monthlyAmount <= 0 && plan != null)
                    monthlyAmount = plan.Price;

                monthlyAmount = Math.Round(monthlyAmount, 2);
            }

            // Lo que cobramos nosotros: moneda del plan de plataforma (ARS por defecto).
            var currency = (plan?.Currency ?? "ARS").ToUpperInvariant() == "USD" ? "USD" : "ARS";

            result.Add(new
            {
                id = t.Id.ToString(),
                name = string.IsNullOrWhiteSpace(t.BusinessName) ? null : t.BusinessName,
                status,
                plan = plan?.Name ?? sub?.PlanType,
                monthlyAmount,
                currency,
                createdAt = Iso(t.CreatedAt),
                firstPaidAt = Iso(firstPaidAt),
                cancelledAt = Iso(cancelledAt)
            });
        }

        return Ok(new { tenants = result });
    }
}
