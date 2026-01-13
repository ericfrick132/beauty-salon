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
    }

    public class SubscriptionStatusDto
    {
        public bool IsActive { get; set; }
        public string PlanType { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public DateTime? ExpiresAt { get; set; }
        public decimal MonthlyAmount { get; set; }
        public int DaysRemaining { get; set; }
        public bool IsTrialPeriod { get; set; }
        public DateTime? TrialEndsAt { get; set; }
        public string? PaymentUrl { get; set; }
        public string? QrCodeData { get; set; }
        public DateTime CreatedAt { get; set; }
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