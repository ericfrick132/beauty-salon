using BookingPro.API.Data;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StripeSdk = Stripe;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Suscripción a la plataforma con Stripe para negocios fuera de Argentina (UY en USD, MX en MXN, ES en EUR).
    /// /empezar llama a checkout en vez de /preapproval/create cuando el país cobra con Stripe.
    /// </summary>
    [ApiController]
    [Route("api/stripe/billing")]
    [Authorize]
    public class StripeBillingController : ControllerBase
    {
        private readonly IStripeBillingService _billing;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StripeBillingController> _logger;

        public StripeBillingController(IStripeBillingService billing, ApplicationDbContext context, ILogger<StripeBillingController> logger)
        {
            _billing = billing;
            _context = context;
            _logger = logger;
        }

        public class CreateStripeCheckoutDto
        {
            public string? PlanCode { get; set; }
            public string? ReturnPath { get; set; }
        }

        private Guid TenantId() =>
            Guid.TryParse(User.FindFirst("tenant_id")?.Value ?? User.FindFirst("tenantId")?.Value, out var id) ? id : Guid.Empty;

        /// <summary>URL del subdominio del negocio (ahí está su sesión), igual que el back_url de la preapproval.</summary>
        internal static async Task<string?> TenantBaseUrlAsync(HttpContext http, ApplicationDbContext db, Guid tenantId)
        {
            var subdomain = await db.Tenants.IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.Id == tenantId).Select(t => t.Subdomain).FirstOrDefaultAsync();
            if (string.IsNullOrEmpty(subdomain)) return null;
            var host = http.Request.Host.Host;
            var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
            return isLocal ? $"http://{subdomain}.localhost:3001" : $"https://{subdomain}.turnos-pro.com";
        }

        /// <summary>True si el negocio paga la plataforma con Stripe (todo lo que no es Argentina).</summary>
        internal static async Task<bool> BillsWithStripeAsync(ApplicationDbContext db, Guid tenantId)
        {
            if (tenantId == Guid.Empty) return false;
            var country = await db.Tenants.IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.Id == tenantId).Select(t => t.Country).FirstOrDefaultAsync();
            return Utilities.CountryProfile.Get(country).BillsWithStripe;
        }

        /// <summary>Respuesta del checkout de Stripe con los nombres que ya leen las pantallas (initPoint / paymentUrl).</summary>
        internal static async Task<IActionResult> CheckoutResponseAsync(ControllerBase controller, IStripeBillingService billing, ApplicationDbContext db, Guid tenantId, string? planCode, string? returnPath)
        {
            var baseUrl = await TenantBaseUrlAsync(controller.HttpContext, db, tenantId);
            if (baseUrl == null) return controller.BadRequest(new { error = "Negocio no encontrado" });
            var result = await billing.CreateSubscriptionCheckoutAsync(tenantId, planCode, baseUrl, returnPath);
            if (!result.Success || result.Data == null) return controller.BadRequest(new { error = result.Message });
            var data = result.Data;
            if (data.PlanChanged)
                return controller.Ok(new { success = true, planChanged = true, planName = data.PlanName, amount = data.Amount, currency = data.Currency, nextPaymentDate = data.NextPaymentDate });
            return controller.Ok(new
            {
                success = true,
                provider = "stripe",
                checkoutUrl = data.Url,
                initPoint = data.Url,
                paymentUrl = data.Url,
                sessionId = data.SessionId,
                amount = data.Amount,
                currency = data.Currency,
                status = "pending",
            });
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CreateStripeCheckoutDto dto)
        {
            var tenantId = TenantId();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "No tenant context" });
            return await CheckoutResponseAsync(this, _billing, _context, tenantId, dto.PlanCode, dto.ReturnPath);
        }

        [HttpGet("status")]
        public async Task<IActionResult> Status()
        {
            var tenantId = TenantId();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "No tenant context" });
            var sub = await _billing.GetChargingSubscriptionAsync(tenantId, reconcile: true);
            if (sub == null) return Ok(new { hasActiveSubscription = false });
            return Ok(new
            {
                hasActiveSubscription = true,
                status = sub.Status,
                planId = sub.SubscriptionPlanId,
                amount = sub.Amount,
                currency = sub.Currency,
                trialEnd = sub.TrialEnd,
                currentPeriodEnd = sub.CurrentPeriodEnd,
                cancelAtPeriodEnd = sub.CancelAtPeriodEnd,
            });
        }

        [HttpPost("cancel")]
        [Authorize(Roles = "admin,super_admin")]
        public async Task<IActionResult> Cancel()
        {
            var tenantId = TenantId();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "No tenant context" });
            var result = await _billing.CancelSubscriptionAsync(tenantId);
            return result.Success ? Ok(new { success = true, message = result.Message }) : BadRequest(new { error = result.Message });
        }
    }
}
