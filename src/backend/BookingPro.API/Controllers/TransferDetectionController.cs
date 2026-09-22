using BookingPro.API.Data;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Add-on "detección de transferencias": la plata que le entra al negocio por Mercado Pago
    /// se cruza sola contra los turnos con seña/saldo pendiente. Lo que identifica el turno se
    /// aplica solo; el resto queda acá para que el negocio diga de qué turno es.
    /// La compra del add-on va por /api/feature-addons/purchase con code=transfer_detection.
    /// </summary>
    [ApiController]
    [Route("api/transfer-detection")]
    [Authorize(Roles = "admin,super_admin")]
    public class TransferDetectionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITransferDetectionService _service;
        private readonly IFeatureAddonService _addons;
        private readonly IWhatsAppConnectionService _whatsApp;

        public TransferDetectionController(ApplicationDbContext context, ITransferDetectionService service,
            IFeatureAddonService addons, IWhatsAppConnectionService whatsApp)
        {
            _context = context;
            _service = service;
            _addons = addons;
            _whatsApp = whatsApp;
        }

        private Guid GetTenantId()
        {
            var tid = User.FindFirst("tenant_id")?.Value ?? User.FindFirst("tenantId")?.Value;
            return Guid.TryParse(tid, out var id) ? id : Guid.Empty;
        }
        private string By => User?.Identity?.Name ?? "Admin";

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var now = DateTime.UtcNow;
            var addonActive = await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.TransferDetection);
            var settings = await _service.GetOrCreateSettingsAsync(tenantId);
            var mp = await _context.Set<MercadoPagoOAuthConfiguration>().IgnoreQueryFilters().AnyAsync(c => c.TenantId == tenantId && c.IsActive);
            var wa = await _whatsApp.GetConnectionByTenantIdAsync(tenantId);
            var since = now.AddDays(-30);
            var rows = await _context.IncomingPayments.IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId && i.DateApproved >= since)
                .GroupBy(i => i.Status).Select(g => new { Status = g.Key, Count = g.Count(), Amount = g.Sum(x => x.Amount) }).ToListAsync();
            var mappings = await _context.PayerCustomerMappings.IgnoreQueryFilters().CountAsync(m => m.TenantId == tenantId);
            var applied = rows.FirstOrDefault(r => r.Status == IncomingPaymentStatus.Applied);
            var pending = rows.FirstOrDefault(r => r.Status == IncomingPaymentStatus.Pending);
            var ignored = rows.FirstOrDefault(r => r.Status == IncomingPaymentStatus.Ignored);

            return Ok(new
            {
                addonActive,
                enabled = settings.Enabled,
                active = addonActive && settings.Enabled && mp,
                startedAt = settings.StartedAt,
                lastRunAt = settings.LastRunAt,
                mercadoPagoConnected = mp,
                whatsAppConnected = wa != null && wa.Status == "open",
                blockedReason = mp ? null : "Conectá tu cuenta de Mercado Pago (Configuración > MercadoPago): sin eso no podemos leer tus transferencias.",
                detectedLast30 = rows.Sum(r => r.Count),
                pending = pending?.Count ?? 0,
                pendingAmount = pending?.Amount ?? 0,
                applied = applied?.Count ?? 0,
                appliedAmount = applied?.Amount ?? 0,
                ignored = ignored?.Count ?? 0,
                mappings,
                minutesSaved = (applied?.Count ?? 0) * 3,
            });
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPending()
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            var items = await _context.IncomingPayments.IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId && i.Status == IncomingPaymentStatus.Pending)
                .OrderByDescending(i => i.DateApproved).ToListAsync();
            var suggestedIds = items.Where(i => i.SuggestedBookingId.HasValue).Select(i => i.SuggestedBookingId!.Value).Distinct().ToList();
            var suggested = await _context.Bookings.IgnoreQueryFilters()
                .Include(b => b.Customer).Include(b => b.Service).Include(b => b.Employee).Include(b => b.Payments)
                .Where(b => suggestedIds.Contains(b.Id)).ToDictionaryAsync(b => b.Id);
            return Ok(items.Select(i => new
            {
                i.Id, i.MpPaymentId, i.DateApproved, i.Amount, i.PayerName, i.PayerEmail, i.PayerDni, i.PaymentMethodId, i.Description, i.MatchType,
                SuggestedBooking = i.SuggestedBookingId.HasValue && suggested.TryGetValue(i.SuggestedBookingId.Value, out var b) ? TransferDetectionService.ToCandidate(b, i.Amount) : null,
            }));
        }

        [HttpGet("pending/{id:guid}/candidates")]
        public async Task<IActionResult> GetCandidates(Guid id)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            var incoming = await _context.IncomingPayments.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == id && i.TenantId == tenantId);
            if (incoming == null) return NotFound();
            var candidates = await _service.CandidatesAsync(tenantId, incoming);
            return Ok(candidates.OrderByDescending(c => c.AmountMatches).ThenBy(c => c.StartTime));
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int days = 30)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            var since = DateTime.UtcNow.AddDays(-Math.Clamp(days, 1, 365));
            var items = await _context.IncomingPayments.IgnoreQueryFilters()
                .Include(i => i.Booking).ThenInclude(b => b!.Service)
                .Include(i => i.Booking).ThenInclude(b => b!.Customer)
                .Where(i => i.TenantId == tenantId && i.Status != IncomingPaymentStatus.Pending && i.DateApproved >= since)
                .OrderByDescending(i => i.ResolvedAt ?? i.DateApproved).Take(200).ToListAsync();
            return Ok(items.Select(i => new
            {
                i.Id, i.MpPaymentId, i.DateApproved, i.Amount, i.PayerName, Status = (int)i.Status, i.MatchType, i.BookingId,
                BookingLabel = i.Booking == null ? null : $"{i.Booking.Service?.Name} · {TransferDetectionService.When(i.Booking)}" + (TransferDetectionService.CustomerLabel(i.Booking) is { Length: > 0 } n ? $" · {n}" : ""),
                i.ResolvedAt, i.ResolvedBy,
            }));
        }

        public class ResolveRequest { public Guid BookingId { get; set; } public bool Remember { get; set; } = true; }

        [HttpPost("pending/{id:guid}/resolve")]
        public async Task<IActionResult> Resolve(Guid id, [FromBody] ResolveRequest request)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            var (ok, message) = await _service.ResolveAsync(tenantId, id, request.BookingId, request.Remember, By);
            return ok ? Ok(new { message }) : BadRequest(new { error = message, message });
        }

        [HttpPost("pending/{id:guid}/ignore")]
        public async Task<IActionResult> Ignore(Guid id)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            var (ok, message) = await _service.IgnoreAsync(tenantId, id, By);
            return ok ? Ok(new { message }) : BadRequest(new { error = message, message });
        }

        [HttpGet("mappings")]
        public async Task<IActionResult> GetMappings()
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            var mappings = await _context.PayerCustomerMappings.IgnoreQueryFilters().Include(m => m.Customer)
                .Where(m => m.TenantId == tenantId).OrderByDescending(m => m.CreatedAt)
                .Select(m => new { m.Id, m.PayerKey, m.PayerLabel, m.CustomerId, CustomerName = m.Customer.FirstName + " " + m.Customer.LastName, m.CreatedAt })
                .ToListAsync();
            return Ok(mappings);
        }

        [HttpDelete("mappings/{id:guid}")]
        public async Task<IActionResult> DeleteMapping(Guid id)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            var mapping = await _context.PayerCustomerMappings.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);
            if (mapping == null) return NotFound(new { error = "No se encontró la asociación." });
            _context.PayerCustomerMappings.Remove(mapping);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Asociación eliminada." });
        }

        [HttpPost("run")]
        public async Task<IActionResult> Run([FromQuery] int days = 3)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            if (!await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.TransferDetection))
                return BadRequest(new { error = "La detección de transferencias no está activa. Contratala desde esta pantalla." });
            var settings = await _service.GetOrCreateSettingsAsync(tenantId);
            var to = DateTime.UtcNow;
            var from = to.AddDays(-Math.Clamp(days, 1, 90));
            if (settings.StartedAt.HasValue && settings.StartedAt.Value > from) from = settings.StartedAt.Value;
            var result = await _service.ReconcileAsync(tenantId, from, to);
            if (result.Error != null) return BadRequest(new { error = result.Error, result });
            settings.LastRunAt = to;
            await _context.SaveChangesAsync();
            return Ok(new { message = $"{result.Scanned} cobros revisados: {result.Applied} aplicados a turnos, {result.Pending} sin validar.", result });
        }

        public class ToggleRequest { public bool Enabled { get; set; } }

        [HttpPut("enabled")]
        public async Task<IActionResult> SetEnabled([FromBody] ToggleRequest request)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            if (request.Enabled && !await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.TransferDetection))
                return BadRequest(new { error = "El add-on no está contratado." });
            var settings = await _service.GetOrCreateSettingsAsync(tenantId);
            settings.Enabled = request.Enabled;
            if (request.Enabled) settings.StartedAt ??= DateTime.UtcNow;
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = request.Enabled ? "Listo, ya está andando." : "Lo apagamos. Lo podés volver a prender cuando quieras." });
        }
    }
}
