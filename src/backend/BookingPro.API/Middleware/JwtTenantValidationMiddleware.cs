using System;
using System.Security.Claims;
using System.Threading.Tasks;
using BookingPro.API.Models.Constants;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Middleware
{
    /// <summary>
    /// Aislamiento por tenant para todo request autenticado: el tenant_id del JWT tiene que
    /// ser el negocio que resolvió TenantResolutionMiddleware (host, X-Tenant-Subdomain o
    /// ?subdomain=). Sin esto, un token válido de un negocio servía para leer o modificar
    /// los datos de otro con solo cambiar el subdominio.
    ///
    /// - Las rutas que no resuelven tenant (super-admin, registro, logins sociales, reset de
    ///   contraseña, webhooks, etc.) no tienen TenantId en el contexto y pasan sin chequeo.
    /// - El super admin pasa siempre; la impersonación emite un token con el tenant_id del
    ///   negocio impersonado, así que valida como cualquier admin.
    /// - El token de reset de contraseña (claim prp) viaja en el body, nunca como Bearer:
    ///   si llega como sesión se rechaza.
    /// Modelo: JwtTenantValidationMiddleware de PlayCrew.
    /// </summary>
    public class JwtTenantValidationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<JwtTenantValidationMiddleware> _logger;

        public JwtTenantValidationMiddleware(RequestDelegate next, ILogger<JwtTenantValidationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var user = context.User;
            if (user?.Identity?.IsAuthenticated != true || IsAnonymousEndpoint(context.Request.Path))
            {
                await _next(context);
                return;
            }

            var role = user.FindFirst(ClaimTypes.Role)?.Value;
            if (role == Roles.SuperAdmin || role == "SuperAdmin")
            {
                await _next(context);
                return;
            }

            if (!string.IsNullOrEmpty(user.FindFirst("prp")?.Value))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "Token no válido para esta operación" });
                return;
            }

            var currentTenant = context.Items["TenantId"] as string;
            if (string.IsNullOrEmpty(currentTenant))
            {
                // Ruta sin tenant en contexto (ver lista de exclusiones de TenantResolutionMiddleware).
                await _next(context);
                return;
            }

            var claimTenant = user.FindFirst("tenant_id")?.Value ?? user.FindFirst("tenantId")?.Value;
            if (!string.Equals(claimTenant, currentTenant, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "JWT tenant mismatch on {Path}. JWT: {JwtTenant}, Context: {ContextTenant}",
                    context.Request.Path.Value, claimTenant ?? "(none)", currentTenant);

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { message = "El token no corresponde a este negocio" });
                return;
            }

            await _next(context);
        }

        // Endpoints anónimos que no usan la identidad del token: si el cliente manda un token
        // viejo de otro negocio (p. ej. la app al cambiar de cuenta) no hay que bloquearlos.
        private static bool IsAnonymousEndpoint(PathString path)
        {
            var p = path.Value?.ToLowerInvariant() ?? string.Empty;
            return p.StartsWith("/api/public/") ||
                   p == "/api/auth/login" ||
                   p == "/api/auth/register" ||
                   p == "/api/auth/validate";
        }
    }
}
