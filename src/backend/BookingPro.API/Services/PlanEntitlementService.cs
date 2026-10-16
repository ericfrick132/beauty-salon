using BookingPro.API.Data;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BookingPro.API.Services
{
    /// <summary>Resultado de chequear un límite del plan. Limit es estable para el frontend.</summary>
    public record PlanCheck(bool Allowed, string Limit, int Max, int Used, string PlanCode, string PlanName, string? Message)
    {
        public static PlanCheck Ok(SubscriptionPlan plan, string limit, int max = -1, int used = 0)
            => new(true, limit, max, used, plan.Code, plan.Name, null);
    }

    /// <summary>
    /// La reserva supera el plan del negocio. No hereda de InvalidOperationException a propósito: los bots
    /// tratan esa como "se ocupó el horario" y acá no hay otro horario que ofrecer.
    /// </summary>
    public class PlanLimitException : Exception
    {
        public PlanCheck Check { get; }
        public PlanLimitException(PlanCheck check) : base(check.Message) => Check = check;
    }

    public static class PlanLimits
    {
        public const string BookingsPerMonth = "bookings_per_month";
        public const string Staff = "staff";
        public const string Services = "services";
        public const string Coupons = "coupons";
        public const string CustomFields = "custom_fields";
        public const string RecurringBookings = "recurring_bookings";
        public const string CustomerHistory = "customer_history";
        public const string TrackingPixels = "tracking_pixels";
    }

    public interface IPlanEntitlementService
    {
        /// <summary>Plan pago vigente del negocio, o Gratuito si no paga nada.</summary>
        Task<SubscriptionPlan> GetEffectivePlanAsync(Guid tenantId);
        Task<PlanCheck> CanCreateBookingAsync(Guid tenantId);
        Task<PlanCheck> CanCreateEmployeeAsync(Guid tenantId);
        Task<PlanCheck> CanCreateServiceAsync(Guid tenantId);
        Task<PlanUsage> GetUsageAsync(Guid tenantId);

        /// <summary>Features de sí/no del plan: coupons, customer_history, tracking_pixels.</summary>
        Task<PlanCheck> CheckFeatureAsync(Guid tenantId, string feature);
        Task<PlanCheck> CanCreateCustomFieldAsync(Guid tenantId);
        Task<PlanCheck> CanCreateRecurringSeriesAsync(Guid tenantId);
        /// <summary>Cuántos campos personalizados se muestran en la página pública (-1 = todos).</summary>
        Task<int> MaxCustomFieldsAsync(Guid tenantId);
        /// <summary>Comisión de la plataforma para un cobro online (marketplace_fee / application_fee), en la moneda del cobro.</summary>
        Task<decimal> GetPlatformFeeAsync(Guid tenantId, decimal amount);

        /// <summary>
        /// Mensajes de WhatsApp que el plan todavía incluye este mes (int.MaxValue si son ilimitados). Se gastan
        /// primero; recién cuando llegan a 0 se descuentan los packs comprados (TenantMessageWallet).
        /// </summary>
        Task<int> GetIncludedWhatsAppRemainingAsync(Guid tenantId);

        /// <summary>Recordatorios y confirmación automática por WhatsApp (Plus en adelante).</summary>
        Task<bool> AllowsRemindersAsync(Guid tenantId);

        /// <summary>El plan trae incluido un add-on que si no se paga aparte (bot de confirmación, transferencia automática).</summary>
        Task<bool> PlanIncludesAddonAsync(Guid tenantId, string addonCode);
        void Invalidate(Guid tenantId);
    }

    public record PlanUsage(string PlanCode, string PlanName, bool IsFree, decimal CommissionPercent,
        int BookingsThisMonth, int MaxBookingsPerMonth, int ActiveStaff, int MaxStaff, int ActiveServices, int MaxServices,
        int WhatsAppMonthlyLimit, int WhatsAppIncludedRemaining);

    public class PlanEntitlementService : IPlanEntitlementService
    {
        private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);
        private readonly ApplicationDbContext _context;
        // ISubscriptionService se resuelve al usarlo: SubscriptionService → StorePurchaseService →
        // FeatureAddonService → este servicio, y por constructor eso es un ciclo que el contenedor no resuelve.
        private readonly IServiceProvider _services;
        private readonly IMemoryCache _cache;
        private readonly ILogger<PlanEntitlementService> _logger;

        public PlanEntitlementService(ApplicationDbContext context, IServiceProvider services, IMemoryCache cache, ILogger<PlanEntitlementService> logger)
        {
            _context = context;
            _services = services;
            _cache = cache;
            _logger = logger;
        }

        private static string CacheKey(Guid tenantId) => $"effective-plan:{tenantId}";

        public void Invalidate(Guid tenantId) => _cache.Remove(CacheKey(tenantId));

        public async Task<SubscriptionPlan> GetEffectivePlanAsync(Guid tenantId)
        {
            if (_cache.TryGetValue(CacheKey(tenantId), out SubscriptionPlan? cached) && cached != null) return cached;

            var plan = await ResolvePlanAsync(tenantId);
            _cache.Set(CacheKey(tenantId), plan, CacheTtl);
            return plan;
        }

        private async Task<SubscriptionPlan> ResolvePlanAsync(Guid tenantId)
        {
            var plans = await _context.SubscriptionPlans.AsNoTracking().ToListAsync();
            var free = plans.FirstOrDefault(p => p.Code == PlanCatalog.Free) ?? PlanCatalog.Seeds()[0];

            try
            {
                // Misma regla de "está al día" que usa el panel (MP, Stripe, Apple, Google Play, pagos manuales):
                // así no hay dos definiciones de quién paga.
                var status = await _services.GetRequiredService<ISubscriptionService>()
                    .GetSubscriptionStatusAsync(tenantId, includePaymentLink: false);
                if (!status.Success || status.Data == null || !status.Data.IsPaid) return free;

                // Una prueba vieja con plan "demo"/"basic" se respeta como Pro hasta que venza.
                var plan = plans.FirstOrDefault(p => p.Code == status.Data.PlanType && p.Code != PlanCatalog.Free)
                    ?? plans.FirstOrDefault(p => p.Code == PlanCatalog.Pro)
                    ?? plans.FirstOrDefault(p => p.Code == PlanCatalog.LegacyPro);
                return plan ?? free;
            }
            catch (Exception ex)
            {
                // Ante una falla, Pro: nunca le cortamos funciones a alguien que quizás paga por un error nuestro.
                _logger.LogError(ex, "No se pudo resolver el plan del tenant {TenantId}", tenantId);
                return plans.FirstOrDefault(p => p.Code == PlanCatalog.Pro)
                    ?? plans.FirstOrDefault(p => p.Code == PlanCatalog.LegacyPro) ?? free;
            }
        }

        public async Task<PlanCheck> CanCreateBookingAsync(Guid tenantId)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            if (plan.MaxBookingsPerMonth < 0) return PlanCheck.Ok(plan, PlanLimits.BookingsPerMonth);

            var used = await CountBookingsThisMonthAsync(tenantId);
            if (used < plan.MaxBookingsPerMonth) return PlanCheck.Ok(plan, PlanLimits.BookingsPerMonth, plan.MaxBookingsPerMonth, used);

            return new PlanCheck(false, PlanLimits.BookingsPerMonth, plan.MaxBookingsPerMonth, used, plan.Code, plan.Name,
                $"Llegaste a las {plan.MaxBookingsPerMonth} reservas del mes del plan {plan.Name}. Pasate de plan para seguir recibiendo reservas.");
        }

        public async Task<PlanCheck> CanCreateEmployeeAsync(Guid tenantId)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            if (plan.MaxStaff < 0) return PlanCheck.Ok(plan, PlanLimits.Staff);

            var used = await _context.Employees.IgnoreQueryFilters().CountAsync(e => e.TenantId == tenantId && e.IsActive);
            if (used < plan.MaxStaff) return PlanCheck.Ok(plan, PlanLimits.Staff, plan.MaxStaff, used);

            return new PlanCheck(false, PlanLimits.Staff, plan.MaxStaff, used, plan.Code, plan.Name,
                $"El plan {plan.Name} incluye hasta {plan.MaxStaff} agendas. Pasate de plan para sumar más profesionales.");
        }

        public async Task<PlanCheck> CanCreateServiceAsync(Guid tenantId)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            var max = await MaxServicesAsync(tenantId, plan);
            if (max < 0) return PlanCheck.Ok(plan, PlanLimits.Services);

            var used = await _context.Services.IgnoreQueryFilters().CountAsync(s => s.TenantId == tenantId && s.IsActive);
            if (used < max) return PlanCheck.Ok(plan, PlanLimits.Services, max, used);

            return new PlanCheck(false, PlanLimits.Services, max, used, plan.Code, plan.Name,
                $"El plan {plan.Name} incluye {plan.MaxServicesPerStaff} servicio por agenda ({max} en total). Pasate de plan para tener servicios ilimitados.");
        }

        public async Task<PlanCheck> CheckFeatureAsync(Guid tenantId, string feature)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            var (allowed, message) = feature switch
            {
                PlanLimits.Coupons => (plan.AllowCoupons, "Los cupones de descuento están incluidos desde el plan Advance."),
                PlanLimits.CustomerHistory => (plan.AllowCustomerHistory, "La ficha e historial de clientes está incluida en el plan Pro."),
                PlanLimits.TrackingPixels => (plan.AllowTrackingPixels, "El Píxel de Meta y Google Analytics están incluidos en el plan Pro."),
                _ => (false, "Tu plan no incluye esta función."),
            };
            return allowed ? PlanCheck.Ok(plan, feature) : new PlanCheck(false, feature, 0, 0, plan.Code, plan.Name, message);
        }

        public async Task<PlanCheck> CanCreateCustomFieldAsync(Guid tenantId)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            if (plan.MaxCustomFields < 0) return PlanCheck.Ok(plan, PlanLimits.CustomFields);
            var used = await _context.BookingFormFields.IgnoreQueryFilters().CountAsync(f => f.TenantId == tenantId && f.IsActive);
            if (used < plan.MaxCustomFields) return PlanCheck.Ok(plan, PlanLimits.CustomFields, plan.MaxCustomFields, used);
            return new PlanCheck(false, PlanLimits.CustomFields, plan.MaxCustomFields, used, plan.Code, plan.Name,
                plan.MaxCustomFields == 0
                    ? "Los campos personalizados en el formulario están incluidos desde el plan Advance."
                    : $"El plan {plan.Name} incluye {plan.MaxCustomFields} campo personalizado. Con Pro son ilimitados.");
        }

        public async Task<PlanCheck> CanCreateRecurringSeriesAsync(Guid tenantId)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            if (plan.MaxRecurringBookings < 0) return PlanCheck.Ok(plan, PlanLimits.RecurringBookings);
            var used = await _context.BookingSeries.IgnoreQueryFilters().CountAsync(s => s.TenantId == tenantId && s.Status == BookingSeriesStatus.Active);
            if (used < plan.MaxRecurringBookings) return PlanCheck.Ok(plan, PlanLimits.RecurringBookings, plan.MaxRecurringBookings, used);
            return new PlanCheck(false, PlanLimits.RecurringBookings, plan.MaxRecurringBookings, used, plan.Code, plan.Name,
                plan.MaxRecurringBookings == 0
                    ? "Las reservas recurrentes (turnos fijos) están incluidas desde el plan Advance."
                    : $"El plan {plan.Name} incluye hasta {plan.MaxRecurringBookings} reservas recurrentes activas. Con Pro son ilimitadas.");
        }

        public async Task<int> MaxCustomFieldsAsync(Guid tenantId) => (await GetEffectivePlanAsync(tenantId)).MaxCustomFields;

        public async Task<PlanUsage> GetUsageAsync(Guid tenantId)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            return new PlanUsage(
                plan.Code, plan.Name, plan.Code == PlanCatalog.Free, plan.CommissionPercent,
                await CountBookingsThisMonthAsync(tenantId), plan.MaxBookingsPerMonth,
                await _context.Employees.IgnoreQueryFilters().CountAsync(e => e.TenantId == tenantId && e.IsActive), plan.MaxStaff,
                await _context.Services.IgnoreQueryFilters().CountAsync(s => s.TenantId == tenantId && s.IsActive), await MaxServicesAsync(tenantId, plan),
                plan.AllowWhatsApp ? plan.WhatsAppMonthlyLimit : 0,
                // -1 = ilimitados (int.MaxValue no se serializa bien para el panel)
                plan.AllowWhatsApp && plan.WhatsAppMonthlyLimit < 0 ? -1 : await GetIncludedWhatsAppRemainingAsync(tenantId));
        }

        public async Task<decimal> GetPlatformFeeAsync(Guid tenantId, decimal amount)
        {
            if (amount <= 0) return 0;
            var plan = await GetEffectivePlanAsync(tenantId);
            if (plan.CommissionPercent <= 0) return 0;
            return Math.Round(amount * plan.CommissionPercent / 100m, 2, MidpointRounding.AwayFromZero);
        }

        /// <summary>Tipos de MessageLog que son mensajes a clientes (los "credit"/"include" son cargas de saldo).</summary>
        private static readonly string[] WhatsAppSendTypes = { "reminder", "confirmation_request", "confirmation" };

        public async Task<int> GetIncludedWhatsAppRemainingAsync(Guid tenantId)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            if (!plan.AllowWhatsApp || plan.WhatsAppMonthlyLimit == 0) return 0;
            if (plan.WhatsAppMonthlyLimit < 0) return int.MaxValue;

            // Lo incluido se gasta primero, así que lo enviado en el mes (incluido + packs) descuenta del cupo.
            var monthStartUtc = await MonthStartUtcAsync(tenantId);
            var sent = await _context.MessageLogs.IgnoreQueryFilters().CountAsync(l =>
                l.TenantId == tenantId && l.Channel == "whatsapp" && l.Status == "sent"
                && WhatsAppSendTypes.Contains(l.MessageType) && l.CreatedAt >= monthStartUtc);
            return Math.Max(0, plan.WhatsAppMonthlyLimit - sent);
        }

        public async Task<bool> AllowsRemindersAsync(Guid tenantId) => (await GetEffectivePlanAsync(tenantId)).AllowReminders;

        public async Task<bool> PlanIncludesAddonAsync(Guid tenantId, string addonCode)
        {
            var plan = await GetEffectivePlanAsync(tenantId);
            return addonCode switch
            {
                FeatureCodes.ConfirmationBot => plan.AllowReminders,
                FeatureCodes.TransferDetection => plan.AllowTransferDetection,
                _ => false,
            };
        }

        /// <summary>"1 servicio por agenda": el tope de servicios crece con las agendas activas (mínimo 1).</summary>
        private async Task<int> MaxServicesAsync(Guid tenantId, SubscriptionPlan plan)
        {
            if (plan.MaxServicesPerStaff < 0) return plan.MaxServices;
            var staff = await _context.Employees.IgnoreQueryFilters().CountAsync(e => e.TenantId == tenantId && e.IsActive);
            var byStaff = Math.Max(1, staff) * plan.MaxServicesPerStaff;
            return plan.MaxServices < 0 ? byStaff : Math.Min(byStaff, plan.MaxServices);
        }

        // Los conteos filtran por TenantId explícito e ignoran el filtro global (que depende del tenant del
        // request): así también sirven desde los background services, que corren sin request.

        /// <summary>Reservas creadas en el mes calendario en curso, en la zona horaria del negocio.</summary>
        private async Task<int> CountBookingsThisMonthAsync(Guid tenantId)
        {
            var monthStartUtc = await MonthStartUtcAsync(tenantId);
            return await _context.Bookings.IgnoreQueryFilters().CountAsync(b => b.TenantId == tenantId && b.CreatedAt >= monthStartUtc);
        }

        /// <summary>Inicio del mes calendario en curso en la zona horaria del negocio, en UTC.</summary>
        private async Task<DateTime> MonthStartUtcAsync(Guid tenantId)
        {
            var tzId = await _context.Tenants.AsNoTracking().Where(t => t.Id == tenantId).Select(t => t.TimeZone).FirstOrDefaultAsync();
            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById(string.IsNullOrWhiteSpace(tzId) || tzId == "UTC" ? "America/Argentina/Buenos_Aires" : tzId); }
            catch { tz = TimeZoneInfo.Utc; }

            var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            var monthStartLocal = new DateTime(local.Year, local.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
            return TimeZoneInfo.ConvertTimeToUtc(monthStartLocal, tz);
        }
    }
}
