using System.Globalization;
using System.Text;
using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BookingPro.API.Services
{
    public interface IWhatsAppMenuBotService
    {
        /// <summary>
        /// Contesta por menú (sin IA) a un cliente que le escribió a la línea del negocio.
        /// Devuelve null cuando no corresponde responder (conversación derivada a una
        /// persona, o ya se mandó el menú hace poco y el cliente sigue escribiendo).
        /// </summary>
        Task<string?> HandleAsync(Guid tenantId, string senderDigits, string text, CancellationToken ct = default);
    }

    /// <summary>
    /// Bot de respuesta automática por menú: "1 reservar, 2 mis turnos, 3 hablar con una
    /// persona". Es la versión sin costo del Agente IA: no entiende lenguaje natural, pero
    /// nadie que escribe a la línea se queda sin el link para reservar.
    ///
    /// Se activa por tenant (TenantMessagingSettings.AutoReplyBotEnabled) y el Agente IA,
    /// si está pago, tiene prioridad. Memoria corta en IMemoryCache: un menú por contacto
    /// cada 6 h, y silencio 24 h después de "hablar con una persona", para no meterse en
    /// una charla que ya está atendiendo alguien.
    /// </summary>
    public class WhatsAppMenuBotService : IWhatsAppMenuBotService
    {
        private static readonly TimeSpan GreetCooldown = TimeSpan.FromHours(6);
        private static readonly TimeSpan HumanPause = TimeSpan.FromHours(24);

        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly IConfiguration _config;

        public WhatsAppMenuBotService(ApplicationDbContext context, IMemoryCache cache, IConfiguration config)
        {
            _context = context;
            _cache = cache;
            _config = config;
        }

        public async Task<string?> HandleAsync(Guid tenantId, string senderDigits, string text, CancellationToken ct = default)
        {
            var pauseKey = $"wamenu:paused:{tenantId}:{senderDigits}";
            if (_cache.TryGetValue(pauseKey, out _)) return null;

            var tenant = await _context.Tenants.AsNoTracking()
                .Where(t => t.Id == tenantId)
                .Select(t => new { t.BusinessName, t.Subdomain, t.TimeZone })
                .FirstOrDefaultAsync(ct);
            if (tenant == null) return null;

            var option = ParseOption(text);
            var bookUrl = BookingUrl(tenant.Subdomain);

            switch (option)
            {
                case 1:
                    return WhatsAppLine.PickVariant(
                        $"¡Genial! Reservá tu turno acá, elegís el servicio y el horario que te quede mejor 👇\n{bookUrl}" +
                        "[[or]]" +
                        $"Para reservar entrá acá y elegí el servicio y el horario 👇\n{bookUrl}");

                case 2:
                    return await UpcomingBookingsReplyAsync(tenantId, senderDigits, tenant.TimeZone, bookUrl, ct);

                case 3:
                    _cache.Set(pauseKey, true, HumanPause);
                    return "Perfecto, en breve te responde alguien del equipo 🙌";

                default:
                    // Texto libre: mandamos el menú una vez y después dejamos que la persona
                    // del negocio siga la charla sin que el bot se meta en el medio.
                    var greetKey = $"wamenu:greeted:{tenantId}:{senderDigits}";
                    if (_cache.TryGetValue(greetKey, out _)) return null;
                    _cache.Set(greetKey, true, GreetCooldown);
                    return Menu(tenant.BusinessName);
            }
        }

        private static string Menu(string businessName)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"¡Hola! Soy el asistente de *{businessName}* 👋");
            sb.AppendLine();
            sb.AppendLine("1️⃣ Reservar un turno");
            sb.AppendLine("2️⃣ Ver mis próximos turnos");
            sb.AppendLine("3️⃣ Hablar con una persona");
            sb.AppendLine();
            sb.Append("Respondé con el número de la opción.");
            return sb.ToString();
        }

        private async Task<string> UpcomingBookingsReplyAsync(Guid tenantId, string senderDigits, string? timeZone, string bookUrl, CancellationToken ct)
        {
            // Match por sufijo de 8 dígitos: tolera variantes de prefijo AR (549..., 54..., 0..., 15...)
            var suffix = senderDigits.Length <= 8 ? senderDigits : senderDigits[^8..];
            var now = DateTime.UtcNow;

            var bookings = await _context.Bookings
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Include(b => b.Service)
                .Include(b => b.Employee)
                .Include(b => b.Customer)
                .Where(b => b.TenantId == tenantId
                    && b.StartTime > now
                    && (b.Status == "pending" || b.Status == "confirmed")
                    && b.Customer.Phone != null)
                .OrderBy(b => b.StartTime)
                .Take(200)
                .ToListAsync(ct);

            var mine = bookings
                .Where(b => Digits(b.Customer.Phone).EndsWith(suffix))
                .Take(3)
                .ToList();

            if (mine.Count == 0)
                return $"No encontré turnos próximos con este número. Si querés reservar uno, es por acá 👇\n{bookUrl}";

            var sb = new StringBuilder();
            sb.AppendLine(mine.Count == 1 ? "Tu próximo turno:" : "Tus próximos turnos:");
            foreach (var b in mine)
            {
                var local = TenantClock.ToLocal(b.StartTime, timeZone);
                sb.AppendLine($"• {local.ToString("ddd dd/MM", new CultureInfo("es-AR"))} {local:HH:mm} · {b.Service?.Name ?? "servicio"} con {b.Employee?.Name ?? "el equipo"}");
            }
            sb.Append("Si no podés venir, avisanos respondiendo este mensaje 🙏");
            return sb.ToString();
        }

        private string BookingUrl(string subdomain)
        {
            var domain = _config["OnboardingFollowup:AppDomain"] ?? "turnos-pro.com";
            return $"https://{subdomain}.{domain}/book";
        }

        private static int ParseOption(string text)
        {
            var t = Normalize(text);
            if (t is "1" or "1️⃣" || t.StartsWith("1 ") || t.Contains("reservar") || t.Contains("sacar turno") || t.Contains("quiero un turno") || t.Contains("pedir turno"))
                return 1;
            if (t is "2" or "2️⃣" || t.StartsWith("2 ") || t.Contains("mis turnos") || t.Contains("mi turno") || t.Contains("proximo turno"))
                return 2;
            if (t is "3" or "3️⃣" || t.StartsWith("3 ") || t.Contains("persona") || t.Contains("humano") || t.Contains("hablar con"))
                return 3;
            return 0;
        }

        private static string Normalize(string s)
        {
            var formD = (s ?? string.Empty).Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var ch in formD)
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark) sb.Append(ch);
            return sb.ToString().Normalize(NormalizationForm.FormC);
        }

        private static string Digits(string? s) => new((s ?? string.Empty).Where(char.IsDigit).ToArray());
    }
}
