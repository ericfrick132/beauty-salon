using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BookingPro.API.Models.Enums;

namespace BookingPro.API.Models.Entities
{
    // TABLAS COMPARTIDAS (public schema)
    
    [Table("verticals", Schema = "public")]
    public class Vertical
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty; // 'barbershop', 'beautysalon', 'aesthetics'
        
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required, MaxLength(255)]
        public string Domain { get; set; } = string.Empty;
        
        [Required]
        public string DefaultTheme { get; set; } = "{}"; // JSON
        
        [Required]
        public string DefaultServices { get; set; } = "[]"; // JSON
        
        [Required]
        public string Terminology { get; set; } = "{}"; // JSON
        
        [Required]
        public string Features { get; set; } = "{}"; // JSON
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
        public ICollection<Plan> Plans { get; set; } = new List<Plan>();
    }

    [Table("tenants", Schema = "public")]
    public class Tenant
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid VerticalId { get; set; }
        
        [Required, MaxLength(100)]
        public string Subdomain { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string BusinessName { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string OwnerEmail { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? OwnerPhone { get; set; }
        
        [MaxLength(500)]
        public string? BusinessAddress { get; set; }
        
        [MaxLength(100)]
        public string? TimeZone { get; set; } = "UTC";
        
        [MaxLength(10)]
        public string? Currency { get; set; } = "USD";
        
        [MaxLength(10)]
        public string? Language { get; set; } = "en";
        
        public bool IsDemo { get; set; } = false;
        public int? DemoDays { get; set; }
        public DateTime? DemoExpiresAt { get; set; }
        
        public Guid? PlanId { get; set; }
        
        [MaxLength(255)]
        public string? CustomDomain { get; set; }
        
        public string? ThemeOverrides { get; set; } // JSON
        
        public string Settings { get; set; } = "{}"; // JSON
        
        [Required, MaxLength(100)]
        public string SchemaName { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string Status { get; set; } = TenantStatus.Trial.ToString().ToLower();
        
        public DateTime? TrialEndsAt { get; set; }
        public DateTime? SuspendedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Vertical Vertical { get; set; } = null!;
        public Plan? Plan { get; set; }
        public ICollection<User> Users { get; set; } = new List<User>();
        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }

    [Table("plans", Schema = "public")]
    public class Plan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid VerticalId { get; set; }
        
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;
        
        [Required]
        public decimal PriceMonthly { get; set; }
        
        public decimal? PriceYearly { get; set; }
        
        [Required]
        public string Features { get; set; } = "{}"; // JSON
        
        [Required]
        public string Limits { get; set; } = "{}"; // JSON max_professionals, max_bookings, etc
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Vertical Vertical { get; set; } = null!;
        public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }

    [Table("users", Schema = "public")]
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid TenantId { get; set; }
        
        [Required, MaxLength(255)]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        public string PasswordHash { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? FirstName { get; set; }
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [Required, MaxLength(50)]
        public string Role { get; set; } = string.Empty;
        
        public bool IsActive { get; set; } = true;
        public DateTime? LastLogin { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Tenant Tenant { get; set; } = null!;
    }

    [Table("invitations", Schema = "public")]
    public class Invitation
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid VerticalId { get; set; }
        public Guid? PlanId { get; set; }
        
        [Required, MaxLength(255)]
        public string Token { get; set; } = string.Empty; // URL-safe token
        
        [Required, MaxLength(100)]
        public string Subdomain { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string BusinessName { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? BusinessAddress { get; set; }
        
        [Required, MaxLength(255)]
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
        
        public DateTime ExpiresAt { get; set; }
        public DateTime? UsedAt { get; set; }
        public Guid? CreatedTenantId { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = InvitationStatus.Pending.ToString().ToLower();
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Vertical Vertical { get; set; } = null!;
        public Plan? Plan { get; set; }
        public Tenant? CreatedTenant { get; set; }
    }

    // Messaging packages sold by platform (no tenant scope)
    public class MessagePackage
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "Paquete 100"

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; } // 100, 500, 1000

        [Range(0.01, double.MaxValue)]
        public decimal Price { get; set; } // total price for the package

        [Required, MaxLength(10)]
        public string Currency { get; set; } = "ARS";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
