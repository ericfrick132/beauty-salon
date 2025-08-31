using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Usuario final del tenant (cliente del negocio)
    /// </summary>
    public class EndUser : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(255)]
        public string Email { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        // Estados específicos del modelo SaaS
        [Required, MaxLength(50)]
        public string Status { get; set; } = "VISITANTE"; 
        // VISITANTE, DEMO_ACTIVO, DEMO_EXPIRADO, PAGÓ_ACTIVO, POR_VENCER, VENCIDO, SUSPENDIDO
        
        // Demo period tracking
        public DateTime? DemoStartedAt { get; set; }
        public DateTime? DemoEndsAt { get; set; }
        
        // Membership tracking  
        public DateTime? MembershipStartedAt { get; set; }
        public DateTime? MembershipEndsAt { get; set; }
        
        // Plan information
        [MaxLength(50)]
        public string? CurrentPlanType { get; set; } // "monthly", "quarterly", "annual"
        
        public decimal? CurrentPlanAmount { get; set; }
        
        // Renewal tracking
        public DateTime? LastRenewalReminderSentAt { get; set; }
        public int RenewalReminderCount { get; set; } = 0;
        
        // Email automation tracking
        public DateTime? WelcomeEmailSentAt { get; set; }
        public DateTime? Day3EmailSentAt { get; set; }
        public DateTime? Day5EmailSentAt { get; set; }
        public DateTime? Day7EmailSentAt { get; set; }
        
        // Recovery emails
        public DateTime? RecoveryEmailSentAt { get; set; }
        public int RecoveryEmailCount { get; set; } = 0;
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Membership> Memberships { get; set; } = new List<Membership>();
        public ICollection<EndUserPayment> Payments { get; set; } = new List<EndUserPayment>();
    }

    /// <summary>
    /// Plans que el tenant ofrece a sus usuarios finales
    /// </summary>
    public class TenantPlan : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty; // "monthly", "quarterly", "annual"
        
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public decimal Price { get; set; }
        
        [MaxLength(10)]
        public string Currency { get; set; } = "ARS";
        
        public int DurationDays { get; set; } // 30, 90, 365
        
        // Discount for longer periods
        public decimal? DiscountPercentage { get; set; }
        
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
        public bool IsMostPopular { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Membership> Memberships { get; set; } = new List<Membership>();
    }

    /// <summary>
    /// Membresía activa de un usuario final
    /// </summary>
    public class Membership : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid EndUserId { get; set; }
        public Guid PlanId { get; set; }
        
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = "active"; // "active", "expired", "suspended", "cancelled"
        
        public decimal AmountPaid { get; set; }
        
        // Payment tracking
        [MaxLength(255)]
        public string? PaymentId { get; set; }
        [MaxLength(255)] 
        public string? PreferenceId { get; set; }
        
        // Renewal management
        public bool IsAutoRenewal { get; set; } = false; // Manual by default
        public DateTime? NextRenewalDate { get; set; }
        public DateTime? RenewalLinkGeneratedAt { get; set; }
        [MaxLength(500)]
        public string? RenewalPaymentLink { get; set; }
        
        // Reminder tracking
        public DateTime? RenewalReminder3DaysSentAt { get; set; }
        public DateTime? RenewalReminder1DaySentAt { get; set; }
        public DateTime? ExpirationNoticeSentAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual EndUser EndUser { get; set; } = null!;
        public virtual TenantPlan Plan { get; set; } = null!;
        public ICollection<EndUserPayment> Payments { get; set; } = new List<EndUserPayment>();
    }

    /// <summary>
    /// Pagos de usuarios finales (B2C)
    /// </summary>
    public class EndUserPayment : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid EndUserId { get; set; }
        public Guid? MembershipId { get; set; }
        public Guid PlanId { get; set; }
        
        public decimal Amount { get; set; }
        
        [MaxLength(10)]
        public string Currency { get; set; } = "ARS";
        
        [MaxLength(50)]
        public string Status { get; set; } = "pending"; // "pending", "approved", "rejected", "refunded"
        
        [MaxLength(50)]
        public string PaymentType { get; set; } = "subscription"; // "subscription", "renewal"
        
        // MercadoPago data
        [MaxLength(255)]
        public string? MercadoPagoPaymentId { get; set; }
        [MaxLength(255)]
        public string? PreferenceId { get; set; }
        [MaxLength(500)]
        public string? PaymentLink { get; set; }
        
        [MaxLength(100)]
        public string? PaymentMethod { get; set; }
        [MaxLength(500)]
        public string? FailureReason { get; set; }
        
        // External reference for tracking
        [MaxLength(255)]
        public string ExternalReference { get; set; } = string.Empty;
        
        public DateTime? PaidAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual EndUser EndUser { get; set; } = null!;
        public virtual Membership? Membership { get; set; }
        public virtual TenantPlan Plan { get; set; } = null!;
    }
}