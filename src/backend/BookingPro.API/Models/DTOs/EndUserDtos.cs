using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    // === End User Registration ===
    public class RegisterEndUserDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
    }

    public class EndUserResponseDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string? LastName { get; set; }
        public string? Phone { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DemoEndsAt { get; set; }
        public DateTime? MembershipEndsAt { get; set; }
        public string? CurrentPlanType { get; set; }
        public decimal? CurrentPlanAmount { get; set; }
        public int DaysRemaining { get; set; }
        public bool HasActiveAccess { get; set; }
    }

    // === Tenant Plans ===
    public class CreateTenantPlanDto
    {
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required]
        public decimal Price { get; set; }
        
        [MaxLength(10)]
        public string Currency { get; set; } = "ARS";
        
        [Required]
        public int DurationDays { get; set; }
        
        public decimal? DiscountPercentage { get; set; }
        public int DisplayOrder { get; set; } = 0;
        public bool IsMostPopular { get; set; } = false;
    }

    public class TenantPlanResponseDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = string.Empty;
        public int DurationDays { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public bool IsActive { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsMostPopular { get; set; }
    }

    // === Subscription Flow ===
    public class CreateEndUserSubscriptionDto
    {
        [Required]
        public Guid PlanId { get; set; }
        
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        public string FirstName { get; set; } = string.Empty;
        
        public string? LastName { get; set; }
        public string? Phone { get; set; }
    }

    public class EndUserSubscriptionResponseDto
    {
        public Guid MembershipId { get; set; }
        public string PaymentLink { get; set; } = string.Empty;
        public string PreferenceId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string QrCode { get; set; } = string.Empty;
        public string DeepLink { get; set; } = string.Empty;
    }

    // === Renewal ===
    public class CreateRenewalPaymentDto
    {
        [Required]
        public Guid EndUserId { get; set; }
        
        [Required]
        public Guid PlanId { get; set; }
    }

    public class RenewalPaymentResponseDto
    {
        public string PaymentLink { get; set; } = string.Empty;
        public string PreferenceId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string QrCode { get; set; } = string.Empty;
    }

    // === Status and Analytics ===
    public class EndUserStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public bool HasActiveAccess { get; set; }
        public DateTime? AccessExpiresAt { get; set; }
        public int DaysRemaining { get; set; }
        public string? CurrentPlanType { get; set; }
        public decimal? CurrentPlanAmount { get; set; }
        public bool InDemoMode { get; set; }
        public DateTime? DemoEndsAt { get; set; }
        public string? RenewalPaymentLink { get; set; }
        public bool RequiresPayment { get; set; }
    }

    // === B2B Platform Payments ===
    public class CreateTenantSubscriptionPaymentDto
    {
        [Required]
        public Guid TenantId { get; set; }
        
        [Required, MaxLength(50)]
        public string Period { get; set; } = string.Empty; // "monthly", "quarterly", "annual"
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required, EmailAddress]
        public string PayerEmail { get; set; } = string.Empty;
    }

    public class TenantSubscriptionPaymentResponseDto
    {
        public Guid PaymentId { get; set; }
        public string PaymentLink { get; set; } = string.Empty;
        public string PreferenceId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string Period { get; set; } = string.Empty;
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
    }

    // === B2B Manual Payment DTO ===
    public class RecordManualTenantPaymentDto
    {
        [Required]
        public Guid TenantId { get; set; }

        // Plan de suscripción seleccionado
        [Required]
        public Guid PlanId { get; set; }

        [Required]
        public decimal Amount { get; set; }

        [Required, MaxLength(50)]
        public string Period { get; set; } = "monthly"; // monthly | quarterly | annual

        // Fecha de inicio del período (UTC). Si no se envía, usa DateTime.UtcNow
        public DateTime? PeriodStart { get; set; }

        // Fecha de pago efectiva (UTC). Si no se envía, usa DateTime.UtcNow
        public DateTime? PaidAt { get; set; }

        // Email del pagador (opcional, para registro)
        [EmailAddress]
        public string? PayerEmail { get; set; }
    }

    // === Email Templates ===
    public class EmailTemplateDto
    {
        public string Template { get; set; } = string.Empty; // "welcome", "day3", "day5", "day7", "renewal-reminder", "expired"
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public Dictionary<string, string> Variables { get; set; } = new();
    }
}
