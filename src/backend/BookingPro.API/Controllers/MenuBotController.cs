using BookingPro.API.Data;
using BookingPro.API.Models.Constants;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Asistente de WhatsApp por menú (add-on menu_bot): estado, configuración y estadísticas.
    /// La compra va por /api/feature-addons/purchase con code=menu_bot (self-checkout de Mercado Pago).
    /// </summary>
    [ApiController]
    [Route("api/menu-bot")]
    [Authorize(Roles = "admin,super_admin")]
    public class MenuBotController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWhatsAppMenuBotService _bot;
        private readonly IFeatureAddonService _addons;
        private readonly IWhatsAppConnectionService _whatsApp;

        public MenuBotController(ApplicationDbContext context, IWhatsAppMenuBotService bot,
            IFeatureAddonService addons, IWhatsAppConnectionService whatsApp)
        {
            _context = context;
            _bot = bot;
            _addons = addons;
            _whatsApp = whatsApp;
        }

        private Guid GetTenantId()
        {
            var tid = User.FindFirst("tenant_id")?.Value ?? User.FindFirst("tenantId")?.Value;
            return Guid.TryParse(tid, out var id) ? id : Guid.Empty;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var addonActive = await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.MenuBot);
            var settings = await _bot.GetOrCreateSettingsAsync(tenantId);
            var connection = await _whatsApp.GetConnectionByTenantIdAsync(tenantId);
            var whatsAppConnected = connection != null && connection.Status == "open";

            var since = DateTime.UtcNow.AddDays(-30);
            var sessions = await _context.MenuBotSessions.IgnoreQueryFilters()
                .Where(s => s.TenantId == tenantId && s.LastMessageAt >= since)
                .Select(s => new { s.MessagesIn, s.BookingsCreated, s.BookingsCancelled, s.LastMessageAt, s.Phone, s.ContactName, s.Step })
                .ToListAsync();

            return Ok(new
            {
                addonActive,
                enabled = settings.Enabled,
                active = addonActive && settings.Enabled && whatsAppConnected,
                whatsAppConnected,
                connectedPhone = connection?.ConnectedPhone,
                blockedReason = whatsAppConnected ? null : "Conectá el WhatsApp del negocio escaneando el QR en Mensajería: el asistente contesta desde tu propio número.",
                settings = new
                {
                    settings.CancellationCutoffHours,
                    settings.MinBookingAdvanceMinutes,
                    settings.DaysToOffer,
                    settings.InfoText,
                },
                stats = new
                {
                    conversations = sessions.Count,
                    messages = sessions.Sum(s => s.MessagesIn),
                    bookingsCreated = sessions.Sum(s => s.BookingsCreated),
                    bookingsCancelled = sessions.Sum(s => s.BookingsCancelled),
                },
                recent = sessions.OrderByDescending(s => s.LastMessageAt).Take(10)
                    .Select(s => new { s.Phone, s.ContactName, s.Step, s.LastMessageAt, s.BookingsCreated }),
            });
        }

        public class UpdateSettingsRequest
        {
            public bool? Enabled { get; set; }
            public int? CancellationCutoffHours { get; set; }
            public int? MinBookingAdvanceMinutes { get; set; }
            public int? DaysToOffer { get; set; }
            public string? InfoText { get; set; }
        }

        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            if (request.Enabled == true && !await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.MenuBot))
                return BadRequest(new { error = "El asistente no está contratado." });

            var settings = await _bot.GetOrCreateSettingsAsync(tenantId);
            if (request.Enabled.HasValue) settings.Enabled = request.Enabled.Value;
            if (request.CancellationCutoffHours.HasValue) settings.CancellationCutoffHours = Math.Clamp(request.CancellationCutoffHours.Value, 0, 168);
            if (request.MinBookingAdvanceMinutes.HasValue) settings.MinBookingAdvanceMinutes = Math.Clamp(request.MinBookingAdvanceMinutes.Value, 0, 10080);
            if (request.DaysToOffer.HasValue) settings.DaysToOffer = Math.Clamp(request.DaysToOffer.Value, 1, 30);
            if (request.InfoText != null) settings.InfoText = string.IsNullOrWhiteSpace(request.InfoText) ? null : request.InfoText.Trim();
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Configuración guardada." });
        }

        /// <summary>Simula un mensaje entrante para ver qué contestaría el bot, sin mandar nada por WhatsApp.</summary>
        public class PreviewRequest { public string Text { get; set; } = "hola"; }

        [HttpPost("preview")]
        public async Task<IActionResult> Preview([FromBody] PreviewRequest request)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            if (!await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.MenuBot))
                return BadRequest(new { error = "El asistente no está contratado." });

            // Teléfono de prueba propio del panel: no pisa la conversación de un cliente real.
            var reply = await _bot.HandleIncomingMessageAsync(tenantId, "preview-panel", "Prueba", request.Text);
            return Ok(new { reply });
        }
    }
}
