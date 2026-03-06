using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BookingPro.API.Services;
using BookingPro.API.Data;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantController : ControllerBase
    {
        private readonly ITenantService _tenantService;
        private readonly ITenantProvisioningService _provisioningService;
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public TenantController(ITenantService tenantService, ITenantProvisioningService provisioningService, ApplicationDbContext context, IMemoryCache cache)
        {
            _tenantService = tenantService;
            _provisioningService = provisioningService;
            _context = context;
            _cache = cache;
        }

        [HttpGet("config")]
        public IActionResult GetTenantConfig()
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                
                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                var config = new
                {
                    tenantId = tenant.Id,
                    businessName = tenant.BusinessName,
                    vertical = tenant.VerticalCode,
                    timezone = tenant.TimeZone ?? "-3",
                    theme = tenant.Theme,
                    features = tenant.Features,
                    terminology = tenant.Terminology
                };

                return Ok(config);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("info")]
        public IActionResult GetTenantInfo()
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                
                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                return Ok(new
                {
                    id = tenant.Id,
                    subdomain = tenant.Subdomain,
                    businessName = tenant.BusinessName,
                    vertical = tenant.VerticalCode,
                    domain = tenant.Domain
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("timezone")]
        public async Task<IActionResult> UpdateTimezone([FromBody] UpdateTimezoneRequest request)
        {
            try
            {
                var result = await _tenantService.UpdateTimezoneAsync(request.Timezone);
                
                if (!result)
                {
                    return BadRequest(new { message = "Failed to update timezone" });
                }

                return Ok(new { message = "Timezone updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        /// <summary>
        /// Check if the current tenant has a vertical assigned (for template picker detection).
        /// </summary>
        [HttpGet("has-vertical")]
        public async Task<IActionResult> HasVertical()
        {
            try
            {
                var tenantInfo = _tenantService.GetCurrentTenant();
                if (tenantInfo == null)
                    return NotFound(new { message = "Tenant not found" });

                // Query DB directly to avoid stale cache
                var tenant = await _context.Tenants
                    .Include(t => t.Vertical)
                    .FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);

                if (tenant == null)
                    return NotFound(new { message = "Tenant not found" });

                var hasVertical = tenant.VerticalId != null;
                return Ok(new { hasVertical, verticalCode = tenant.Vertical?.Code ?? "" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Apply a template (vertical) to the current tenant.
        /// Seeds services, categories, employees based on the chosen vertical.
        /// </summary>
        [Authorize]
        [HttpPost("apply-template")]
        public async Task<IActionResult> ApplyTemplate([FromBody] ApplyTemplateRequest request)
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant == null)
                    return NotFound(new { message = "Tenant not found" });

                var success = await _provisioningService.ApplyTemplateAsync(tenant.Id, request.VerticalCode);

                if (!success)
                    return BadRequest(new { success = false, message = "Error aplicando template. Verificá que el tipo de negocio sea válido." });

                // Invalidate tenant cache so the next request gets fresh data
                var host = HttpContext.Request.Host.Value;
                _cache.Remove($"tenant_header_{tenant.Subdomain}");
                _cache.Remove($"tenant_qs_{tenant.Subdomain}");
                _cache.Remove($"tenant_{host}");

                return Ok(new { success = true, message = "Template aplicado correctamente." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class ApplyTemplateRequest
    {
        public string VerticalCode { get; set; } = string.Empty;
    }

    public class UpdateTimezoneRequest
    {
        public string Timezone { get; set; } = string.Empty;
    }
}