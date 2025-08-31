using System;
using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;
using BookingPro.API.Models.Enums;

namespace BookingPro.API.Models.Entities
{
    public class Subscription : ITenantEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        
        // Plan details
        [Required, MaxLength(50)]
        public string PlanType { get; set; } = string.Empty; // "basic", "pro", "enterprise"
        public decimal MonthlyAmount { get; set; }
        
        // MercadoPago data
        [MaxLength(255)]
        public string? MercadoPagoPreapprovalId { get; set; }
        
        [MaxLength(255)]
        public string? MercadoPagoPreapprovalPlanId { get; set; }
        
        [MaxLength(255)]
        public string? PayerEmail { get; set; }
        
        // Status
        [Required, MaxLength(50)]
        public string Status { get; set; } = SubscriptionStatus.Pending.ToString().ToLower();
        public DateTime? ActivatedAt { get; set; }
        public DateTime? NextPaymentDate { get; set; }
        public DateTime? CancelledAt { get; set; }
        
        [MaxLength(500)]
        public string? CancellationReason { get; set; }
        
        // Trial information
        public bool IsTrialPeriod { get; set; } = true;
        public DateTime? TrialEndsAt { get; set; }
        
        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Tenant Tenant { get; set; } = null!;
        public virtual ICollection<SubscriptionPayment> Payments { get; set; } = new List<SubscriptionPayment>();
    }
}