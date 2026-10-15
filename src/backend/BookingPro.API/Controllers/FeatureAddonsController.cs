using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

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
            // El JWT emite el tenant en el claim "tenant_id" (ver AuthService).
            // OJO: no usar ClaimTypes.NameIdentifier como fallback porque ese claim es
            // el ID del USUARIO, no del tenant: usarlo hacía que todo (compra del add-on,
            // settings, stats) operara sobre un "tenant" inexistente y, p. ej., el botón
            // "Activar con MercadoPago" fallara con "Tenant not found" sin redirigir a pagar.
            var tid = User.FindFirst("tenant_id")?.Value ?? User.FindFirst("tenantId")?.Value;
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

            // La detección de transferencias (CVU / Mercado Pago Argentina) es solo para negocios de Argentina.
            if (string.Equals(dto.Code, Models.Constants.FeatureCodes.TransferDetection, StringComparison.OrdinalIgnoreCase))
            {
                var db = HttpContext.RequestServices.GetRequiredService<Data.ApplicationDbContext>();
                var country = await db.Tenants.IgnoreQueryFilters().AsNoTracking()
                    .Where(t => t.Id == tenantId).Select(t => t.Country).FirstOrDefaultAsync();
                if (!Utilities.CountryProfile.Get(country).TransferDetection)
                    return StatusCode(403, new { error = "Esta función no está disponible en el país del negocio." });
            }

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

        /// <summary>Todos los negocios con el estado de cada add-on (pantalla de add-ons del super admin).</summary>
        [HttpGet("tenants")]
        public async Task<IActionResult> GetTenants()
        {
            var result = await _featureAddonService.GetAllTenantsAddonsAsync();
            if (!result.Success) return BadRequest(new { error = result.Message });
            return Ok(result.Data);
        }

        /// <summary>Otorga manualmente un add-on a un tenant por N meses.</summary>
        [HttpPost("grant")]
        public async Task<IActionResult> Grant([FromBody] GrantFeatureAddonDto dto)
        {
            var result = await _featureAddonService.ActivateAsync(dto.TenantId, dto.Code, dto.Months, "manual");
            if (!result.Success) return BadRequest(new { error = result.Message });
            return Ok(new { success = true });
        }

        /// <summary>Prueba gratis de un add-on por N días (default 7): vence sola y el panel del negocio avisa.</summary>
        [HttpPost("trial")]
        public async Task<IActionResult> Trial([FromBody] TrialFeatureAddonDto dto)
        {
            var result = await _featureAddonService.StartTrialAsync(dto.TenantId, dto.Code, dto.Days);
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
