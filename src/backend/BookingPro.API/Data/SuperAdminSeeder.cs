using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.Enums;

namespace BookingPro.API.Data
{
    public static class SuperAdminSeeder
    {
        public static async Task SeedSuperAdminAsync(ApplicationDbContext context)
        {
            // Verificar si ya existe un super admin
            var existingSuperAdmin = await context.Users
                .FirstOrDefaultAsync(u => u.Role == Roles.SuperAdmin);

            if (existingSuperAdmin != null)
            {
                Console.WriteLine("Super Admin ya existe en el sistema.");
                return;
            }

            // Crear un tenant especial para el super admin (sistema)
            var systemTenant = await context.Tenants
                .FirstOrDefaultAsync(t => t.Subdomain == "system");

            if (systemTenant == null)
            {
                // Obtener el primer vertical disponible
                var firstVertical = await context.Verticals.FirstAsync();

                systemTenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    VerticalId = firstVertical.Id,
                    Subdomain = "system",
                    BusinessName = "BookingPro System",
                    OwnerEmail = "admin@turnos-pro.com",
                    SchemaName = "public", // El super admin usa el schema público
                    Status = TenantStatus.Active.ToString().ToLower(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                context.Tenants.Add(systemTenant);
                await context.SaveChangesAsync();
            }

            // Crear usuario super admin
            var superAdmin = new User
            {
                Id = Guid.NewGuid(),
                TenantId = systemTenant.Id,
                Email = "admin@turnos-pro.com",
                PasswordHash = HashPassword("TurnosPro2024!"), // Contraseña inicial
                FirstName = "Super",
                LastName = "Admin",
                Role = Roles.SuperAdmin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(superAdmin);
            await context.SaveChangesAsync();

            Console.WriteLine("=== SUPER ADMIN CREADO ===");
            Console.WriteLine($"Email: {superAdmin.Email}");
            Console.WriteLine("Password: TurnosPro2024!");
            Console.WriteLine("=== CAMBIAR PASSWORD DESPUÉS DEL PRIMER LOGIN ===");
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "BookingProSalt2024"));
            return Convert.ToBase64String(hashedBytes);
        }
    }
}