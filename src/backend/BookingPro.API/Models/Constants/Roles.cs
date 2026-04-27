namespace BookingPro.API.Models.Constants
{
    public static class Roles
    {
        public const string SuperAdmin = "super_admin";
        public const string Admin = "admin";
        public const string Employee = "employee";
        public const string User = "user";

        // Conjuntos para [Authorize(Roles = ...)]
        public const string AdminAccess = "admin,super_admin";
        public const string AnyTenantUser = "admin,employee,user,super_admin";
    }
}