using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Common;

namespace BookingPro.API.Services.Interfaces
{
    public interface ISuperAdminService
    {
        Task<ServiceResult<ImpersonationResult>> ImpersonateTenantAsync(Guid tenantId);
        Task<ServiceResult<IEnumerable<SuperAdminTenantListDto>>> GetTenantsForSuperAdminAsync();
    }
}