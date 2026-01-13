using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class CreateInvitationDto
    {
        [Required]
        public string VerticalCode { get; set; } = string.Empty;
        
        public string? PlanCode { get; set; }
        
        [Required, MaxLength(100)]
        public string Subdomain { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string BusinessName { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? BusinessAddress { get; set; }
        
        [Required, EmailAddress, MaxLength(255)]
        public string AdminEmail { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? AdminPhone { get; set; }
        
        [MaxLength(100)]
        public string? TimeZone { get; set; } = "UTC";
        
        [MaxLength(10)]
        public string? Currency { get; set; } = "USD";
        
        [MaxLength(10)]
        public string? Language { get; set; } = "en";
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        public bool IsDemo { get; set; } = false;
        public int DemoDays { get; set; } = 7;
        public int ExpiresInDays { get; set; } = 30;
    }

    public class InvitationResponseDto
    {
        public Guid Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public string Subdomain { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
        public string? BusinessAddress { get; set; }
        public string AdminEmail { get; set; } = string.Empty;
        public string? AdminPhone { get; set; }
        public string? TimeZone { get; set; }
        public string? Currency { get; set; }
        public string? Language { get; set; }
        public string? Notes { get; set; }
        public bool IsDemo { get; set; }
        public int DemoDays { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime? UsedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        
        public string VerticalName { get; set; } = string.Empty;
        public string? PlanName { get; set; }
        public string InvitationUrl { get; set; } = string.Empty;
    }

    public class AcceptInvitationDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string LastName { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [Required, MinLength(8)]
        public string Password { get; set; } = string.Empty;
        
        [Required]
        [Compare("Password", ErrorMessage = "Las contraseñas no coinciden")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class InvitationDetailsDto
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string? BusinessAddress { get; set; }
        public string Subdomain { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string? AdminPhone { get; set; }
        public string? TimeZone { get; set; }
        public string? Currency { get; set; }
        public string? Language { get; set; }
        public bool IsDemo { get; set; }
        public int DemoDays { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        
        public string VerticalName { get; set; } = string.Empty;
        public string VerticalCode { get; set; } = string.Empty;
        public string VerticalDomain { get; set; } = string.Empty;
        public string? PlanName { get; set; }
        public decimal? PlanPrice { get; set; }
        public string? PlanFeatures { get; set; }
    }

    public class CreateTenantDto
    {
        [Required]
        public string VerticalCode { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string Subdomain { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string BusinessName { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? BusinessAddress { get; set; }
        
        [Required, EmailAddress, MaxLength(255)]
        public string AdminEmail { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string AdminFirstName { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string AdminLastName { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? AdminPhone { get; set; }
        
        [Required, MinLength(8)]
        public string AdminPassword { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? TimeZone { get; set; } = "UTC";
        
        [MaxLength(10)]
        public string? Currency { get; set; } = "USD";
        
        [MaxLength(10)]
        public string? Language { get; set; } = "en";
        
        public bool IsDemo { get; set; } = false;
        public int? DemoDays { get; set; }
        public Guid? PlanId { get; set; }
    }
}