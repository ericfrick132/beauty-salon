using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Hace que el cupón de una promo (/promo, creada por sales-hub con POST /api/hub/promos) descuente de
    /// verdad en el débito automático de Mercado Pago, que es como se suscriben los negocios:
    ///
    /// 1. Alta: el negocio que entró por /promo queda con Tenant.UtmCampaign = slug de la promo. Si se
    ///    registró mientras la promo estaba vigente, se le guarda Tenant.PendingCouponCode.
    /// 2. Suscripción: apenas tiene una preapproval pending o authorized, se le baja el monto en MP
    ///    (PUT /preapproval/{id}) al precio con descuento y se registra un <see cref="CouponRedemption"/>.
    ///    Con la prueba gratis nativa de MP el primer débito llega días después, así que el descuento
    ///    cubre desde el primer cobro.
    /// 3. Fin del descuento: después de DurationMonths cobros aprobados con descuento, la preapproval
    ///    vuelve al precio del plan (otro PUT). Si los cobros no se registraran (webhook perdido), a los
    ///    DurationMonths meses + 10 días de autorizada vuelve igual.
    ///
    /// Lo corre PreapprovalSyncBackgroundService en cada tick (15 min). Idempotente: cada paso mira el
    /// estado guardado antes de llamar a MP.
    /// </summary>
    public class PromoCouponService
    {
        private const string MP_API_BASE = "https://api.mercadopago.com";
        private static readonly TimeSpan SignupWindowSlack = TimeSpan.FromDays(1);
        private static readonly TimeSpan PendingLookback = TimeSpan.FromDays(120);

        private readonly ApplicationDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IPlatformPaymentConnectionService _platformConnections;
        private readonly ILogger<PromoCouponService> _logger;

        public PromoCouponService(
            ApplicationDbContext db,
            IHttpClientFactory httpClientFactory,
            IPlatformPaymentConnectionService platformConnections,
            ILogger<PromoCouponService> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _platformConnections = platformConnections;
            _logger = logger;
        }

        /// <summary>Precio con el descuento del cupón (porcentaje o monto fijo), redondeado a 2 decimales.</summary>
        public static decimal DiscountedPrice(decimal price, decimal discountPercent, decimal? discountFixedAmount = null)
        {
            decimal result = discountFixedAmount is > 0
                ? price - discountFixedAmount.Value
                : price * (100m - discountPercent) / 100m;
            return Math.Max(0m, Math.Round(result, 2, MidpointRounding.AwayFromZero));
        }

        public static string NormalizeCode(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();

        public async Task RunAsync(CancellationToken ct)
        {
            await AssignPendingCouponsAsync(ct);
            await ApplyPendingCouponsAsync(ct);
            await FinishDiscountsAsync(ct);
        }

        /// <summary>
        /// Negocios dados de alta desde /promo (utm_campaign = slug) dentro de la vigencia: quedan con el
        /// cupón pendiente. Solo los que no tienen otro pendiente ni un cupón ya aplicado.
        /// </summary>
        private async Task AssignPendingCouponsAsync(CancellationToken ct)
        {
            var since = DateTime.UtcNow - PendingLookback;
            var promos = await _db.Set<Promo>().AsNoTracking()
                .Where(p => p.EndsAt >= since)
                .Select(p => new { p.Slug, p.Code, p.StartsAt, p.EndsAt })
                .ToListAsync(ct);
            if (promos.Count == 0) return;

            var assigned = 0;
            foreach (var promo in promos)
            {
                var from = promo.StartsAt - SignupWindowSlack;
                var to = promo.EndsAt + SignupWindowSlack;
                var slug = promo.Slug.ToLower();
                var tenants = await _db.Tenants.IgnoreQueryFilters()
                    .Where(t => t.PendingCouponCode == null
                        && t.UtmCampaign != null && t.UtmCampaign.ToLower() == slug
                        && t.CreatedAt >= from && t.CreatedAt <= to)
                    .ToListAsync(ct);
                foreach (var tenant in tenants)
                {
                    var alreadyRedeemed = await _db.Set<CouponRedemption>().AnyAsync(r => r.TenantId == tenant.Id, ct);
                    if (alreadyRedeemed) continue;
                    tenant.PendingCouponCode = promo.Code;
                    tenant.UpdatedAt = DateTime.UtcNow;
                    assigned++;
                }
            }

            if (assigned > 0)
            {
                await _db.SaveChangesAsync(ct);
                _logger.LogInformation("PromoCoupon: {Count} negocios quedaron con cupón de promo pendiente", assigned);
            }
        }

        /// <summary>
        /// Negocios con cupón pendiente y una preapproval pending/authorized sin descuento: se le baja el monto
        /// en MP. El cupón deja de estar pendiente cuando la preapproval con descuento queda authorized (si
        /// abandona el checkout y arranca otro, el nuevo también se descuenta).
        /// </summary>
        private async Task ApplyPendingCouponsAsync(CancellationToken ct)
        {
            var tenants = await _db.Tenants.IgnoreQueryFilters()
                .Where(t => t.PendingCouponCode != null)
                .ToListAsync(ct);
            if (tenants.Count == 0) return;

            foreach (var tenant in tenants)
            {
                ct.ThrowIfCancellationRequested();
                try { await ApplyForTenantAsync(tenant, ct); }
                catch (Exception ex) when (!ct.IsCancellationRequested)
                {
                    _logger.LogError(ex, "PromoCoupon: no se pudo aplicar el cupón {Code} al tenant {TenantId}", tenant.PendingCouponCode, tenant.Id);
                }
            }
        }

        private async Task ApplyForTenantAsync(Tenant tenant, CancellationToken ct)
        {
            var code = NormalizeCode(tenant.PendingCouponCode);
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Code.ToUpper() == code, ct);
            if (coupon == null || !coupon.IsActive
                || (coupon.MaxUses.HasValue && coupon.TimesUsed >= coupon.MaxUses.Value)
                // El cupón vale si el negocio se registró antes de que venciera (puede suscribirse después).
                || (coupon.ExpiresAt.HasValue && tenant.CreatedAt > coupon.ExpiresAt.Value + SignupWindowSlack))
            {
                _logger.LogInformation("PromoCoupon: el cupón {Code} del tenant {TenantId} ya no es válido; se descarta", code, tenant.Id);
                tenant.PendingCouponCode = null;
                tenant.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                return;
            }

            var preapproval = await _db.TenantPreapprovals.IgnoreQueryFilters()
                .Where(p => p.TenantId == tenant.Id && (p.Status == "pending" || p.Status == "authorized"))
                .OrderByDescending(p => p.Status == "authorized")
                .ThenByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (preapproval == null) return; // todavía no eligió plan: se espera

            var redemptions = _db.Set<CouponRedemption>();
            var existing = await redemptions.FirstOrDefaultAsync(r => r.TenantPreapprovalId == preapproval.Id, ct);
            if (existing != null)
            {
                if (preapproval.Status == "authorized")
                {
                    // Ya suscripto con el descuento: el cupón cuenta como usado y deja de estar pendiente.
                    coupon.TimesUsed++;
                    coupon.UpdatedAt = DateTime.UtcNow;
                    tenant.PendingCouponCode = null;
                    tenant.UpdatedAt = DateTime.UtcNow;
                    await StampSubscriptionAsync(tenant.Id, existing, ct);
                    await _db.SaveChangesAsync(ct);
                    _logger.LogInformation("PromoCoupon: tenant {TenantId} suscripto con el cupón {Code} ({Amount} {Currency})",
                        tenant.Id, code, existing.DiscountedAmount, existing.CurrencyId);
                }
                return;
            }

            if (coupon.SubscriptionPlanId.HasValue && coupon.SubscriptionPlanId.Value != preapproval.SubscriptionPlanId)
            {
                _logger.LogInformation("PromoCoupon: el cupón {Code} no aplica al plan de la preapproval {PreapprovalId}", code, preapproval.MercadoPagoPreapprovalId);
                return;
            }

            var original = preapproval.TransactionAmount;
            var discounted = DiscountedPrice(original, coupon.DiscountPercent, coupon.DiscountFixedAmount);
            if (original <= 0 || discounted <= 0 || discounted >= original) return;

            var error = await UpdatePreapprovalAmountAsync(preapproval.MercadoPagoPreapprovalId, discounted, preapproval.CurrencyId, ct);
            if (error != null)
            {
                _logger.LogWarning("PromoCoupon: MP no aceptó el descuento del cupón {Code} en {PreapprovalId}: {Error}", code, preapproval.MercadoPagoPreapprovalId, error);
                return; // se reintenta en el próximo tick
            }

            var now = DateTime.UtcNow;
            var redemption = new CouponRedemption
            {
                CouponId = coupon.Id,
                CouponCode = code,
                TenantId = tenant.Id,
                TenantPreapprovalId = preapproval.Id,
                MercadoPagoPreapprovalId = preapproval.MercadoPagoPreapprovalId,
                DiscountPercent = coupon.DiscountPercent,
                DurationMonths = coupon.DurationMonths,
                OriginalAmount = original,
                DiscountedAmount = discounted,
                CurrencyId = preapproval.CurrencyId,
                Status = "active",
                AppliedAt = now,
                CreatedAt = now,
                UpdatedAt = now
            };
            redemptions.Add(redemption);
            preapproval.TransactionAmount = discounted;
            preapproval.UpdatedAt = now;

            if (preapproval.Status == "authorized")
            {
                coupon.TimesUsed++;
                coupon.UpdatedAt = now;
                tenant.PendingCouponCode = null;
                tenant.UpdatedAt = now;
                await StampSubscriptionAsync(tenant.Id, redemption, ct);
            }

            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("PromoCoupon: cupón {Code} aplicado a la preapproval {PreapprovalId} ({Status}) del tenant {TenantId}: {Original} -> {Discounted} {Currency} por {Months} meses",
                code, preapproval.MercadoPagoPreapprovalId, preapproval.Status, tenant.Id, original, discounted, preapproval.CurrencyId, coupon.DurationMonths);
        }

        /// <summary>
        /// Descuentos activos: si la preapproval se canceló o cambió de monto, el descuento terminó ahí; si ya
        /// se cobraron DurationMonths meses con descuento, vuelve al precio del plan.
        /// </summary>
        private async Task FinishDiscountsAsync(CancellationToken ct)
        {
            var active = await _db.Set<CouponRedemption>()
                .Where(r => r.Status == "active")
                .ToListAsync(ct);
            if (active.Count == 0) return;

            foreach (var redemption in active)
            {
                ct.ThrowIfCancellationRequested();
                try { await FinishOneAsync(redemption, ct); }
                catch (Exception ex) when (!ct.IsCancellationRequested)
                {
                    _logger.LogError(ex, "PromoCoupon: no se pudo revisar el descuento {RedemptionId}", redemption.Id);
                }
            }
        }

        private async Task FinishOneAsync(CouponRedemption redemption, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var preapproval = await _db.TenantPreapprovals.IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == redemption.TenantPreapprovalId, ct);

            // Checkout abandonado / cancelado, o el monto cambió (cambio de plan): el descuento no sigue.
            if (preapproval == null
                || preapproval.Status is "cancelled" or "expired"
                || preapproval.TransactionAmount != redemption.DiscountedAmount)
            {
                redemption.Status = "superseded";
                redemption.EndedAt = now;
                redemption.UpdatedAt = now;
                await _db.SaveChangesAsync(ct);
                return;
            }

            if (preapproval.Status != "authorized" || !redemption.DurationMonths.HasValue) return;

            var months = redemption.DurationMonths.Value;
            var discountedCharges = await _db.PreapprovalPayments.IgnoreQueryFilters()
                .Where(p => p.TenantPreapprovalId == preapproval.Id
                    && p.Status == "approved"
                    && p.Amount <= redemption.DiscountedAmount + 1m
                    && p.CreatedAt >= redemption.AppliedAt.AddDays(-1))
                .Select(p => p.MercadoPagoPaymentId)
                .Distinct()
                .CountAsync(ct);

            var safetyNet = (preapproval.AuthorizedAt ?? redemption.AppliedAt).AddMonths(months).AddDays(10);
            if (discountedCharges < months && now < safetyNet) return;

            var plan = await _db.SubscriptionPlans.IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == preapproval.SubscriptionPlanId, ct);
            var regular = plan != null && plan.Price > 0 ? plan.Price : redemption.OriginalAmount;

            var error = await UpdatePreapprovalAmountAsync(preapproval.MercadoPagoPreapprovalId, regular, preapproval.CurrencyId, ct);
            if (error != null)
            {
                redemption.LastError = error.Length > 500 ? error[..500] : error;
                redemption.UpdatedAt = now;
                await _db.SaveChangesAsync(ct);
                _logger.LogWarning("PromoCoupon: MP no aceptó volver al precio normal la preapproval {PreapprovalId}: {Error}", preapproval.MercadoPagoPreapprovalId, error);
                return;
            }

            preapproval.TransactionAmount = regular;
            preapproval.UpdatedAt = now;
            redemption.Status = "completed";
            redemption.EndedAt = now;
            redemption.LastError = null;
            redemption.UpdatedAt = now;

            var subscription = await LatestSubscriptionAsync(redemption.TenantId, ct);
            if (subscription != null && subscription.AppliedCouponCode == redemption.CouponCode)
            {
                subscription.MonthlyAmount = regular;
                subscription.OriginalMonthlyPrice = null;
                subscription.UpdatedAt = now;
            }

            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("PromoCoupon: terminó el descuento {Code} de la preapproval {PreapprovalId} ({Charges} cobros con descuento): vuelve a {Amount} {Currency}",
                redemption.CouponCode, preapproval.MercadoPagoPreapprovalId, discountedCharges, regular, preapproval.CurrencyId);
        }

        private async Task StampSubscriptionAsync(Guid tenantId, CouponRedemption redemption, CancellationToken ct)
        {
            var subscription = await LatestSubscriptionAsync(tenantId, ct);
            if (subscription == null) return;
            subscription.MonthlyAmount = redemption.DiscountedAmount;
            subscription.OriginalMonthlyPrice = redemption.OriginalAmount;
            subscription.AppliedCouponCode = redemption.CouponCode;
            subscription.UpdatedAt = DateTime.UtcNow;
        }

        private Task<Subscription?> LatestSubscriptionAsync(Guid tenantId, CancellationToken ct) =>
            _db.Subscriptions.IgnoreQueryFilters()
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(ct);

        /// <summary>PUT /preapproval/{id} con el monto nuevo (MP lo cobra desde el próximo débito). null = OK.</summary>
        private async Task<string?> UpdatePreapprovalAmountAsync(string mpPreapprovalId, decimal amount, string currencyId, CancellationToken ct)
        {
            var token = await _platformConnections.GetAccessTokenAsync("mercadopago");
            if (string.IsNullOrWhiteSpace(token)) return "Mercado Pago de la plataforma no configurado";

            var body = JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                ["auto_recurring"] = new Dictionary<string, object?>
                {
                    ["transaction_amount"] = amount,
                    ["currency_id"] = currencyId
                }
            });

            try
            {
                var client = _httpClientFactory.CreateClient();
                using var request = new HttpRequestMessage(HttpMethod.Put, $"{MP_API_BASE}/preapproval/{mpPreapprovalId}")
                {
                    Content = new StringContent(body, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("Authorization", $"Bearer {token}");
                using var response = await client.SendAsync(request, ct);
                if (response.IsSuccessStatusCode) return null;
                var responseBody = await response.Content.ReadAsStringAsync(ct);
                return $"{(int)response.StatusCode}: {responseBody}";
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                return ex.Message;
            }
        }
    }
}
