namespace BookingPro.API.Models.Constants
{
    public static class Roles
    {
        public const string SuperAdmin = "super_admin";
        public const string Admin = "admin";
        public const string Employee = "employee";
        public const string User = "user";

        /// <summary>
        /// Super admin de permisos mínimos: ve el listado de negocios en modo lectura
        /// (sin acciones) y puede crear invitaciones. Nada más.
        /// </summary>
        public const string SuperAdminSales = "super_admin_sales";

        // Conjuntos para [Authorize(Roles = ...)]
        public const string AdminAccess = "admin,super_admin";
        public const string AnyTenantUser = "admin,employee,user,super_admin";

        /// Cualquier cuenta que entra al panel de super admin (completa o restringida).
        public const string AnySuperAdmin = "super_admin,super_admin_sales";

        /// Roles que entran al panel de super admin, para queries de EF.
        public static readonly string[] SuperAdminRoles = { SuperAdmin, SuperAdminSales };
    }
}