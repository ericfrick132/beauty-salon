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

        // PKCE parameters
        [MaxLength(256)]
        public string? CodeVerifier { get; set; }

        [MaxLength(256)]
        public string? CodeChallenge { get; set; }

        [MaxLength(10)]
        public string? CodeChallengeMethod { get; set; } // e.g., S256 or plain

        /// <summary>
        /// Desde dónde se inició la vinculación: "web" (panel) o "app" (apps móviles).
        /// Define a dónde vuelve el callback: a la web o al deep link de la app.
        /// </summary>
        [Required, MaxLength(10)]
        public string ClientMode { get; set; } = MercadoPagoOAuthClientModes.Web;

        /// <summary>Usuario del tenant que inició la vinculación.</summary>
        public Guid? InitiatedByUserId { get; set; }

        
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

        /// <summary>
        /// Cómo se conectó la cuenta: null/"oauth" = OAuth con la app de la plataforma (Argentina, con refresh
        /// y marketplace_fee); "credentials" = el negocio pegó el Access Token de su propia cuenta MP de
        /// Uruguay/México. Ese token no vence ni se refresca, y como no pasa por nuestra app no lleva
        /// marketplace_fee.
        /// </summary>
        [MaxLength(20)]
        public string? ConnectionMode { get; set; }

        /// <summary>Sitio de MP de la cuenta (MLA, MLU, MLM), de /users/me.</summary>
        [MaxLength(10)]
        public string? SiteId { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public bool IsCredentialsMode => MercadoPagoConnectionModes.IsCredentials(ConnectionMode);
    }
}

namespace BookingPro.API.Models.Entities
{
    public static class MercadoPagoConnectionModes
    {
        public const string OAuth = "oauth";
        public const string Credentials = "credentials";

        /// <summary>
        /// Vencimiento que se guarda para los tokens pegados a mano: no vencen (MP los invalida solo si el
        /// negocio los regenera), así que nunca entran en la ventana de refresh.
        /// </summary>
        public static readonly DateTime NeverExpires = new(2100, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        public static bool IsCredentials(string? mode) =>
            string.Equals(mode?.Trim(), Credentials, StringComparison.OrdinalIgnoreCase);
    }

    public static class MercadoPagoOAuthClientModes
    {
        public const string Web = "web";
        public const string App = "app";

        /// <summary>Normaliza lo que manda el cliente; cualquier valor desconocido es web.</summary>
        public static string Normalize(string? value) =>
            string.Equals(value?.Trim(), App, StringComparison.OrdinalIgnoreCase) ? App : Web;
    }
}
