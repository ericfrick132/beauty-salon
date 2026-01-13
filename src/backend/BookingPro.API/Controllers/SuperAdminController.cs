using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/super-admin")]
    [Authorize(Roles = "super_admin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SuperAdminController> _logger;
        private readonly ISuperAdminService _superAdminService;

        public SuperAdminController(
            ApplicationDbContext context,
            ILogger<SuperAdminController> logger,
            ISuperAdminService superAdminService)
        {
            _context = context;
            _logger = logger;
            _superAdminService = superAdminService;
        }

        [HttpGet("tenants")]
        public async Task<IActionResult> GetTenants(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var query = _context.Tenants
                    .Include(t => t.Vertical)
                    .OrderByDescending(t => t.CreatedAt);

                var tenants = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(t => new
                    {
                        id = t.Id,
                        subdomain = t.Subdomain,
                        businessName = t.BusinessName,
                        ownerEmail = t.OwnerEmail,
                        verticalId = t.VerticalId,
                        vertical = new
                        {
                            name = t.Vertical.Name,
                            code = t.Vertical.Code,
                            domain = t.Vertical.Domain
                        },
                        isActive = t.Status == "active",
                        status = t.Status,
                        createdAt = t.CreatedAt,
                        lastLoginAt = _context.Users
                            .IgnoreQueryFilters()
                            .Where(u => u.TenantId == t.Id && u.LastLogin.HasValue)
                            .OrderByDescending(u => u.LastLogin)
                            .Select(u => u.LastLogin)
                            .FirstOrDefault(),
                        // Facturación total aprobada
                        totalRevenue = _context.TenantSubscriptionPayments
                            .Where(p => p.TenantId == t.Id && p.Status == "approved")
                            .Select(p => (decimal?)p.Amount)
                            .Sum() ?? 0,
                        // Último vencimiento de suscripción (por pagos aprobados)
                        subscriptionExpiry = _context.TenantSubscriptionPayments
                            .Where(p => p.TenantId == t.Id && p.Status == "approved")
                            .OrderByDescending(p => p.PeriodEnd)
                            .Select(p => (DateTime?)p.PeriodEnd)
                            .FirstOrDefault(),
                        // Estado de suscripción derivado
                        subscriptionStatus = _context.TenantSubscriptionPayments
                            .Any(p => p.TenantId == t.Id && p.Status == "approved" && p.PeriodEnd > DateTime.UtcNow)
                                ? "ACTIVE"
                                : (_context.TenantSubscriptionPayments.Any(p => p.TenantId == t.Id)
                                    ? "EXPIRED"
                                    : "NEVER_SUBSCRIBED"),
                        daysUntilExpiry = (int?)null
                    })
                    .ToListAsync();

                return Ok(tenants);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tenants for super admin");
                return StatusCode(500, new { message = "Error fetching tenants" });
            }
        }

        [HttpGet("tenant-payments")]
        public async Task<IActionResult> GetTenantPayments()
        {
            try
            {
                // Return empty array for now since payment system isn't fully implemented
                var payments = new List<object>();
                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tenant payments for super admin");
                return StatusCode(500, new { message = "Error fetching payments" });
            }
        }

        [HttpGet("platform-config")]
        public async Task<IActionResult> GetPlatformConfig()
        {
            try
            {
                // Return default platform configuration
                var config = new
                {
                    monthlyPrice = 29.99m,
                    currency = "ARS",
                    isActive = true
                };

                return Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching platform config for super admin");
                return StatusCode(500, new { message = "Error fetching platform config" });
            }
        }

        [HttpPut("platform-config")]
        public async Task<IActionResult> UpdatePlatformConfig([FromBody] PlatformConfigDto config)
        {
            try
            {
                // For now, just return success - implement actual config storage later
                return Ok(new { success = true, message = "Platform configuration updated" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating platform config for super admin");
                return StatusCode(500, new { success = false, message = "Error updating platform config" });
            }
        }

        [HttpPost("tenants/{tenantId}/create-payment")]
        public async Task<IActionResult> CreateTenantPayment(Guid tenantId)
        {
            try
            {
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant == null)
                {
                    return NotFound(new { success = false, message = "Tenant not found" });
                }

                // For now, just return success - implement actual payment creation later
                return Ok(new { success = true, message = "Payment link created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tenant payment for super admin");
                return StatusCode(500, new { success = false, message = "Error creating payment" });
            }
        }

        [HttpPost("tenants/{tenantId}/impersonate")]
        public async Task<IActionResult> ImpersonateTenant(Guid tenantId)
        {
            try
            {
                // 1. Verificar que el usuario es super admin
                var userRole = User?.FindFirst("role")?.Value;
                var claimRole = User?.FindFirst(ClaimTypes.Role)?.Value;
                var isSuperAdmin = User?.FindFirst("is_super_admin")?.Value;
                
                _logger.LogWarning("IMPERSONATION DEBUG: role claim: {UserRole}, ClaimTypes.Role: {ClaimRole}, is_super_admin: {IsSuperAdmin}", userRole, claimRole, isSuperAdmin);
                
                if (userRole != "super_admin" && claimRole != "super_admin" && isSuperAdmin != "true")
                {
                    return Unauthorized(new { success = false, message = $"Only super admins can impersonate tenants. Current role: {userRole}, claimRole: {claimRole}, isSuperAdmin: {isSuperAdmin}" });
                }

                // 2. Realizar impersonation
                var result = await _superAdminService.ImpersonateTenantAsync(tenantId);

                if (!result.Success)
                {
                    return BadRequest(new { success = false, message = result.Message });
                }

                return Ok(new { 
                    success = true, 
                    data = result.Data,
                    message = "Impersonation token generated successfully" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during impersonation for tenant {TenantId}", tenantId);
                return StatusCode(500, new { success = false, message = "Error during impersonation" });
            }
        }

        [HttpGet("tenants/list")]
        public async Task<IActionResult> GetTenantsForImpersonation()
        {
            try
            {
                var result = await _superAdminService.GetTenantsForSuperAdminAsync();

                if (!result.Success)
                {
                    return BadRequest(new { success = false, message = result.Message });
                }

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tenants for impersonation");
                return StatusCode(500, new { success = false, message = "Error fetching tenants" });
            }
        }
    }

    public class PlatformConfigDto
    {
        public decimal MonthlyPrice { get; set; }
        public string Currency { get; set; } = "ARS";
        public bool IsActive { get; set; }
    }
}
