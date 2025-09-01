using BookingPro.API.Models;
using BookingPro.API.Services;
using Microsoft.Extensions.Caching.Memory;

namespace BookingPro.API.Utilities
{
    public class TenantResolutionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;

        public TenantResolutionMiddleware(
            RequestDelegate next, 
            IMemoryCache cache)
        {
            _next = next;
            _cache = cache;
        }

        public async Task InvokeAsync(
            HttpContext context, 
            ITenantService tenantService)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            
            // Skip tenant resolution para rutas de super admin, admin, health checks, swagger, OAuth callbacks y self-registration
            if (path.StartsWith("/api/super-admin") || 
                path.StartsWith("/api/admin") ||
                path.StartsWith("/api/invitation") ||
                path.StartsWith("/api/self-registration") ||
                path.StartsWith("/api/verticals") ||
                path.StartsWith("/api/mercadopago/callback") ||
                path.StartsWith("/api/webhooks/") ||
                path.StartsWith("/health") || 
                path.StartsWith("/ping") ||
                path.StartsWith("/swagger"))
            {
                // Log for debugging
                Console.WriteLine($"[TenantMiddleware] Skipping tenant resolution for path: {path}");
                await _next(context);
                return;
            }

            TenantInfo? tenant = null;
            
            // Primero intentar resolver por header X-Tenant-Subdomain (útil para desarrollo)
            if (context.Request.Headers.TryGetValue("X-Tenant-Subdomain", out var tenantSubdomain))
            {
                var subdomain = tenantSubdomain.ToString();
                var cacheKey = $"tenant_header_{subdomain}";
                
                if (!_cache.TryGetValue(cacheKey, out tenant))
                {
                    tenant = await tenantService.GetTenantBySubdomainOnly(subdomain);
                    if (tenant != null)
                    {
                        _cache.Set(cacheKey, tenant, TimeSpan.FromMinutes(5));
                    }
                }
            }
            
            // Si no se resolvió por header, intentar por hostname
            if (tenant == null)
            {
                var host = context.Request.Host.Value;
                var cacheKey = $"tenant_{host}";
                
                if (!_cache.TryGetValue(cacheKey, out tenant))
                {
                    // Resolver tenant desde hostname
                    tenant = await ResolveTenant(host, tenantService);
                    
                    if (tenant != null)
                    {
                        // Cachear por 5 minutos
                        _cache.Set(cacheKey, tenant, TimeSpan.FromMinutes(5));
                    }
                }
            }
            
            if (tenant == null)
            {
                context.Response.StatusCode = 404;
                await context.Response.WriteAsync("Tenant not found");
                return;
            }

            // Establecer contexto del tenant
            tenantService.SetCurrentTenant(tenant);
            
            // Establecer TenantId en HttpContext para query filters
            context.Items["TenantId"] = tenant.Id.ToString();
            
            // Agregar headers
            context.Response.Headers["X-Tenant-Id"] = tenant.Id.ToString();

            await _next(context);
        }

        private async Task<TenantInfo?> ResolveTenant(
            string hostname, 
            ITenantService service)
        {
            // Lógica para resolver tenant
            // 1. Verificar si es subdominio
            // 2. Verificar si es dominio custom
            // 3. Cargar configuración del vertical
            
            var parts = hostname.Split('.');
            
            // Para desarrollo local con formato: subdomain.localhost:port
            if (parts.Length >= 2 && parts[1].StartsWith("localhost"))
            {
                var subdomain = parts[0];
                // En desarrollo, buscar el tenant solo por subdomain
                return await service.GetTenantBySubdomainOnly(subdomain);
            }
            
            if (parts.Length >= 3)
            {
                var subdomain = parts[0];
                var verticalDomain = string.Join(".", parts.Skip(1));
                
                return await service.GetTenantBySubdomain(subdomain, verticalDomain);
            }
            
            // Dominio custom
            return await service.GetTenantByCustomDomain(hostname);
        }
    }
}