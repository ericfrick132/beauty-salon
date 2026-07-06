using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/feature-addons")]
    [Authorize]
    public class FeatureAddonsController : ControllerBase
    {
        private readonly IFeatureAddonService _featureAddonService;
        private readonly ILogger<FeatureAddonsController> _logger;

        public FeatureAddonsController(
            IFeatureAddonService featureAddonService,
            ILogger<FeatureAddonsController> logger)
        {
            _featureAddonService = featureAddonService;
            _logger = logger;
        }

        private Guid GetTenantId()
        {
            var tid = User.FindFirst("tenantId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(tid, out var id) ? id : Guid.Empty;
        }

        [HttpGet]
        public async Task<IActionResult> GetAddons()
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var result = await _featureAddonService.GetTenantAddonsAsync(tenantId);
            if (!result.Success) return BadRequest(new { error = result.Message });
            return Ok(result.Data);
        }

        [HttpPost("purchase")]
        public async Task<IActionResult> Purchase([FromBody] PurchaseFeatureAddonRequestDto dto)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var result = await _featureAddonService.CreatePurchaseAsync(tenantId, dto.Code);
            if (!result.Success || result.Data == null)
            {
                return BadRequest(new { error = result.Message });
            }
            return Ok(result.Data);
        }
    }

    [ApiController]
    [Route("api/super-admin/feature-addons")]
    [Authorize(Roles = Models.Constants.Roles.SuperAdmin)]
    public class SuperAdminFeatureAddonsController : ControllerBase
    {
        private readonly IFeatureAddonService _featureAddonService;

        public SuperAdminFeatureAddonsController(IFeatureAddonService featureAddonService)
        {
            _featureAddonService = featureAddonService;
        }

        /// <summary>Otorga manualmente un add-on a un tenant por N meses.</summary>
        [HttpPost("grant")]
        public async Task<IActionResult> Grant([FromBody] GrantFeatureAddonDto dto)
        {
            var result = await _featureAddonService.ActivateAsync(dto.TenantId, dto.Code, dto.Months, "manual");
            if (!result.Success) return BadRequest(new { error = result.Message });
            return Ok(new { success = true });
        }

        /// <summary>Revoca un add-on de un tenant (vence de inmediato).</summary>
        [HttpPost("revoke")]
        public async Task<IActionResult> Revoke([FromBody] GrantFeatureAddonDto dto)
        {
            var result = await _featureAddonService.RevokeAsync(dto.TenantId, dto.Code);
            if (!result.Success) return BadRequest(new { error = result.Message });
            return Ok(new { success = true });
        }
    }
}
