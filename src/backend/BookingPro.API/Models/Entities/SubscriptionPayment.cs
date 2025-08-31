using System;
using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Enums;

namespace BookingPro.API.Models.Entities
{
    public class SubscriptionPayment
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public Guid SubscriptionId { get; set; }
        
        [Required, MaxLength(255)]
        public string MercadoPagoPaymentId { get; set; } = string.Empty;
        
        public decimal Amount { get; set; }
        
        [Required, MaxLength(50)]
        public string Status { get; set; } = SubscriptionPaymentStatus.Pending.ToString().ToLower();
        
        public DateTime PaymentDate { get; set; }
        
        [MaxLength(500)]
        public string? FailureReason { get; set; }
        
        [MaxLength(100)]
        public string? PaymentMethod { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Tenant Tenant { get; set; } = null!;
        public virtual Subscription Subscription { get; set; } = null!;
    }
}