using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookingPro.API.Services;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace BookingPro.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "super_admin")]
    public class TenantManagementController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvisioningService _tenantProvisioning;
        private readonly IAuthService _authService;

        public TenantManagementController(
            ApplicationDbContext context,
            ITenantProvisioningService tenantProvisioning,
            IAuthService authService)
        {
            _context = context;
            _tenantProvisioning = tenantProvisioning;
            _authService = authService;
        }

        [HttpPost("provision")]
        public async Task<IActionResult> ProvisionNewTenant([FromBody] ProvisionTenantDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // 1. Validar subdomain disponible
                var isAvailable = await CheckSubdomainAvailabilityAsync(dto.Subdomain, dto.VerticalCode);
                
                if (!isAvailable)
                {
                    return BadRequest(new { message = "Subdomain not available" });
                }

                // 2. Obtener vertical
                var vertical = await _context.Verticals
                    .FirstOrDefaultAsync(v => v.Code == dto.VerticalCode);
                
                if (vertical == null)
                {
                    return BadRequest(new { message = "Vertical not found" });
                }

                // 3. Crear tenant
                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    VerticalId = vertical.Id,
                    Subdomain = dto.Subdomain,
                    BusinessName = dto.BusinessName,
                    OwnerEmail = dto.OwnerEmail,
                    OwnerPhone = dto.OwnerPhone,
                    SchemaName = $"tenant_{Guid.NewGuid().ToString().Replace("-", "_")}",
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // 4. Crear schema en la base de datos
                var schemaName = $"{dto.VerticalCode}_{dto.Subdomain}_{tenant.Id.ToString().Substring(0, 8)}".ToLower();
                tenant.SchemaName = schemaName;
                await _context.SaveChangesAsync();
                await _tenantProvisioning.ProvisionNewTenantAsync(tenant.Id);

                // 5. Crear usuario admin para el tenant
                var tempPassword = GenerateTemporaryPassword();
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = dto.OwnerEmail,
                    PasswordHash = BookingPro.API.Services.Security.PasswordHasher.Hash(tempPassword),
                    FirstName = dto.AdminFirstName ?? "Admin",
                    LastName = dto.AdminLastName ?? tenant.BusinessName,
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    tenantId = tenant.Id,
                    accessUrl = $"https://{dto.Subdomain}.{vertical.Domain}",
                    schemaName = tenant.SchemaName,
                    message = "Tenant created successfully",
                    adminCredentials = new
                    {
                        email = dto.OwnerEmail,
                        password = tempPassword,
                        note = "Please change this password on first login"
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("check-subdomain")]
        public async Task<IActionResult> CheckSubdomainAvailability(
            [FromQuery] string subdomain, 
            [FromQuery] string verticalCode)
        {
            var isAvailable = await CheckSubdomainAvailabilityAsync(subdomain, verticalCode);
            return Ok(new { isAvailable });
        }

        [HttpGet("tenants")]
        public async Task<IActionResult> GetTenants(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.Tenants
                .Include(t => t.Vertical)
                .OrderByDescending(t => t.CreatedAt);

            var totalItems = await query.CountAsync();
            var tenants = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    id = t.Id,
                    subdomain = t.Subdomain,
                    businessName = t.BusinessName,
                    ownerEmail = t.OwnerEmail,
                    vertical = t.Vertical.Name,
                    status = t.Status,
                    createdAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                data = tenants,
                totalItems,
                totalPages = (int)Math.Ceiling((double)totalItems / pageSize),
                currentPage = page,
                pageSize
            });
        }

        private async Task<bool> CheckSubdomainAvailabilityAsync(string subdomain, string verticalCode)
        {
            return !await _context.Tenants
                .AnyAsync(t => t.Subdomain == subdomain && t.Vertical.Code == verticalCode);
        }

        private string GenerateTemporaryPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
            var random = new Random();
            var password = new string(Enumerable.Repeat(chars, 12)
                .Select(s => s[random.Next(s.Length)]).ToArray());
            
            // Asegurar que tenga al menos una mayúscula, una minúscula, un número y un símbolo
            if (!password.Any(char.IsUpper))
                password = "A" + password.Substring(1);
            if (!password.Any(char.IsLower))
                password = password.Substring(0, 1) + "a" + password.Substring(2);
            if (!password.Any(char.IsDigit))
                password = password.Substring(0, 2) + "2" + password.Substring(3);
            if (!password.Any(c => "!@#$".Contains(c)))
                password = password.Substring(0, 3) + "!" + password.Substring(4);
                
            return password;
        }

        // Password hashing centralized in Services.Security.PasswordHasher
    }

    public class ProvisionTenantDto
    {
        public string Subdomain { get; set; } = string.Empty;
        public string VerticalCode { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
        public string OwnerEmail { get; set; } = string.Empty;
        public string? OwnerPhone { get; set; }
        public string? AdminFirstName { get; set; }
        public string? AdminLastName { get; set; }
    }
}
