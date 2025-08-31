using Microsoft.AspNetCore.Mvc;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantController : ControllerBase
    {
        private readonly ITenantService _tenantService;

        public TenantController(ITenantService tenantService)
        {
            _tenantService = tenantService;
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
    }
}