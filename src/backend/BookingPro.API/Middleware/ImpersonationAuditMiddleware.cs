using System.Security.Claims;

namespace BookingPro.API.Middleware
{
    public class ImpersonationAuditMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ImpersonationAuditMiddleware> _logger;

        public ImpersonationAuditMiddleware(
            RequestDelegate next,
            ILogger<ImpersonationAuditMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Detectar si es una sesión de impersonation
            var impersonatedBy = context.User?.FindFirst("ImpersonatedBy")?.Value;

            if (!string.IsNullOrEmpty(impersonatedBy) && ShouldAuditRequest(context.Request))
            {
                var adminId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var adminEmail = context.User?.FindFirst(ClaimTypes.Email)?.Value;
                var tenantId = context.User?.FindFirst("tenant_id")?.Value;
                var impersonatedAt = context.User?.FindFirst("ImpersonatedAt")?.Value;

                // 🔥 LOG CRÍTICO: Registrar todas las acciones durante impersonation
                _logger.LogWarning("IMPERSONATION ACTION: SuperAdmin impersonating Admin {AdminEmail} ({AdminId}) in Tenant {TenantId} | Action: {Method} {Path} | ImpersonatedBy: {ImpersonatedBy} | ImpersonatedAt: {ImpersonatedAt}",
                    adminEmail, adminId, tenantId, context.Request.Method, context.Request.Path, impersonatedBy, impersonatedAt);

                // También registrar el user agent y IP para mayor seguridad
                var userAgent = context.Request.Headers["User-Agent"].ToString();
                var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
                
                _logger.LogInformation("IMPERSONATION CONTEXT: IP: {IP}, UserAgent: {UserAgent}", ipAddress, userAgent);
            }

            await _next(context);
        }

        private static bool ShouldAuditRequest(HttpRequest request)
        {
            var path = request.Path.Value?.ToLower() ?? "";
            
            // No auditar requests de health check, swagger, assets estáticos
            if (path.Contains("/health") || 
                path.Contains("/swagger") || 
                path.Contains("/api-docs") ||
                path.Contains(".js") || 
                path.Contains(".css") || 
                path.Contains(".ico") ||
                path.Contains(".png") ||
                path.Contains(".jpg"))
            {
                return false;
            }

            // Solo auditar requests de API importantes
            return path.StartsWith("/api/") && 
                   (request.Method == "POST" || 
                    request.Method == "PUT" || 
                    request.Method == "DELETE" ||
                    path.Contains("/bookings") ||
                    path.Contains("/customers") ||
                    path.Contains("/payments") ||
                    path.Contains("/services"));
        }
    }
}