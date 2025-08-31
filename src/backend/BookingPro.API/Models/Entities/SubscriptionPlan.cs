using System;
using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    public class SubscriptionPlan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty; // "basic", "pro", "enterprise"
        
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public decimal Price { get; set; }
        
        [MaxLength(10)]
        public string Currency { get; set; } = "ARS";
        
        // Features
        public int MaxBookingsPerMonth { get; set; } = -1; // -1 means unlimited
        public int MaxServices { get; set; } = -1;
        public int MaxStaff { get; set; } = -1;
        public int MaxCustomers { get; set; } = -1;
        public bool AllowOnlinePayments { get; set; } = true;
        public bool AllowCustomBranding { get; set; } = false;
        public bool AllowSmsNotifications { get; set; } = false;
        public bool AllowEmailMarketing { get; set; } = false;
        public bool AllowReports { get; set; } = true;
        public bool AllowMultiLocation { get; set; } = false;
        
        // WhatsApp configuration
        public bool AllowWhatsApp { get; set; } = false;
        public int WhatsAppMonthlyLimit { get; set; } = 0; // 0 means no WhatsApp, -1 unlimited
        public decimal WhatsAppExtraMessageCost { get; set; } = 0; // Cost per message after limit
        
        // MercadoPago integration
        [MaxLength(255)]
        public string? MercadoPagoPreapprovalPlanId { get; set; }
        
        // Trial configuration
        public int TrialDays { get; set; } = 14;
        
        // Status
        public bool IsActive { get; set; } = true;
        public bool IsPopular { get; set; } = false; // To highlight a plan in UI
        
        // Order for display
        public int DisplayOrder { get; set; } = 0;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}