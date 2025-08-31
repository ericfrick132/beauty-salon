using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Service for handling MercadoPago OAuth flow for tenant integrations
    /// </summary>
    public interface IMercadoPagoOAuthService
    {
        /// <summary>
        /// Generates OAuth authorization URL for tenant to connect their MP account
        /// </summary>
        Task<ServiceResult<MercadoPagoOAuthUrlDto>> InitiateOAuthFlowAsync(InitiateMercadoPagoOAuthDto dto);
        
        /// <summary>
        /// Processes OAuth callback and exchanges code for tokens
        /// </summary>
        Task<ServiceResult<bool>> ProcessOAuthCallbackAsync(MercadoPagoOAuthCallbackDto dto);
        
        /// <summary>
        /// Gets current OAuth connection status for tenant
        /// </summary>
        Task<ServiceResult<MercadoPagoConnectionStatusDto>> GetConnectionStatusAsync();
        
        /// <summary>
        /// Refreshes expired access token using refresh token
        /// </summary>
        Task<ServiceResult<bool>> RefreshAccessTokenAsync(Guid? tenantId = null);
        
        /// <summary>
        /// Disconnects tenant's MercadoPago OAuth connection
        /// </summary>
        Task<ServiceResult<bool>> DisconnectOAuthAsync(DisconnectMercadoPagoDto dto);
        
        /// <summary>
        /// Gets valid access token for tenant (refreshes if needed)
        /// </summary>
        Task<ServiceResult<string>> GetValidAccessTokenAsync(Guid? tenantId = null);
        
        /// <summary>
        /// Configures platform OAuth settings (admin only)
        /// </summary>
        Task<ServiceResult<bool>> ConfigurePlatformOAuthAsync(PlatformOAuthConfigDto dto);
        
        /// <summary>
        /// Validates OAuth state parameter
        /// </summary>
        Task<ServiceResult<Guid>> ValidateOAuthStateAsync(string state);
        
        /// <summary>
        /// Background task to refresh tokens that are about to expire
        /// </summary>
        Task<ServiceResult<int>> RefreshExpiringTokensAsync();
        
        /// <summary>
        /// Gets account info from MercadoPago for connected tenant
        /// </summary>
        Task<ServiceResult<MercadoPagoUserInfoDto>> GetAccountInfoAsync();
        
        /// <summary>
        /// Tests the connection by making a simple API call
        /// </summary>
        Task<ServiceResult<bool>> TestConnectionAsync();
    }
}