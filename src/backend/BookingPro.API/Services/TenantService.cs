using BookingPro.API.Data;
using BookingPro.API.Models;
using BookingPro.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class TenantService : ITenantService
    {
        private readonly ApplicationDbContext _context;
        private TenantInfo? _currentTenant;

        public TenantService(ApplicationDbContext context)
        {
            _context = context;
        }

        public string GetCurrentTenantId()
        {
            return _currentTenant?.Id.ToString() ?? throw new InvalidOperationException("No tenant context set");
        }

        public Guid GetCurrentTenantIdFromContext()
        {
            return _currentTenant?.Id ?? Guid.Empty;
        }

        public Task<TenantInfo> GetCurrentConfigAsync()
        {
            return Task.FromResult(_currentTenant ?? throw new InvalidOperationException("No tenant context set"));
        }

        public string GetSchemaName()
        {
            return _currentTenant?.SchemaName ?? throw new InvalidOperationException("No tenant context set");
        }

        public TenantInfo? GetCurrentTenant()
        {
            return _currentTenant;
        }

        public void SetCurrentTenant(TenantInfo tenant)
        {
            _currentTenant = tenant;
        }

        public async Task<TenantInfo?> GetTenantBySubdomain(string subdomain, string domain)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Vertical)
                .FirstOrDefaultAsync(t => 
                    t.Subdomain == subdomain && 
                    t.Vertical.Domain == domain &&
                    (t.Status == TenantStatus.Active.ToString().ToLower() || t.Status == TenantStatus.Trial.ToString().ToLower()));

            if (tenant == null) return null;

            return new TenantInfo
            {
                Id = tenant.Id,
                Subdomain = tenant.Subdomain,
                BusinessName = tenant.BusinessName,
                VerticalCode = tenant.Vertical.Code,
                SchemaName = tenant.SchemaName,
                Domain = domain,
                Theme = System.Text.Json.JsonSerializer.Deserialize<TenantTheme>(tenant.Vertical.DefaultTheme) ?? new TenantTheme(),
                Features = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(tenant.Vertical.Features) ?? new(),
                Terminology = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(tenant.Vertical.Terminology) ?? new()
            };
        }

        public async Task<TenantInfo?> GetTenantByCustomDomain(string hostname)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Vertical)
                .FirstOrDefaultAsync(t => 
                    t.CustomDomain == hostname &&
                    (t.Status == TenantStatus.Active.ToString().ToLower() || t.Status == TenantStatus.Trial.ToString().ToLower()));

            if (tenant == null) return null;

            return new TenantInfo
            {
                Id = tenant.Id,
                Subdomain = tenant.Subdomain,
                BusinessName = tenant.BusinessName,
                VerticalCode = tenant.Vertical.Code,
                SchemaName = tenant.SchemaName,
                Domain = hostname,
                Theme = System.Text.Json.JsonSerializer.Deserialize<TenantTheme>(tenant.Vertical.DefaultTheme) ?? new TenantTheme(),
                Features = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(tenant.Vertical.Features) ?? new(),
                Terminology = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(tenant.Vertical.Terminology) ?? new()
            };
        }

        public async Task<TenantInfo?> GetTenantBySubdomainOnly(string subdomain)
        {
            // Para desarrollo local, buscar tenant solo por subdomain
            var tenant = await _context.Tenants
                .Include(t => t.Vertical)
                .FirstOrDefaultAsync(t => 
                    t.Subdomain == subdomain &&
                    (t.Status == TenantStatus.Active.ToString().ToLower() || t.Status == TenantStatus.Trial.ToString().ToLower()));

            if (tenant == null) return null;

            return new TenantInfo
            {
                Id = tenant.Id,
                Subdomain = tenant.Subdomain,
                BusinessName = tenant.BusinessName,
                VerticalCode = tenant.Vertical.Code,
                SchemaName = tenant.SchemaName,
                Domain = tenant.Vertical.Domain,
                Theme = System.Text.Json.JsonSerializer.Deserialize<TenantTheme>(tenant.Vertical.DefaultTheme) ?? new TenantTheme(),
                Features = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(tenant.Vertical.Features) ?? new(),
                Terminology = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(tenant.Vertical.Terminology) ?? new()
            };
        }
    }
}