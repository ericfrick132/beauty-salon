using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Utilities;
using Microsoft.EntityFrameworkCore;
using StripeSdk = Stripe;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Suscripción a la plataforma y add-ons fuera de Argentina, cobrados con Stripe (cuenta de la LLC de
    /// EE.UU.). Es el espejo de PreapprovalService: Checkout en modo subscription (con la prueba gratis
    /// como trial de Stripe) y un webhook que actualiza el mismo Tenant/Subscription que actualiza la
    /// preapproval de Mercado Pago. Argentina no pasa nunca por acá.
    /// </summary>
    public interface IStripeBillingService
    {
        bool IsConfigured { get; }

        /// <summary>Checkout de la suscripción (o cambio de plan si ya tiene una viva). tenantBaseUrl = https://{sub}.turnos-pro.com.</summary>
        Task<ServiceResult<StripeCheckoutResult>> CreateSubscriptionCheckoutAsync(Guid tenantId, string? planCode, string tenantBaseUrl, string? returnPath);

        /// <summary>Checkout de un mes de add-on en la moneda del país.</summary>
        Task<ServiceResult<PurchaseFeatureAddonResponseDto>> CreateAddonCheckoutAsync(Guid tenantId, string addonCode, string tenantBaseUrl);

        /// <summary>Suscripción de Stripe viva del negocio (trialing/active/past_due), concilia el Checkout pendiente si hace falta.</summary>
        Task<TenantStripeSubscription?> GetChargingSubscriptionAsync(Guid tenantId, bool reconcile = false);

        /// <summary>Cancela al fin del período pagado.</summary>
        Task<ServiceResult<bool>> CancelSubscriptionAsync(Guid tenantId);

        /// <summary>Webhook de la cuenta de la plataforma (checkout, invoices, subscriptions).</summary>
        Task HandlePlatformEventAsync(StripeSdk.Event stripeEvent);

        /// <summary>Completa los precios por moneda que falten (planes y add-ons) a partir del precio en ARS.</summary>
        Task EnsureCurrencyPricesAsync();

        /// <summary>Precio del plan en la moneda pedida (null si no hay).</summary>
        Task<decimal?> GetPlanPriceAsync(Guid planId, string currency);

        /// <summary>Precio del add-on en la moneda pedida (null si no hay).</summary>
        Task<decimal?> GetAddonPriceAsync(string addonCode, string currency);
    }

    public class StripeCheckoutResult
    {
        public string? Url { get; set; }
        public string? SessionId { get; set; }
        public bool PlanChanged { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime? NextPaymentDate { get; set; }
    }

    public class StripeBillingService : IStripeBillingService
    {
        public const string MetaKind = "turnospro_kind";
        public const string KindSubscription = "subscription";
        public const string KindAddon = "addon";
        public const string KindDeposit = "deposit";
        public const string StripePaymentMethod = "stripe";

        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StripeBillingService> _logger;
        private readonly IFeatureAddonService _addons;

        public StripeBillingService(
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<StripeBillingService> logger,
            IFeatureAddonService addons)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _addons = addons;
        }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(_configuration["Stripe:SecretKey"]);

        private StripeSdk.IStripeClient Client()
        {
            var key = _configuration["Stripe:SecretKey"];
            if (string.IsNullOrWhiteSpace(key)) throw new InvalidOperationException("Stripe:SecretKey no configurada");
            return new StripeSdk.StripeClient(key);
        }

        // ───────────────────────── Precios por moneda ─────────────────────────

        public async Task EnsureCurrencyPricesAsync()
        {
            var now = DateTime.UtcNow;
            var plans = await _context.SubscriptionPlans.AsNoTracking()
                .Where(p => p.Price > 0)
                .Select(p => new { p.Id, p.Price, p.Currency })
                .ToListAsync();
            var existing = await _context.SubscriptionPlanPrices.AsNoTracking()
                .Select(p => new { p.SubscriptionPlanId, p.Currency })
                .ToListAsync();

            var added = 0;
            foreach (var plan in plans.Where(p => string.Equals(p.Currency ?? "ARS", "ARS", StringComparison.OrdinalIgnoreCase)))
            {
                foreach (var currency in PlatformPricing.StripeCurrencies)
                {
                    if (existing.Any(e => e.SubscriptionPlanId == plan.Id && e.Currency == currency)) continue;
                    _context.SubscriptionPlanPrices.Add(new SubscriptionPlanPrice
                    {
                        SubscriptionPlanId = plan.Id,
                        Currency = currency,
                        Amount = PlatformPricing.FromArs(plan.Price, currency),
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
                    added++;
                }
            }

            var addons = await _context.FeatureAddons.AsNoTracking()
                .Where(a => a.MonthlyPrice > 0)
                .Select(a => new { a.Code, a.MonthlyPrice, a.Currency })
                .ToListAsync();
            var existingAddon = await _context.FeatureAddonPrices.AsNoTracking()
                .Select(p => new { p.AddonCode, p.Currency })
                .ToListAsync();
            foreach (var addon in addons.Where(a => string.Equals(a.Currency ?? "ARS", "ARS", StringComparison.OrdinalIgnoreCase)))
            {
                foreach (var currency in PlatformPricing.StripeCurrencies)
                {
                    if (existingAddon.Any(e => e.AddonCode == addon.Code && e.Currency == currency)) continue;
                    _context.FeatureAddonPrices.Add(new FeatureAddonPrice
                    {
                        AddonCode = addon.Code,
                        Currency = currency,
                        Amount = PlatformPricing.FromArs(addon.MonthlyPrice, currency),
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
                    added++;
                }
            }

            if (added > 0)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Stripe: {Count} precios por moneda creados a partir del precio en ARS", added);
            }
        }

        public async Task<decimal?> GetPlanPriceAsync(Guid planId, string currency) =>
            await _context.SubscriptionPlanPrices.AsNoTracking()
                .Where(p => p.SubscriptionPlanId == planId && p.Currency == currency)
                .Select(p => (decimal?)p.Amount)
                .FirstOrDefaultAsync();

        public async Task<decimal?> GetAddonPriceAsync(string addonCode, string currency) =>
            await _context.FeatureAddonPrices.AsNoTracking()
                .Where(p => p.AddonCode == addonCode && p.Currency == currency)
                .Select(p => (decimal?)p.Amount)
                .FirstOrDefaultAsync();

        /// <summary>
        /// Price de Stripe del plan en la moneda: lookup_key turnospro_plan_{code}_{currency}. Si el super admin
        /// cambió el monto se crea un Price nuevo y se le pasa la lookup_key (los suscriptos existentes siguen
        /// con el Price viejo hasta que cambien de plan).
        /// </summary>
        private async Task<string> EnsureStripePriceAsync(SubscriptionPlan plan, SubscriptionPlanPrice price)
        {
            if (!string.IsNullOrEmpty(price.StripePriceId) && price.StripePriceAmount == price.Amount)
                return price.StripePriceId;

            var client = Client();
            var currency = price.Currency.ToLowerInvariant();
            var lookupKey = $"turnospro_plan_{plan.Code.ToLowerInvariant()}_{currency}";
            var unitAmount = PlatformPricing.ToStripeAmount(price.Amount);

            var prices = await new StripeSdk.PriceService(client).ListAsync(new StripeSdk.PriceListOptions
            {
                LookupKeys = new List<string> { lookupKey },
                Active = true,
            });
            var match = prices.Data.FirstOrDefault(p => p.UnitAmount == unitAmount
                && string.Equals(p.Currency, currency, StringComparison.OrdinalIgnoreCase)
                && p.Recurring?.Interval == "month");

            if (match == null)
            {
                var productId = $"turnospro_plan_{plan.Id:N}";
                var products = new StripeSdk.ProductService(client);
                try
                {
                    await products.GetAsync(productId);
                }
                catch (StripeSdk.StripeException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    await products.CreateAsync(new StripeSdk.ProductCreateOptions
                    {
                        Id = productId,
                        Name = $"TurnosPro - {plan.Name}",
                        Metadata = new Dictionary<string, string> { ["plan_id"] = plan.Id.ToString(), ["plan_code"] = plan.Code },
                    });
                }

                match = await new StripeSdk.PriceService(client).CreateAsync(new StripeSdk.PriceCreateOptions
                {
                    Product = productId,
                    Currency = currency,
                    UnitAmount = unitAmount,
                    Recurring = new StripeSdk.PriceRecurringOptions { Interval = "month" },
                    LookupKey = lookupKey,
                    TransferLookupKey = true,
                    Metadata = new Dictionary<string, string> { ["plan_id"] = plan.Id.ToString(), ["plan_code"] = plan.Code },
                });
                _logger.LogInformation("Stripe: Price {PriceId} creado para {LookupKey} ({Amount} {Currency})", match.Id, lookupKey, price.Amount, price.Currency);
            }

            price.StripePriceId = match.Id;
            price.StripePriceAmount = price.Amount;
            price.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return match.Id;
        }

        // ───────────────────────── Checkout de la suscripción ─────────────────────────

        public async Task<ServiceResult<StripeCheckoutResult>> CreateSubscriptionCheckoutAsync(Guid tenantId, string? planCode, string tenantBaseUrl, string? returnPath)
        {
            try
            {
                if (!IsConfigured) return ServiceResult<StripeCheckoutResult>.Fail("Los pagos con tarjeta todavía no están habilitados. Escribinos y lo activamos.");

                var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant == null) return ServiceResult<StripeCheckoutResult>.Fail("Negocio no encontrado");

                var profile = CountryProfile.For(tenant);
                if (!profile.BillsWithStripe)
                    return ServiceResult<StripeCheckoutResult>.Fail("La suscripción de tu negocio se paga con Mercado Pago.");

                var code = string.IsNullOrWhiteSpace(planCode) ? "pro" : planCode.Trim().ToLowerInvariant();
                var plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.IsActive && p.Code.ToLower() == code);
                if (plan == null) return ServiceResult<StripeCheckoutResult>.Fail($"Plan '{code}' no disponible");

                var currency = profile.PlatformCurrency;
                await EnsureCurrencyPricesAsync();
                var planPrice = await _context.SubscriptionPlanPrices.FirstOrDefaultAsync(p => p.SubscriptionPlanId == plan.Id && p.Currency == currency);
                if (planPrice == null || planPrice.Amount <= 0)
                    return ServiceResult<StripeCheckoutResult>.Fail($"El plan {plan.Name} no tiene precio en {currency}.");

                var priceId = await EnsureStripePriceAsync(plan, planPrice);

                // Ya tiene una suscripción viva: se cambia el Price de esa (Stripe cobraría dos si se crea otra).
                var current = await GetChargingSubscriptionAsync(tenantId, reconcile: true);
                if (current != null && !string.IsNullOrEmpty(current.StripeSubscriptionId))
                    return await ChangePlanAsync(current, plan, planPrice, priceId);

                var customerId = await EnsureCustomerAsync(tenant);
                var trialDays = await GetTrialDaysLeftAsync(tenant);

                var metadata = new Dictionary<string, string>
                {
                    [MetaKind] = KindSubscription,
                    ["tenant_id"] = tenantId.ToString(),
                    ["plan_id"] = plan.Id.ToString(),
                };

                var path = !string.IsNullOrWhiteSpace(returnPath) && returnPath.StartsWith('/') && !returnPath.StartsWith("//")
                    ? returnPath
                    : "/subscription/success?flow=trial";
                var successUrl = $"{tenantBaseUrl}{path}{(path.Contains('?') ? "&" : "?")}provider=stripe&session_id={{CHECKOUT_SESSION_ID}}";

                var options = new StripeSdk.Checkout.SessionCreateOptions
                {
                    Mode = "subscription",
                    Customer = customerId,
                    ClientReferenceId = tenantId.ToString(),
                    LineItems = new List<StripeSdk.Checkout.SessionLineItemOptions>
                    {
                        new() { Price = priceId, Quantity = 1 },
                    },
                    PaymentMethodTypes = PaymentMethodTypesFor(currency),
                    SubscriptionData = new StripeSdk.Checkout.SessionSubscriptionDataOptions
                    {
                        Metadata = metadata,
                        TrialPeriodDays = trialDays > 0 ? trialDays : null,
                    },
                    Metadata = metadata,
                    SuccessUrl = successUrl,
                    CancelUrl = $"{tenantBaseUrl}/empezar",
                    Locale = "es",
                };

                var session = await new StripeSdk.Checkout.SessionService(Client()).CreateAsync(options);

                _context.TenantStripeSubscriptions.Add(new TenantStripeSubscription
                {
                    TenantId = tenantId,
                    SubscriptionPlanId = plan.Id,
                    StripeCustomerId = customerId,
                    StripeCheckoutSessionId = session.Id,
                    StripePriceId = priceId,
                    Status = TenantStripeSubscriptionStatuses.CheckoutPending,
                    Currency = currency,
                    Amount = planPrice.Amount,
                });
                await _context.SaveChangesAsync();

                _logger.LogInformation("Stripe: Checkout {SessionId} de suscripción para tenant {TenantId}, plan {Plan} ({Amount} {Currency}, {Trial} días de prueba)",
                    session.Id, tenantId, plan.Code, planPrice.Amount, currency, trialDays);

                return ServiceResult<StripeCheckoutResult>.Ok(new StripeCheckoutResult
                {
                    Url = session.Url,
                    SessionId = session.Id,
                    PlanName = plan.Name,
                    Amount = planPrice.Amount,
                    Currency = currency,
                });
            }
            catch (StripeSdk.StripeException ex)
            {
                _logger.LogError(ex, "Stripe: error creando el Checkout de suscripción del tenant {TenantId}", tenantId);
                return ServiceResult<StripeCheckoutResult>.Fail("No pudimos iniciar el pago con tarjeta. Probá de nuevo en unos minutos.");
            }
        }

        private async Task<ServiceResult<StripeCheckoutResult>> ChangePlanAsync(TenantStripeSubscription current, SubscriptionPlan plan, SubscriptionPlanPrice planPrice, string priceId)
        {
            if (current.SubscriptionPlanId == plan.Id && current.StripePriceId == priceId)
                return ServiceResult<StripeCheckoutResult>.Fail("Ya tenés ese plan");

            var subscriptions = new StripeSdk.SubscriptionService(Client());
            var sub = await subscriptions.GetAsync(current.StripeSubscriptionId);
            var item = sub.Items?.Data?.FirstOrDefault();
            if (item == null) return ServiceResult<StripeCheckoutResult>.Fail("No pudimos leer tu suscripción. Escribinos y lo resolvemos.");

            sub = await subscriptions.UpdateAsync(sub.Id, new StripeSdk.SubscriptionUpdateOptions
            {
                Items = new List<StripeSdk.SubscriptionItemOptions> { new() { Id = item.Id, Price = priceId } },
                // Como en Mercado Pago: el nuevo monto corre desde el próximo cobro, sin prorrateo.
                ProrationBehavior = "none",
                Metadata = new Dictionary<string, string>
                {
                    [MetaKind] = KindSubscription,
                    ["tenant_id"] = current.TenantId.ToString(),
                    ["plan_id"] = plan.Id.ToString(),
                },
            });

            await SyncSubscriptionAsync(sub, null);

            return ServiceResult<StripeCheckoutResult>.Ok(new StripeCheckoutResult
            {
                PlanChanged = true,
                PlanName = plan.Name,
                Amount = planPrice.Amount,
                Currency = planPrice.Currency,
                NextPaymentDate = sub.TrialEnd ?? sub.CurrentPeriodEnd,
            });
        }

        private static List<string> PaymentMethodTypesFor(string currency) =>
            string.Equals(currency, "EUR", StringComparison.OrdinalIgnoreCase)
                ? new List<string> { "card", "sepa_debit" }
                : new List<string> { "card" };

        private async Task<string> EnsureCustomerAsync(Tenant tenant)
        {
            if (!string.IsNullOrEmpty(tenant.StripeCustomerId)) return tenant.StripeCustomerId;

            var customer = await new StripeSdk.CustomerService(Client()).CreateAsync(new StripeSdk.CustomerCreateOptions
            {
                Email = tenant.OwnerEmail,
                Name = tenant.BusinessName,
                Metadata = new Dictionary<string, string>
                {
                    ["tenant_id"] = tenant.Id.ToString(),
                    ["subdomain"] = tenant.Subdomain ?? string.Empty,
                    ["country"] = tenant.Country ?? "AR",
                },
            });
            tenant.StripeCustomerId = customer.Id;
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return customer.Id;
        }

        /// <summary>Mismo criterio que PreapprovalService: días que le quedan de prueba (0 si no está en trial).</summary>
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

        // ───────────────────────── Add-ons ─────────────────────────

        public async Task<ServiceResult<PurchaseFeatureAddonResponseDto>> CreateAddonCheckoutAsync(Guid tenantId, string addonCode, string tenantBaseUrl)
        {
            try
            {
                if (!IsConfigured) return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Los pagos con tarjeta todavía no están habilitados. Escribinos y lo activamos.");

                var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant == null) return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Tenant not found");
                var profile = CountryProfile.For(tenant);
                if (!profile.BillsWithStripe) return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Este negocio paga con Mercado Pago");

                var addon = await _context.FeatureAddons.FirstOrDefaultAsync(a => a.Code == addonCode && a.IsActive);
                if (addon == null) return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Addon not found");

                var currency = profile.PlatformCurrency;
                await EnsureCurrencyPricesAsync();
                var amount = await GetAddonPriceAsync(addon.Code, currency);
                if (amount is null or <= 0) return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail($"El add-on no tiene precio en {currency}.");

                var customerId = await EnsureCustomerAsync(tenant);
                var externalRef = $"ADDON-{tenantId}-{addon.Code}-{DateTime.UtcNow:yyyyMMddHHmmss}";
                var returnPath = addon.Code == Models.Constants.FeatureCodes.AiAgent ? "agente-ia"
                    : addon.Code == Models.Constants.FeatureCodes.TransferDetection ? "transfer-detection"
                    : addon.Code == Models.Constants.FeatureCodes.MenuBot ? "whatsapp-bot"
                    : "confirmation-bot";

                var purchase = new FeatureAddonPurchase
                {
                    TenantId = tenantId,
                    AddonCode = addon.Code,
                    Months = 1,
                    Amount = amount.Value,
                    Currency = currency,
                    Provider = StripePaymentMethod,
                    Status = "pending",
                    ExternalReference = externalRef,
                };
                _context.FeatureAddonPurchases.Add(purchase);

                var metadata = new Dictionary<string, string>
                {
                    [MetaKind] = KindAddon,
                    ["tenant_id"] = tenantId.ToString(),
                    ["addon_code"] = addon.Code,
                    ["purchase_id"] = purchase.Id.ToString(),
                };

                var session = await new StripeSdk.Checkout.SessionService(Client()).CreateAsync(new StripeSdk.Checkout.SessionCreateOptions
                {
                    Mode = "payment",
                    Customer = customerId,
                    ClientReferenceId = tenantId.ToString(),
                    LineItems = new List<StripeSdk.Checkout.SessionLineItemOptions>
                    {
                        new()
                        {
                            Quantity = 1,
                            PriceData = new StripeSdk.Checkout.SessionLineItemPriceDataOptions
                            {
                                Currency = currency.ToLowerInvariant(),
                                UnitAmount = PlatformPricing.ToStripeAmount(amount.Value),
                                ProductData = new StripeSdk.Checkout.SessionLineItemPriceDataProductDataOptions
                                {
                                    Name = $"{addon.Name} - 1 mes",
                                    Description = addon.Description,
                                },
                            },
                        },
                    },
                    PaymentMethodTypes = PaymentMethodTypesFor(currency),
                    PaymentIntentData = new StripeSdk.Checkout.SessionPaymentIntentDataOptions { Metadata = metadata },
                    Metadata = metadata,
                    SuccessUrl = $"{tenantBaseUrl}/{returnPath}?payment=success",
                    CancelUrl = $"{tenantBaseUrl}/{returnPath}?payment=failure",
                    Locale = "es",
                });

                purchase.PreferenceId = session.Id;
                await _context.SaveChangesAsync();

                return ServiceResult<PurchaseFeatureAddonResponseDto>.Ok(new PurchaseFeatureAddonResponseDto
                {
                    PurchaseId = purchase.Id,
                    PaymentLink = session.Url ?? string.Empty,
                    PreferenceId = session.Id,
                    Amount = amount.Value,
                    ExpiresAt = session.ExpiresAt,
                });
            }
            catch (StripeSdk.StripeException ex)
            {
                _logger.LogError(ex, "Stripe: error creando el Checkout del add-on {Code} para tenant {TenantId}", addonCode, tenantId);
                return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("No pudimos iniciar el pago con tarjeta. Probá de nuevo en unos minutos.");
            }
        }

        private async Task CompleteAddonPurchaseAsync(StripeSdk.Checkout.Session session)
        {
            if (!string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
            {
                // SEPA: se acredita después (checkout.session.async_payment_succeeded vuelve a entrar acá).
                _logger.LogInformation("Stripe: Checkout {SessionId} de add-on todavía sin acreditar ({Status})", session.Id, session.PaymentStatus);
                return;
            }

            var purchase = await _context.FeatureAddonPurchases.IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.PreferenceId == session.Id);
            if (purchase == null && session.Metadata != null && session.Metadata.TryGetValue("purchase_id", out var pid) && Guid.TryParse(pid, out var purchaseId))
                purchase = await _context.FeatureAddonPurchases.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Id == purchaseId);
            if (purchase == null)
            {
                _logger.LogWarning("Stripe: Checkout {SessionId} de add-on sin compra registrada", session.Id);
                return;
            }
            if (purchase.Status == "approved") return; // Stripe reintenta: una sola activación.

            purchase.Status = "approved";
            purchase.PaidAt = DateTime.UtcNow;
            purchase.PlatformPaymentId = session.PaymentIntentId;
            purchase.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _addons.ActivateAsync(purchase.TenantId, purchase.AddonCode, purchase.Months, "payment");
        }

        // ───────────────────────── Estado de la suscripción ─────────────────────────

        public async Task<TenantStripeSubscription?> GetChargingSubscriptionAsync(Guid tenantId, bool reconcile = false)
        {
            if (reconcile && IsConfigured)
                await ReconcilePendingCheckoutsAsync(tenantId);

            return await _context.TenantStripeSubscriptions
                .Where(s => s.TenantId == tenantId && TenantStripeSubscriptionStatuses.Charging.Contains(s.Status))
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// Lo mismo que hace ReconcileTenantPendingPreapprovalsAsync con MP: si el negocio pagó y el webhook
        /// todavía no llegó (o falló), se consulta el Checkout en Stripe y se aplica. Solo las de las últimas 48 h.
        /// </summary>
        private async Task ReconcilePendingCheckoutsAsync(Guid tenantId)
        {
            var since = DateTime.UtcNow.AddHours(-48);
            var pending = await _context.TenantStripeSubscriptions
                .Where(s => s.TenantId == tenantId && s.Status == TenantStripeSubscriptionStatuses.CheckoutPending
                    && s.StripeCheckoutSessionId != null && s.CreatedAt >= since)
                .OrderByDescending(s => s.CreatedAt)
                .Take(3)
                .ToListAsync();

            foreach (var row in pending)
            {
                try
                {
                    var session = await new StripeSdk.Checkout.SessionService(Client()).GetAsync(row.StripeCheckoutSessionId);
                    if (string.Equals(session.Status, "complete", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(session.SubscriptionId))
                    {
                        var sub = await new StripeSdk.SubscriptionService(Client()).GetAsync(session.SubscriptionId);
                        await SyncSubscriptionAsync(sub, session.Id);
                    }
                    else if (string.Equals(session.Status, "expired", StringComparison.OrdinalIgnoreCase))
                    {
                        row.Status = TenantStripeSubscriptionStatuses.Expired;
                        row.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Stripe: no se pudo conciliar el Checkout {SessionId}", row.StripeCheckoutSessionId);
                }
            }
        }

        public async Task<ServiceResult<bool>> CancelSubscriptionAsync(Guid tenantId)
        {
            var current = await GetChargingSubscriptionAsync(tenantId);
            if (current == null || string.IsNullOrEmpty(current.StripeSubscriptionId))
                return ServiceResult<bool>.Fail("No tenés una suscripción con tarjeta activa.");

            try
            {
                // Como con MP: se deja terminar el período pagado.
                var sub = await new StripeSdk.SubscriptionService(Client()).UpdateAsync(current.StripeSubscriptionId,
                    new StripeSdk.SubscriptionUpdateOptions { CancelAtPeriodEnd = true });
                await SyncSubscriptionAsync(sub, null);
                return ServiceResult<bool>.Ok(true, "Suscripción cancelada: seguís teniendo acceso hasta el fin del período pagado.");
            }
            catch (StripeSdk.StripeException ex)
            {
                _logger.LogError(ex, "Stripe: error cancelando la suscripción de tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Fail("No pudimos cancelar la suscripción. Probá de nuevo en unos minutos.");
            }
        }

        public async Task HandlePlatformEventAsync(StripeSdk.Event stripeEvent)
        {
            switch (stripeEvent.Type)
            {
                case "checkout.session.completed":
                case "checkout.session.async_payment_succeeded":
                {
                    if (stripeEvent.Data.Object is not StripeSdk.Checkout.Session session) return;
                    var kind = session.Metadata != null && session.Metadata.TryGetValue(MetaKind, out var k) ? k : null;
                    if (kind == KindAddon)
                    {
                        await CompleteAddonPurchaseAsync(session);
                    }
                    else if (kind == KindSubscription && !string.IsNullOrEmpty(session.SubscriptionId))
                    {
                        var sub = await new StripeSdk.SubscriptionService(Client()).GetAsync(session.SubscriptionId);
                        await SyncSubscriptionAsync(sub, session.Id);
                    }
                    break;
                }
                case "checkout.session.expired":
                {
                    if (stripeEvent.Data.Object is not StripeSdk.Checkout.Session session) return;
                    var row = await _context.TenantStripeSubscriptions.FirstOrDefaultAsync(s => s.StripeCheckoutSessionId == session.Id
                        && s.Status == TenantStripeSubscriptionStatuses.CheckoutPending);
                    if (row != null)
                    {
                        row.Status = TenantStripeSubscriptionStatuses.Expired;
                        row.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                    break;
                }
                case "customer.subscription.created":
                case "customer.subscription.updated":
                case "customer.subscription.deleted":
                {
                    if (stripeEvent.Data.Object is not StripeSdk.Subscription sub) return;
                    if (!IsOurs(sub.Metadata)) return;
                    // El objeto del evento puede venir viejo si los eventos llegan desordenados: se relee.
                    var fresh = await new StripeSdk.SubscriptionService(Client()).GetAsync(sub.Id);
                    await SyncSubscriptionAsync(fresh, null);
                    break;
                }
                case "invoice.paid":
                {
                    if (stripeEvent.Data.Object is not StripeSdk.Invoice invoice || string.IsNullOrEmpty(invoice.SubscriptionId)) return;
                    var sub = await new StripeSdk.SubscriptionService(Client()).GetAsync(invoice.SubscriptionId);
                    if (!IsOurs(sub.Metadata)) return;
                    var row = await SyncSubscriptionAsync(sub, null);
                    if (row != null) await RecordInvoicePaymentAsync(row, invoice);
                    break;
                }
                case "invoice.payment_failed":
                {
                    if (stripeEvent.Data.Object is StripeSdk.Invoice invoice)
                        _logger.LogWarning("Stripe: falló el cobro de la factura {InvoiceId} (suscripción {SubscriptionId}); Stripe reintenta y avisa por customer.subscription.updated",
                            invoice.Id, invoice.SubscriptionId);
                    break;
                }
                default:
                    _logger.LogDebug("Stripe: evento {Type} ignorado", stripeEvent.Type);
                    break;
            }
        }

        private static bool IsOurs(IDictionary<string, string>? metadata) =>
            metadata != null && metadata.TryGetValue(MetaKind, out var kind) && kind == KindSubscription;

        /// <summary>
        /// Lleva el estado de la suscripción de Stripe a la fila local y, como la preapproval de MP, al Tenant y
        /// a su Subscription: viva (trialing/active/past_due) = activa con próximo cobro; cancelada = acceso
        /// hasta el fin del período pagado.
        /// </summary>
        private async Task<TenantStripeSubscription?> SyncSubscriptionAsync(StripeSdk.Subscription sub, string? sessionId)
        {
            var row = await _context.TenantStripeSubscriptions.FirstOrDefaultAsync(s => s.StripeSubscriptionId == sub.Id);
            if (row == null && !string.IsNullOrEmpty(sessionId))
                row = await _context.TenantStripeSubscriptions.FirstOrDefaultAsync(s => s.StripeCheckoutSessionId == sessionId);

            Guid.TryParse(sub.Metadata?.GetValueOrDefault("tenant_id"), out var metaTenant);
            Guid.TryParse(sub.Metadata?.GetValueOrDefault("plan_id"), out var metaPlan);
            if (row == null)
            {
                if (metaTenant == Guid.Empty)
                {
                    _logger.LogWarning("Stripe: suscripción {SubscriptionId} sin tenant_id en metadata", sub.Id);
                    return null;
                }
                row = new TenantStripeSubscription { TenantId = metaTenant, SubscriptionPlanId = metaPlan };
                _context.TenantStripeSubscriptions.Add(row);
            }

            var item = sub.Items?.Data?.FirstOrDefault();
            var priceId = item?.Price?.Id;
            var planFromPrice = string.IsNullOrEmpty(priceId) ? null : await _context.SubscriptionPlanPrices.AsNoTracking()
                .Where(p => p.StripePriceId == priceId)
                .Select(p => (Guid?)p.SubscriptionPlanId)
                .FirstOrDefaultAsync();

            row.StripeSubscriptionId = sub.Id;
            row.StripeCustomerId = sub.CustomerId ?? row.StripeCustomerId;
            row.StripePriceId = priceId ?? row.StripePriceId;
            row.SubscriptionPlanId = planFromPrice ?? (metaPlan != Guid.Empty ? metaPlan : row.SubscriptionPlanId);
            row.Status = sub.Status ?? row.Status;
            row.Currency = (item?.Price?.Currency ?? row.Currency).ToUpperInvariant();
            if (item?.Price?.UnitAmount != null) row.Amount = PlatformPricing.FromStripeAmount(item.Price.UnitAmount);
            row.TrialEnd = sub.TrialEnd;
            row.CurrentPeriodEnd = sub.CurrentPeriodEnd;
            row.CancelAtPeriodEnd = sub.CancelAtPeriodEnd;
            row.CanceledAt = sub.CanceledAt;
            row.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (row.IsCharging)
            {
                // Otra viva más nueva del mismo negocio manda (no se pisa su plan ni su fecha).
                var newerCharging = await _context.TenantStripeSubscriptions.AnyAsync(s => s.TenantId == row.TenantId && s.Id != row.Id
                    && TenantStripeSubscriptionStatuses.Charging.Contains(s.Status) && s.CreatedAt > row.CreatedAt);
                if (!newerCharging) await ActivateTenantAsync(row);
            }
            else if (sub.Status is "canceled" or "unpaid" or "incomplete_expired")
            {
                await EndTenantSubscriptionAsync(row);
            }

            await _context.SaveChangesAsync();
            return row;
        }

        /// <summary>Espejo de PreapprovalService.ActivateTenantSubscriptionAsync.</summary>
        private async Task ActivateTenantAsync(TenantStripeSubscription row)
        {
            var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == row.TenantId);
            if (tenant == null) return;

            var nextPayment = row.TrialEnd.HasValue && row.TrialEnd > DateTime.UtcNow ? row.TrialEnd : row.CurrentPeriodEnd;
            var plan = await _context.SubscriptionPlans.FindAsync(row.SubscriptionPlanId);

            tenant.Status = "active";
            if (plan != null) tenant.SubscriptionPlanId = plan.Id;
            tenant.TrialEndsAt = nextPayment;
            tenant.UpdatedAt = DateTime.UtcNow;

            var subscription = await _context.Subscriptions.IgnoreQueryFilters()
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(s => s.TenantId == row.TenantId);
            if (subscription == null)
            {
                subscription = new Subscription
                {
                    TenantId = row.TenantId,
                    PlanType = plan?.Code ?? "pro",
                    CreatedAt = DateTime.UtcNow,
                };
                _context.Subscriptions.Add(subscription);
            }

            subscription.PlanType = plan?.Code ?? subscription.PlanType;
            subscription.MonthlyAmount = row.Amount;
            subscription.PayerEmail = tenant.OwnerEmail;
            subscription.Status = "active";
            subscription.IsTrialPeriod = false;
            subscription.ActivatedAt ??= DateTime.UtcNow;
            subscription.NextPaymentDate = nextPayment;
            subscription.CancelledAt = null;
            subscription.UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Suscripción terminada en Stripe: la Subscription queda cancelada y el acceso sigue hasta el fin del
        /// período pagado (SubscriptionMiddleware deja pasar con Tenant.TrialEndsAt en el futuro). Si el negocio
        /// tiene otra forma de pago viva (otra suscripción de Stripe o una preapproval de MP) no se toca nada.
        /// </summary>
        private async Task EndTenantSubscriptionAsync(TenantStripeSubscription row)
        {
            var otherCharging = await _context.TenantStripeSubscriptions.AnyAsync(s => s.TenantId == row.TenantId && s.Id != row.Id
                && TenantStripeSubscriptionStatuses.Charging.Contains(s.Status));
            var hasPreapproval = await _context.TenantPreapprovals.IgnoreQueryFilters()
                .AnyAsync(p => p.TenantId == row.TenantId && p.Status == "authorized");
            if (otherCharging || hasPreapproval) return;

            var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == row.TenantId);
            if (tenant != null && row.CurrentPeriodEnd.HasValue)
            {
                tenant.TrialEndsAt = row.CurrentPeriodEnd;
                tenant.UpdatedAt = DateTime.UtcNow;
            }

            var subscription = await _context.Subscriptions.IgnoreQueryFilters()
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(s => s.TenantId == row.TenantId);
            if (subscription != null)
            {
                subscription.Status = "cancelled";
                subscription.CancelledAt ??= DateTime.UtcNow;
                subscription.CancellationReason ??= "Suscripción de Stripe terminada";
                subscription.NextPaymentDate = null;
                subscription.UpdatedAt = DateTime.UtcNow;
            }
        }

        /// <summary>Registra el cobro (como los de Apple: SubscriptionPayment con el id de la factura) una sola vez.</summary>
        private async Task RecordInvoicePaymentAsync(TenantStripeSubscription row, StripeSdk.Invoice invoice)
        {
            if (invoice.AmountPaid <= 0) return; // factura de $0 del inicio de la prueba

            row.LastInvoiceId = invoice.Id;
            row.LastPaymentAt = DateTime.UtcNow;

            var subscription = await _context.Subscriptions.IgnoreQueryFilters()
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(s => s.TenantId == row.TenantId);
            if (subscription != null)
            {
                var already = await _context.SubscriptionPayments.IgnoreQueryFilters()
                    .AnyAsync(p => p.PaymentMethod == StripePaymentMethod && p.MercadoPagoPaymentId == invoice.Id);
                if (!already)
                {
                    _context.SubscriptionPayments.Add(new SubscriptionPayment
                    {
                        TenantId = row.TenantId,
                        SubscriptionId = subscription.Id,
                        MercadoPagoPaymentId = invoice.Id,
                        Amount = PlatformPricing.FromStripeAmount(invoice.AmountPaid),
                        Status = "approved",
                        PaymentDate = DateTime.UtcNow,
                        PaymentMethod = StripePaymentMethod,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Stripe: factura {InvoiceId} cobrada para tenant {TenantId} ({Amount} {Currency})",
                invoice.Id, row.TenantId, PlatformPricing.FromStripeAmount(invoice.AmountPaid), invoice.Currency);
        }
    }
}
