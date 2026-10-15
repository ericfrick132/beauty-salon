using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    /// <summary>
    /// Request to initiate OAuth flow
    /// </summary>
    public class InitiateMercadoPagoOAuthDto
    {
        [MaxLength(1000)]
        public string? RedirectUrl { get; set; } // Optional custom redirect

        /// <summary>
        /// "app" cuando lo inician las apps móviles: el callback vuelve al deep link
        /// (turnospro://mercadopago?status=...). Sin valor o cualquier otro valor = web.
        /// </summary>
        [MaxLength(10)]
        public string? Client { get; set; }
    }

    /// <summary>
    /// Response with OAuth authorization URL
    /// </summary>
    public class MercadoPagoOAuthUrlDto
    {
        public string AuthorizationUrl { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    /// <summary>
    /// OAuth callback data from MercadoPago
    /// </summary>
    public class MercadoPagoOAuthCallbackDto
    {
        [Required]
        public string Code { get; set; } = string.Empty;
        
        [Required]
        public string State { get; set; } = string.Empty;
        
        public string? Error { get; set; }
        public string? ErrorDescription { get; set; }
    }

    /// <summary>
    /// MercadoPago token response
    /// </summary>
    public class MercadoPagoTokenResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public int ExpiresIn { get; set; } // seconds
        public string TokenType { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
    }

    /// <summary>
    /// MercadoPago user info response
    /// </summary>
    public class MercadoPagoUserInfoDto
    {
        public string Id { get; set; } = string.Empty;
        public string Nickname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string CountryId { get; set; } = string.Empty;
        public string CurrencyId { get; set; } = string.Empty;
        public string SiteId { get; set; } = string.Empty;
        public bool SiteStatus { get; set; }
    }

    /// <summary>
    /// Conexión por credenciales (Uruguay/México): el negocio pega el Access Token (y opcionalmente la
    /// Public Key) de su propia cuenta de Mercado Pago, sacados de "Tus integraciones" en MP Developers.
    /// </summary>
    public class ConnectMercadoPagoCredentialsDto
    {
        [Required, MaxLength(500)]
        public string AccessToken { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? PublicKey { get; set; }
    }

    /// <summary>
    /// Current OAuth connection status
    /// </summary>
    public class MercadoPagoConnectionStatusDto
    {
        public bool IsConnected { get; set; }
        public string? AccountEmail { get; set; }
        public string? AccountNickname { get; set; }
        public string? CountryId { get; set; }
        public string? CurrencyId { get; set; }
        public DateTime? ConnectedAt { get; set; }
        public DateTime? AccessTokenExpiresAt { get; set; }
        public bool NeedsRefresh { get; set; }
        public bool IsTestMode { get; set; }
        public string? LastError { get; set; }
        /// <summary>"oauth" o "credentials".</summary>
        public string ConnectionMode { get; set; } = "oauth";
        public string? SiteId { get; set; }
        public bool HasPublicKey { get; set; }
    }

    /// <summary>
    /// Request to disconnect OAuth
    /// </summary>
    public class DisconnectMercadoPagoDto
    {
        public bool ConfirmDisconnect { get; set; } = false;
    }

    /// <summary>
    /// OAuth configuration for platform
    /// </summary>
    public class PlatformOAuthConfigDto
    {
        [Required]
        public string ClientId { get; set; } = string.Empty;
        
        [Required]
        public string ClientSecret { get; set; } = string.Empty;
        
        [Required]
        public string RedirectUri { get; set; } = string.Empty;
        
        public bool IsTestMode { get; set; } = false;
    }
}