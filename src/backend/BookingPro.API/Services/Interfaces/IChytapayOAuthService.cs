using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// OAuth flow for connecting tenant Chytapay accounts. Mirrors
    /// IMercadoPagoOAuthService.
    /// </summary>
    public interface IChytapayOAuthService
    {
        Task<ServiceResult<ChytapayOAuthUrlDto>> InitiateOAuthFlowAsync(InitiateChytapayOAuthDto dto);
        Task<ServiceResult<bool>> ProcessOAuthCallbackAsync(ChytapayOAuthCallbackDto dto);
        Task<ServiceResult<ChytapayConnectionStatusDto>> GetConnectionStatusAsync();
        Task<ServiceResult<bool>> RefreshAccessTokenAsync(Guid? tenantId = null);
        Task<ServiceResult<bool>> DisconnectOAuthAsync(DisconnectChytapayDto dto);
        Task<ServiceResult<string>> GetValidAccessTokenAsync(Guid? tenantId = null);
        Task<ServiceResult<Guid>> ValidateOAuthStateAsync(string state);
        Task<ServiceResult<int>> RefreshExpiringTokensAsync();
        Task<ServiceResult<bool>> TestConnectionAsync();
    }
}
