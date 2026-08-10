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
                PasswordHash = BookingPro.API.Services.Security.PasswordHasher.Hash("TurnosPro2024!"), // Contraseña inicial
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

        /// <summary>
        /// Cuenta de super admin con permisos mínimos (rol <see cref="Roles.SuperAdminSales"/>):
        /// ve el listado de negocios en modo lectura y puede crear invitaciones, nada más.
        /// Idempotente — corre en cada arranque y no pisa la contraseña si la cuenta ya existe.
        /// Email/contraseña se pueden sobreescribir con SALES_SUPERADMIN_EMAIL / SALES_SUPERADMIN_PASSWORD.
        /// </summary>
        public static async Task EnsureSalesSuperAdminAsync(ApplicationDbContext context)
        {
            var email = (Environment.GetEnvironmentVariable("SALES_SUPERADMIN_EMAIL") ?? "ventas@turnos-pro.com").Trim().ToLowerInvariant();
            var password = Environment.GetEnvironmentVariable("SALES_SUPERADMIN_PASSWORD") ?? "Ver2026!";

            // El panel de super admin vive en el tenant "system"; sin él no hay dónde crearla.
            var systemTenant = await context.Tenants.FirstOrDefaultAsync(t => t.Subdomain == "system");
            if (systemTenant == null)
            {
                Console.WriteLine("[SalesSuperAdmin] No existe el tenant 'system', se omite la creación.");
                return;
            }

            if (await context.Users.AnyAsync(u => u.Email == email && u.TenantId == systemTenant.Id))
            {
                Console.WriteLine($"[SalesSuperAdmin] {email} ya existe, no se modifica.");
                return;
            }

            context.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                TenantId = systemTenant.Id,
                Email = email,
                PasswordHash = BookingPro.API.Services.Security.PasswordHasher.Hash(password),
                FirstName = "Ventas",
                LastName = "TurnosPro",
                Role = Roles.SuperAdminSales,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();
            Console.WriteLine($"[SalesSuperAdmin] Cuenta creada: {email} (rol {Roles.SuperAdminSales})");
        }

        // Password hashing centralized in Services.Security.PasswordHasher
    }
}
