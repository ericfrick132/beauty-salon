using System;

namespace BookingPro.API.Models.DTOs
{
    public class CreateSubscriptionDto
    {
        public string PlanCode { get; set; } = string.Empty;
        public string? CardToken { get; set; } // Si usas Checkout API
    }

    public class SubscriptionResponseDto
    {
        public Guid Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PlanType { get; set; } = string.Empty;
        public decimal MonthlyAmount { get; set; }
        public DateTime? NextPaymentDate { get; set; }
        public string? InitPoint { get; set; } // URL para suscribirse
        public string? QrCode { get; set; } // QR code data URL for payment

        /// <summary>
        /// El tenant ya tenía débito automático: no se creó nada, se cambió el plan de su preapproval.
        /// </summary>
        public bool PlanChanged { get; set; }
        public string? PlanName { get; set; }
        public string? Currency { get; set; }
    }

    public class SubscriptionStatusDto
    {
        /// <summary>
        /// Puede usar el sistema. Freemium: siempre true (sin plan pago está en Gratuito); se mantiene para las
        /// apps y versiones del panel que bloqueaban con false. Para saber si paga, usar IsPaid.
        /// </summary>
        public bool IsActive { get; set; }

        /// <summary>Tiene un plan pago vigente (MP, Stripe, Apple, Google Play o pago manual). False = Gratuito.</summary>
        public bool IsPaid { get; set; }
        public string PlanType { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public DateTime? ExpiresAt { get; set; }
        public decimal MonthlyAmount { get; set; }
        public int DaysRemaining { get; set; }
        public bool IsTrialPeriod { get; set; }

        /// <summary>
        /// La suscripción tiene una compra de Apple (In-App Purchase) vigente. La app de iOS lo usa
        /// para marcar el plan actual.
        /// </summary>
        public bool AppleSubscriptionActive { get; set; }

        /// <summary>
        /// La suscripción tiene una compra de Google Play (app Android) vigente: se gestiona y cancela
        /// desde Play, no desde Mercado Pago. Con el producto y el plan base para marcar el plan actual.
        /// </summary>
        public bool GooglePlaySubscriptionActive { get; set; }
        public string? GooglePlayProductId { get; set; }
        public string? GooglePlayBasePlanId { get; set; }
        public bool? GooglePlayAutoRenewing { get; set; }
        public DateTime? TrialEndsAt { get; set; }
        public string? PaymentUrl { get; set; }
        public string? QrCodeData { get; set; }
        public DateTime CreatedAt { get; set; }
        public PlanFeaturesDto? Features { get; set; }

        /// <summary>
        /// Trial:RequireCard. Con false la prueba corre sin tarjeta: el panel no rebota a /empezar
        /// mientras la prueba esté vigente (la tarjeta / el pago son opcionales hasta que vence).
        /// </summary>
        public bool RequireCard { get; set; }

        /// <summary>El tenant está en prueba (Status "trial"): todavía no pagó ni se le activó un plan.</summary>
        public bool TenantInTrial { get; set; }

        /// <summary>Tiene un débito automático (preapproval) autorizado en Mercado Pago.</summary>
        public bool HasCard { get; set; }
    }

    public class PlanFeaturesDto
    {
        public int MaxBookingsPerMonth { get; set; }
        public int MaxServices { get; set; }
        public int MaxStaff { get; set; }
        public int MaxCustomers { get; set; }
        public bool AllowOnlinePayments { get; set; }
        public bool AllowCustomBranding { get; set; }
        public bool AllowSmsNotifications { get; set; }
        public bool AllowEmailMarketing { get; set; }
        public bool AllowReports { get; set; }
        public bool AllowMultiLocation { get; set; }
        public bool AllowWhatsApp { get; set; }
        public int WhatsAppMonthlyLimit { get; set; }
        public decimal WhatsAppExtraMessageCost { get; set; }

        // Freemium
        public decimal CommissionPercent { get; set; }
        public int MaxServicesPerStaff { get; set; }
        public bool AllowReminders { get; set; }
        public int MaxRecurringBookings { get; set; }
        public int MaxCustomFields { get; set; }
        public bool AllowCoupons { get; set; }
        public bool AllowTransferDetection { get; set; }
        public bool AllowCustomerHistory { get; set; }
        public bool AllowTrackingPixels { get; set; }

        public static PlanFeaturesDto From(BookingPro.API.Models.Entities.SubscriptionPlan plan) => new()
        {
            MaxBookingsPerMonth = plan.MaxBookingsPerMonth,
            MaxServices = plan.MaxServices,
            MaxStaff = plan.MaxStaff,
            MaxCustomers = plan.MaxCustomers,
            AllowOnlinePayments = plan.AllowOnlinePayments,
            AllowCustomBranding = plan.AllowCustomBranding,
            AllowSmsNotifications = plan.AllowSmsNotifications,
            AllowEmailMarketing = plan.AllowEmailMarketing,
            AllowReports = plan.AllowReports,
            AllowMultiLocation = plan.AllowMultiLocation,
            AllowWhatsApp = plan.AllowWhatsApp,
            WhatsAppMonthlyLimit = plan.WhatsAppMonthlyLimit,
            WhatsAppExtraMessageCost = plan.WhatsAppExtraMessageCost,
            CommissionPercent = plan.CommissionPercent,
            MaxServicesPerStaff = plan.MaxServicesPerStaff,
            AllowReminders = plan.AllowReminders,
            MaxRecurringBookings = plan.MaxRecurringBookings,
            MaxCustomFields = plan.MaxCustomFields,
            AllowCoupons = plan.AllowCoupons,
            AllowTransferDetection = plan.AllowTransferDetection,
            AllowCustomerHistory = plan.AllowCustomerHistory,
            AllowTrackingPixels = plan.AllowTrackingPixels,
        };
    }

    public class SubscriptionPlanDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = string.Empty;
        public int MaxBookingsPerMonth { get; set; }
        public int MaxServices { get; set; }
        public int MaxStaff { get; set; }
        public int MaxCustomers { get; set; }
        public bool AllowOnlinePayments { get; set; }
        public bool AllowCustomBranding { get; set; }
        public bool AllowSmsNotifications { get; set; }
        public bool AllowEmailMarketing { get; set; }
        public bool AllowReports { get; set; }
        public bool AllowMultiLocation { get; set; }
        public bool AllowWhatsApp { get; set; }
        public int WhatsAppMonthlyLimit { get; set; }
        public decimal WhatsAppExtraMessageCost { get; set; }
        public bool IsPopular { get; set; }
        public int TrialDays { get; set; }
        public string? Tagline { get; set; }
        public int DisplayOrder { get; set; }
        /// <summary>Todos los límites y features del plan (comisión, WhatsApp, recurrentes, cupones…).</summary>
        public PlanFeaturesDto? Features { get; set; }
    }

    public class SubscriptionWebhookDto
    {
        public string Type { get; set; } = string.Empty;
        public dynamic? Data { get; set; }
        public string? Action { get; set; }
        public string? UserId { get; set; }
        public DateTime? DateCreated { get; set; }
    }

    public class PaymentQRResultDto
    {
        public string? QrCode { get; set; }
        public string? PaymentUrl { get; set; }
    }
}