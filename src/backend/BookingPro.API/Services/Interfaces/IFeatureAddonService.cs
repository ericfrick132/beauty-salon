using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    public interface IFeatureAddonService
    {
        Task EnsureSeedAsync();
        Task<bool> HasActiveAddonAsync(Guid tenantId, string code);
        Task<ServiceResult<List<FeatureAddonStatusDto>>> GetTenantAddonsAsync(Guid tenantId);
        Task<ServiceResult<PurchaseFeatureAddonResponseDto>> CreatePurchaseAsync(Guid tenantId, string code);
        Task<ServiceResult<bool>> ActivateAsync(Guid tenantId, string code, int months, string source);
        Task<ServiceResult<bool>> RevokeAsync(Guid tenantId, string code);
    }
}
