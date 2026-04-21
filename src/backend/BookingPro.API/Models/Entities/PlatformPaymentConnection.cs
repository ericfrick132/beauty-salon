using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// OAuth connection to Eric's MP/Stripe account that receives subscription payments
    /// from tenants. Global (not tenant-scoped). Linked from super admin → /super-admin/payments.
    /// Different from PaymentConfiguration / MercadoPagoOAuth which are per-tenant for bookings.
    /// </summary>
    public class PlatformPaymentConnection
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(20)]
        public string ProviderCode { get; set; } = string.Empty;

        [Required, MaxLength(2000)]
        public string AccessToken { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? RefreshToken { get; set; }

        [MaxLength(500)]
        public string? PublicKey { get; set; }

        [MaxLength(100)]
        public string? ExternalAccountId { get; set; }

        [MaxLength(255)]
        public string? AccountEmail { get; set; }

        [MaxLength(500)]
        public string? Scope { get; set; }

        public DateTime? ExpiresAt { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DisconnectedAt { get; set; }
    }
}
