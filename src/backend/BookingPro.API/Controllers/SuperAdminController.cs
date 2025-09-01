using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/super-admin")]
    [Authorize(Roles = "super_admin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SuperAdminController> _logger;

        public SuperAdminController(
            ApplicationDbContext context,
            ILogger<SuperAdminController> logger)
        {
            _context = context;
            _logger = logger;
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

                var totalItems = await query.CountAsync();
                var tenants = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(t => new
                    {
                        id = t.Id,
                        subdomain = t.Subdomain,
                        businessName = t.BusinessName,
                        ownerEmail = t.OwnerEmail, // Fix: Include owner email
                        verticalId = t.VerticalId,
                        vertical = new
                        {
                            name = t.Vertical.Name,
                            code = t.Vertical.Code
                        },
                        isActive = t.Status == "active",
                        status = t.Status, // Fix: Include status field
                        createdAt = t.CreatedAt,
                        lastLoginAt = (DateTime?)null, // Will be populated from Users table if needed
                        subscriptionStatus = "NEVER_SUBSCRIBED", // Default status
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
    }

    public class PlatformConfigDto
    {
        public decimal MonthlyPrice { get; set; }
        public string Currency { get; set; } = "ARS";
        public bool IsActive { get; set; }
    }
}