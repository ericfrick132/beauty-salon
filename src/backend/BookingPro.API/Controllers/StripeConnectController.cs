using BookingPro.API.Data;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Stripe Connect Express del negocio para cobrar señas (España). Argentina, Uruguay y México cobran
    /// señas con su Mercado Pago.
    /// </summary>
    [ApiController]
    [Route("api/stripe/connect")]
    [Authorize(Roles = "admin,super_admin")]
    public class StripeConnectController : ControllerBase
    {
        private readonly IStripeConnectService _connect;
        private readonly ApplicationDbContext _context;

        public StripeConnectController(IStripeConnectService connect, ApplicationDbContext context)
        {
            _connect = connect;
            _context = context;
        }

        private Guid TenantId() =>
            Guid.TryParse(User.FindFirst("tenant_id")?.Value ?? User.FindFirst("tenantId")?.Value, out var id) ? id : Guid.Empty;

        [HttpGet("status")]
        public async Task<IActionResult> Status([FromQuery] bool refresh = true)
        {
            var tenantId = TenantId();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "No tenant context" });
            var result = await _connect.GetStatusAsync(tenantId, refresh);
            return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Message });
        }

        /// <summary>Crea la cuenta Express (si no existe) y devuelve el link de onboarding de Stripe.</summary>
        [HttpPost("onboarding")]
        public async Task<IActionResult> Onboarding()
        {
            var tenantId = TenantId();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "No tenant context" });
            var baseUrl = await StripeBillingController.TenantBaseUrlAsync(HttpContext, _context, tenantId);
            if (baseUrl == null) return BadRequest(new { error = "Negocio no encontrado" });
            var result = await _connect.CreateOnboardingLinkAsync(tenantId, baseUrl);
            return result.Success ? Ok(new { success = true, url = result.Data }) : BadRequest(new { error = result.Message });
        }

        /// <summary>Link al panel Express de Stripe (cobros, devoluciones y transferencias del negocio).</summary>
        [HttpPost("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var tenantId = TenantId();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "No tenant context" });
            var result = await _connect.CreateDashboardLinkAsync(tenantId);
            return result.Success ? Ok(new { success = true, url = result.Data }) : BadRequest(new { error = result.Message });
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect()
        {
            var tenantId = TenantId();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "No tenant context" });
            var result = await _connect.DisconnectAsync(tenantId);
            return result.Success ? Ok(new { success = true }) : BadRequest(new { error = result.Message });
        }
    }
}
