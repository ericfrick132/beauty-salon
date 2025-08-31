namespace BookingPro.API.Services
{
    public interface ITenantProvider
    {
        Guid GetCurrentTenantId();
        bool HasTenant();
    }

    public class TenantProvider : ITenantProvider
    {
        private readonly ITenantService _tenantService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TenantProvider(ITenantService tenantService, IHttpContextAccessor httpContextAccessor)
        {
            _tenantService = tenantService;
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid GetCurrentTenantId()
        {
            try
            {
                // Priorizar ITenantService si está disponible
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant != null)
                {
                    return tenant.Id;
                }

                // Fallback a HttpContext
                if (_httpContextAccessor?.HttpContext?.Items.ContainsKey("TenantId") == true)
                {
                    if (Guid.TryParse(_httpContextAccessor.HttpContext.Items["TenantId"]?.ToString(), out Guid tenantId))
                    {
                        return tenantId;
                    }
                }
            }
            catch
            {
                // Durante migraciones o seeding, no hay tenant
            }

            // Retornar Guid vacío para contextos sin tenant (migraciones, super admin, etc.)
            return Guid.Empty;
        }

        public bool HasTenant()
        {
            return GetCurrentTenantId() != Guid.Empty;
        }
    }
}