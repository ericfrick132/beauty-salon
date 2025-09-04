using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class ImpersonationResult
    {
        public string Token { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public string TenantSubdomain { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminName { get; set; } = string.Empty;
        public string RedirectUrl { get; set; } = string.Empty;
    }

    public class ImpersonateTenantRequest
    {
        [Required]
        public Guid TenantId { get; set; }
    }

    public class SuperAdminTenantListDto
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string Subdomain { get; set; } = string.Empty;
        public string Vertical { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int AdminCount { get; set; }
        public int BookingCount { get; set; }
        public string? LastActivity { get; set; }
    }
}