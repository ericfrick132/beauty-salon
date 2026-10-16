using System.Text.RegularExpressions;
using BookingPro.API.Data;
using BookingPro.API.Services;
using BookingPro.API.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Píxel de Meta y Google Analytics 4 del negocio en su página de reservas (plan Pro). La página pública los
    /// recibe en /public/tenant-info solo mientras el plan los incluya.
    /// </summary>
    [ApiController]
    [Route("api/tenant/tracking")]
    [Authorize]
    [TenantStaffOnly]
    public partial class TrackingSettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IPlanEntitlementService _plans;

        public TrackingSettingsController(ApplicationDbContext context, ITenantProvider tenantProvider, IPlanEntitlementService plans)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _plans = plans;
        }

        public class TrackingSettingsDto
        {
            public string? MetaPixelId { get; set; }
            public string? GoogleAnalyticsId { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null) return NotFound();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.TrackingPixels);
            return Ok(new { allowed = feature.Allowed, tenant.MetaPixelId, tenant.GoogleAnalyticsId });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] TrackingSettingsDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.TrackingPixels);
            if (!feature.Allowed) return PlanLimitResult.From(feature);

            var pixel = string.IsNullOrWhiteSpace(dto.MetaPixelId) ? null : dto.MetaPixelId.Trim();
            var ga = string.IsNullOrWhiteSpace(dto.GoogleAnalyticsId) ? null : dto.GoogleAnalyticsId.Trim().ToUpperInvariant();
            // Se inyectan en un <script> de la página pública: solo el formato exacto, nada más.
            if (pixel != null && !PixelId().IsMatch(pixel))
                return BadRequest(new { message = "El ID del Píxel de Meta son solo números (entre 10 y 20 dígitos)." });
            if (ga != null && !GaId().IsMatch(ga))
                return BadRequest(new { message = "El ID de Google Analytics tiene el formato G-XXXXXXXXXX." });

            var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null) return NotFound();
            tenant.MetaPixelId = pixel;
            tenant.GoogleAnalyticsId = ga;
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { allowed = true, tenant.MetaPixelId, tenant.GoogleAnalyticsId });
        }

        [GeneratedRegex("^[0-9]{10,20}$")]
        private static partial Regex PixelId();

        [GeneratedRegex("^G-[A-Z0-9]{4,16}$")]
        private static partial Regex GaId();
    }
}
