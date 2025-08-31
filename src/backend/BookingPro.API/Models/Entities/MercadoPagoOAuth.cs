using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// OAuth flow state for MercadoPago connections
    /// </summary>
    public class MercadoPagoOAuthState : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(500)]
        public string State { get; set; } = string.Empty; // tenant_{tenantId}_{randomString}
        
        [MaxLength(1000)]
        public string? AuthorizationUrl { get; set; }
        
        public bool IsCompleted { get; set; } = false;
        public bool IsExpired { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(15); // OAuth states expire in 15 min
        
        // OAuth response data
        [MaxLength(500)]
        public string? AuthorizationCode { get; set; }
        
        public DateTime? CompletedAt { get; set; }
        
        public string? ErrorCode { get; set; }
        public string? ErrorDescription { get; set; }
    }

    /// <summary>
    /// Enhanced MercadoPago configuration with OAuth support
    /// </summary>
    public class MercadoPagoOAuthConfiguration : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        // OAuth data
        [Required, MaxLength(255)]
        public string MercadoPagoUserId { get; set; } = string.Empty; // user_id from MP
        
        [Required, MaxLength(1000)]
        public string AccessToken { get; set; } = string.Empty; // Encrypted
        
        [MaxLength(1000)]
        public string? RefreshToken { get; set; } // Encrypted
        
        public DateTime AccessTokenExpiresAt { get; set; }
        public DateTime? RefreshTokenExpiresAt { get; set; }
        
        // Account info from MP
        [MaxLength(255)]
        public string? AccountEmail { get; set; }
        
        [MaxLength(255)]
        public string? AccountNickname { get; set; }
        
        [MaxLength(100)]
        public string? CountryId { get; set; } // AR, BR, etc.
        
        [MaxLength(10)]
        public string? CurrencyId { get; set; } // ARS, BRL, etc.
        
        // Connection status
        public bool IsActive { get; set; } = true;
        public bool IsTestMode { get; set; } = false;
        
        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastUsedAt { get; set; }
        public DateTime? DisconnectedAt { get; set; }
        
        // Token refresh tracking
        public DateTime? LastRefreshAt { get; set; }
        public int RefreshAttempts { get; set; } = 0;
        public string? LastRefreshError { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Public key for frontend (no encryption needed)
        [MaxLength(500)]
        public string? PublicKey { get; set; }
    }
}