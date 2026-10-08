using System;
using System.Security.Claims;
using BookingPro.API.Models.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Exige que el JWT sea de un usuario del mismo negocio que resolvió el host/header
    /// (claim tenant_id == tenant actual). Sin esto, un token válido de otro negocio
    /// alcanza para leer o tocar datos de este. Los tokens sin rol (p. ej. el de reset
    /// de contraseña) no cuentan como sesión de staff. El super admin pasa siempre.
    /// Va junto a [Authorize]: la autenticación la resuelve el pipeline, esto es solo
    /// el aislamiento por tenant.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public sealed class TenantStaffOnlyAttribute : Attribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var role = user.FindFirst(ClaimTypes.Role)?.Value;
            if (string.IsNullOrEmpty(role))
            {
                context.Result = new ForbidResult();
                return;
            }

            if (role == Roles.SuperAdmin)
                return;

            var claimTenant = user.FindFirst("tenant_id")?.Value ?? user.FindFirst("tenantId")?.Value;
            var currentTenant = context.HttpContext.Items["TenantId"] as string;

            if (string.IsNullOrEmpty(claimTenant) || string.IsNullOrEmpty(currentTenant) ||
                !string.Equals(claimTenant, currentTenant, StringComparison.OrdinalIgnoreCase))
            {
                context.Result = new ForbidResult();
            }
        }
    }
}
