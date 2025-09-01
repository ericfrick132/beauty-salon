using BookingPro.API.Models;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Common;

namespace BookingPro.API.Services
{
    public interface ITenantService
    {
        string GetCurrentTenantId();
        Guid GetCurrentTenantIdFromContext();
        string GetSchemaName();
        TenantInfo? GetCurrentTenant();
        Task<TenantInfo> GetCurrentConfigAsync();
        void SetCurrentTenant(TenantInfo tenant);
        Task<TenantInfo?> GetTenantBySubdomain(string subdomain, string domain);
        Task<TenantInfo?> GetTenantByCustomDomain(string hostname);
        Task<TenantInfo?> GetTenantBySubdomainOnly(string subdomain);
        Task<bool> UpdateTimezoneAsync(string timezone);
        Task<ServiceResult<TenantCreationResult>> CreateSelfRegisteredTenantAsync(CreateTenantDto dto);
    }

    public class TenantCreationResult
    {
        public Guid Id { get; set; }
        public string Subdomain { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
        public string TenantUrl { get; set; } = string.Empty;
        public bool IsDemo { get; set; }
        public int DemoDays { get; set; }
    }
}