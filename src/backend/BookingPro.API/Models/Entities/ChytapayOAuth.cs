using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// OAuth flow state for Chytapay connections — mirrors MercadoPagoOAuthState
    /// but without PKCE (Chytapay's OAuth docs don't reference PKCE).
    /// </summary>
    public class ChytapayOAuthState : ITenantEntity
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
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(15);

        [MaxLength(500)]
        public string? AuthorizationCode { get; set; }

        public DateTime? CompletedAt { get; set; }

        public string? ErrorCode { get; set; }
        public string? ErrorDescription { get; set; }
    }

    /// <summary>
    /// Per-tenant Chytapay OAuth configuration. Holds the idToken/refreshToken
    /// returned by /integration/oauth2/token so we can create payment requests
    /// on behalf of the tenant's Chytapay account.
    /// </summary>
    public class ChytapayOAuthConfiguration : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        // OAuth tokens — Chytapay calls the access token "idToken" in their docs.
        [Required, MaxLength(4000)]
        public string IdToken { get; set; } = string.Empty; // Encrypted (Base64)

        [MaxLength(4000)]
        public string? RefreshToken { get; set; } // Encrypted (Base64)

        public DateTime IdTokenExpiresAt { get; set; }

        // Connection status
        public bool IsActive { get; set; } = true;
        public bool IsTestMode { get; set; } = false;

        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastUsedAt { get; set; }
        public DateTime? DisconnectedAt { get; set; }

        public DateTime? LastRefreshAt { get; set; }
        public int RefreshAttempts { get; set; } = 0;
        public string? LastRefreshError { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
