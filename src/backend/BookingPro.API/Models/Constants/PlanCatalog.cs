using BookingPro.API.Models.Entities;

namespace BookingPro.API.Models.Constants
{
    /// <summary>
    /// Esquema freemium: todo negocio arranca en Gratuito (sin prueba) y paga Plus, Advance o Pro para
    /// sacarse límites y bajar la comisión por cobro. Gratuito no se guarda como suscripción: es lo que
    /// tiene cualquier negocio sin un plan pago vigente (PlanEntitlementService).
    /// </summary>
    public static class PlanCatalog
    {
        public const string Free = "free";
        public const string Plus = "plus";
        public const string Advance = "advance";
        /// <summary>
        /// Pro de freemium ($30.000). Código nuevo para no tocar el "pro" que ya pagan los clientes actuales
        /// (con su propio plan de débito en MP): ese queda oculto pero vigente para quien lo tiene. Con guion
        /// bajo y no medio porque el código va dentro del product id de Apple (com.ericfrick.turnospro.pro_v2.mensual).
        /// </summary>
        public const string Pro = "pro_v2";
        public const string LegacyPro = "pro";

        /// <summary>Los cuatro planes que se ofrecen, en orden.</summary>
        public static readonly string[] Codes = { Free, Plus, Advance, Pro };

        /// <summary>Planes que se crean al arrancar si no existen (después los edita el super admin).</summary>
        public static SubscriptionPlan[] Seeds() => new[]
        {
            new SubscriptionPlan
            {
                Code = Free, Name = "Gratuito", Tagline = "Para empezar a recibir reservas online.",
                Description = "Gratis siempre. Sin tarjeta.",
                Price = 0, Currency = "ARS", TrialDays = 0, DisplayOrder = 0,
                MaxBookingsPerMonth = 100, MaxStaff = 3, MaxServicesPerStaff = 1,
                CommissionPercent = 5m,
                AllowReminders = false, AllowWhatsApp = false, WhatsAppMonthlyLimit = 0,
                MaxRecurringBookings = 0, MaxCustomFields = 0,
                AllowCoupons = false, AllowTransferDetection = false, AllowCustomerHistory = false, AllowTrackingPixels = false,
                AllowExpenses = false, AllowCustomBranding = false,
            },
            new SubscriptionPlan
            {
                Code = Plus, Name = "Plus", Tagline = "Un plus en la gestión de tus reservas.",
                Price = 8000m, Currency = "ARS", TrialDays = 0, DisplayOrder = 1,
                MaxBookingsPerMonth = 200, MaxStaff = 5, MaxServicesPerStaff = -1,
                CommissionPercent = 2m,
                AllowReminders = true, AllowWhatsApp = true, WhatsAppMonthlyLimit = 30,
                MaxRecurringBookings = 0, MaxCustomFields = 0,
                AllowCoupons = false, AllowTransferDetection = false, AllowCustomerHistory = false, AllowTrackingPixels = false,
                AllowCustomBranding = true,
            },
            new SubscriptionPlan
            {
                Code = Advance, Name = "Advance", Tagline = "Para ordenar y automatizar todas tus reservas.",
                Price = 18000m, Currency = "ARS", TrialDays = 0, DisplayOrder = 2, IsPopular = true,
                MaxBookingsPerMonth = -1, MaxStaff = -1, MaxServicesPerStaff = -1,
                CommissionPercent = 1m,
                AllowReminders = true, AllowWhatsApp = true, WhatsAppMonthlyLimit = 100,
                MaxRecurringBookings = 10, MaxCustomFields = 1,
                AllowCoupons = true, AllowTransferDetection = true, AllowCustomerHistory = false, AllowTrackingPixels = false,
                AllowCustomBranding = true,
            },
            new SubscriptionPlan
            {
                Code = Pro, Name = "Pro", Tagline = "Sin límites ni fricciones.",
                Price = 30000m, Currency = "ARS", TrialDays = 0, DisplayOrder = 3,
                MaxBookingsPerMonth = -1, MaxStaff = -1, MaxServicesPerStaff = -1,
                CommissionPercent = 0m,
                AllowReminders = true, AllowWhatsApp = true, WhatsAppMonthlyLimit = 250,
                MaxRecurringBookings = -1, MaxCustomFields = -1,
                AllowCoupons = true, AllowTransferDetection = true, AllowCustomerHistory = true, AllowTrackingPixels = true,
                AllowCustomBranding = true, AllowMultiLocation = true,
            },
        };
    }
}
