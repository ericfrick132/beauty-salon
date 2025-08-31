using BookingPro.API.Models;

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
    }
}