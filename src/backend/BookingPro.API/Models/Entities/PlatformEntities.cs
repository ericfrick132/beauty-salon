using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Configuración de MercadoPago de la plataforma para cobrar a los tenants (B2B)
    /// </summary>
    [Table("platform_mercadopago_config", Schema = "public")]
    public class PlatformMercadoPagoConfiguration
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(500)]
        public string AccessToken { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? RefreshToken { get; set; }
        
        [MaxLength(200)]
        public string? PublicKey { get; set; }
        
        [MaxLength(100)]
        public string? UserId { get; set; }
        
        public bool IsSandbox { get; set; } = true;
        public bool IsActive { get; set; } = false;
        
        public DateTime? TokenExpiresAt { get; set; }
        public DateTime? ConnectedAt { get; set; }
        public DateTime? DisconnectedAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Pagos de suscripción de tenants a la plataforma (B2B)
    /// </summary>
    [Table("tenant_subscription_payments", Schema = "public")]
    public class TenantSubscriptionPayment
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        
        [MaxLength(255)]
        public string? PlatformPaymentId { get; set; }
        
        [MaxLength(255)]
        public string? PreferenceId { get; set; }
        
        public decimal Amount { get; set; }
        
        [Required, MaxLength(50)]
        public string Period { get; set; } = string.Empty; // "monthly", "quarterly", "annual"
        
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = "pending"; // "pending", "approved", "rejected", "expired"
        
        [MaxLength(255)]
        public string? PayerEmail { get; set; }
        
        [MaxLength(100)]
        public string? PaymentMethod { get; set; }
        
        [MaxLength(500)]
        public string? FailureReason { get; set; }
        
        public DateTime? PaidAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Tenant Tenant { get; set; } = null!;
    }
}