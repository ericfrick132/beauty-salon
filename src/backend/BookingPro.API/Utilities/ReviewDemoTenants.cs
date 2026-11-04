using BookingPro.API.Models.Entities;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Negocios demo que usan Apple (App Review) y Google Play ("Datos de inicio de sesión")
    /// para revisar las apps: demo@turnospro.app en estudio-malva. Si se borran, el revisor no
    /// puede entrar y rechaza la app (pasó el 4-nov-2026: alguien eliminó estudio-malva desde el
    /// superadmin y se rompieron las dos revisiones). No se pueden eliminar desde el panel y no
    /// cuentan como clientes en las métricas del hub.
    /// </summary>
    public static class ReviewDemoTenants
    {
        public const string OwnerEmailDomain = "@turnospro.app";

        private static readonly HashSet<string> Subdomains = new(StringComparer.OrdinalIgnoreCase)
        {
            "estudio-malva",
        };

        public static bool IsProtected(Tenant tenant) =>
            Subdomains.Contains(tenant.Subdomain ?? string.Empty)
            || (tenant.OwnerEmail ?? string.Empty).EndsWith(OwnerEmailDomain, StringComparison.OrdinalIgnoreCase);
    }
}
