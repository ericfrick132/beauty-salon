using System.Globalization;
using System.Text;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public enum OwnerReportResult { Sent, Nothing, NotConfigured, Failed }

    /// <summary>
    /// Avisos al DUEÑO del negocio por WhatsApp ("a self"): turno nuevo y reporte del día y
    /// de la semana. Se configuran con checkboxes en Mensajería (TenantMessagingSettings).
    /// </summary>
    public interface IOwnerWhatsAppNotifier
    {
        /// <summary>Aviso de turno nuevo. Fire-and-forget: nunca demora ni rompe la creación del turno.</summary>
        void NotifyNewBooking(Guid bookingId, string source);

        /// <summary>Reporte de hoy / ayer / semana. <paramref name="force"/> lo manda aunque no haya nada que contar.</summary>
        Task<OwnerReportResult> SendDailyReportAsync(Guid tenantId, DateTime localToday, bool force, CancellationToken ct = default);

        /// <summary>Mensaje de prueba al número configurado (o el reporte, si se pide).</summary>
        Task<ServiceResult<bool>> SendTestAsync(Guid tenantId, bool report);
    }

    /// <summary>
    /// Por dónde sale el aviso: si el negocio tiene su propia línea conectada, por ella (es
    /// un mensaje a sí mismo: no consume el presupuesto de la línea de plataforma y no abre
    /// un contacto frío). Si no, por la línea de plataforma (<see cref="WhatsAppLine"/>),
    /// que ya le escribe al dueño para OTP y onboarding, respetando su gauge.
    /// </summary>
    public class OwnerWhatsAppNotifier : IOwnerWhatsAppNotifier
    {
        private const string Section = "OwnerNotify";

        private readonly ApplicationDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IWhatsAppConnectionService _line;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<OwnerWhatsAppNotifier> _logger;

        public OwnerWhatsAppNotifier(
            ApplicationDbContext context,
            IServiceScopeFactory scopeFactory,
            IWhatsAppConnectionService line,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<OwnerWhatsAppNotifier> logger)
        {
            _context = context;
            _scopeFactory = scopeFactory;
            _line = line;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public static string? ResolveNotifyPhone(TenantMessagingSettings? settings, Tenant tenant)
        {
            var raw = !string.IsNullOrWhiteSpace(settings?.OwnerNotifyPhone) ? settings!.OwnerNotifyPhone : tenant.OwnerPhone;
            var digits = new string((raw ?? string.Empty).Where(char.IsDigit).ToArray());
            if (digits.StartsWith("00")) digits = digits[2..];
            // Celular argentino cargado "como se marca" (11xxxxxxxx / 011... / 15...): se le pone el país.
            if (digits.StartsWith("0") && digits.Length is 11 or 12) digits = digits[1..];
            if (digits.Length == 10) digits = "549" + digits;
            return digits.Length >= 8 ? digits : null;
        }

        // ==================== Turno nuevo ====================

        public void NotifyNewBooking(Guid bookingId, string source)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var notifier = scope.ServiceProvider.GetRequiredService<IOwnerWhatsAppNotifier>() as OwnerWhatsAppNotifier;
                    if (notifier == null) return;

                    var booking = await db.Bookings.IgnoreQueryFilters().AsNoTracking()
                        .Include(b => b.Customer)
                        .Include(b => b.Service)
                        .Include(b => b.Employee)
                        .FirstOrDefaultAsync(b => b.Id == bookingId);
                    if (booking == null) return;

                    var settings = await db.TenantMessagingSettings.IgnoreQueryFilters().AsNoTracking()
                        .FirstOrDefaultAsync(s => s.TenantId == booking.TenantId);
                    if (settings == null || !settings.OwnerNotifyOnBooking) return;

                    var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == booking.TenantId);
                    if (tenant == null) return;
                    var phone = ResolveNotifyPhone(settings, tenant);
                    if (phone == null) return;

                    var local = TenantClock.ToLocal(booking.StartTime, tenant.TimeZone);
                    var who = ((booking.Customer?.FirstName ?? "") + " " + (booking.Customer?.LastName ?? "")).Trim();
                    if (who.Length == 0) who = "Sin nombre";
                    var via = source switch
                    {
                        "public" => "por la web",
                        "admin" => "desde el panel",
                        "ai_agent" => "por el Agente IA de WhatsApp",
                        _ => "por " + source,
                    };

                    var sb = new StringBuilder();
                    sb.AppendLine($"📅 *Nuevo turno* en {tenant.BusinessName}");
                    sb.AppendLine($"• {local.ToString("ddd dd/MM", new CultureInfo("es-AR"))} {local:HH:mm} · *{booking.Service?.Name ?? "servicio"}* con {booking.Employee?.Name ?? "el equipo"}");
                    sb.Append($"• {who}");
                    if (!string.IsNullOrWhiteSpace(booking.Customer?.Phone)) sb.Append($" · {booking.Customer.Phone}");
                    sb.AppendLine();
                    sb.Append($"• {via}");
                    if (booking.Price.HasValue && booking.Price.Value > 0) sb.Append($" · {Money(booking.Price.Value)}");
                    if (booking.Status == "pending") sb.Append(" · _pendiente de confirmar_");

                    await notifier.SendToOwnerAsync(tenant, phone, sb.ToString(), waitForGauge: false, CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "OwnerNotify: falló el aviso de turno nuevo {BookingId}", bookingId);
                }
            });
        }

        // ==================== Reporte del día y la semana ====================

        public async Task<OwnerReportResult> SendDailyReportAsync(Guid tenantId, DateTime localToday, bool force, CancellationToken ct = default)
        {
            try
            {
                var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
                if (tenant == null) return OwnerReportResult.NotConfigured;
                var settings = await _context.TenantMessagingSettings.IgnoreQueryFilters().AsNoTracking()
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);
                var phone = ResolveNotifyPhone(settings, tenant);
                if (phone == null) return OwnerReportResult.NotConfigured;

                var tz = tenant.TimeZone;
                DateTime Utc(DateTime localDate) => TenantClock.LocalDateToUtc(localDate, tz);

                var today = localToday.Date;
                var yesterday = today.AddDays(-1);
                var tomorrow = today.AddDays(1);
                var isMonday = today.DayOfWeek == DayOfWeek.Monday;
                // Semana en curso: lunes → ayer. Un lunes eso está vacío, así que se cierra la
                // semana pasada completa (lun → dom) y se compara con la anterior.
                var monday = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
                var weekFrom = isMonday ? monday.AddDays(-7) : monday;
                var weekTo = today; // exclusivo
                var prevFrom = weekFrom.AddDays(-7);
                var prevTo = isMonday ? weekFrom : yesterday.AddDays(-7).AddDays(1);

                var bookings = await _context.Bookings.IgnoreQueryFilters().AsNoTracking()
                    .Include(b => b.Employee)
                    .Where(b => b.TenantId == tenantId && b.StartTime >= Utc(prevFrom) && b.StartTime < Utc(tomorrow.AddDays(1)))
                    .Select(b => new { b.StartTime, b.Status, EmployeeName = b.Employee != null ? b.Employee.Name : "equipo" })
                    .ToListAsync(ct);

                var payments = await _context.Payments.IgnoreQueryFilters().AsNoTracking()
                    .Where(p => p.TenantId == tenantId && p.Status == "completed"
                                && p.PaymentDate >= Utc(prevFrom) && p.PaymentDate < Utc(today))
                    .Select(p => new { p.Amount, p.PaymentDate })
                    .ToListAsync(ct);

                bool Active(string s) => s != "cancelled";
                var todayAgenda = bookings.Where(b => b.StartTime >= Utc(today) && b.StartTime < Utc(tomorrow) && Active(b.Status)).ToList();
                var tomorrowCount = bookings.Count(b => b.StartTime >= Utc(tomorrow) && b.StartTime < Utc(tomorrow.AddDays(1)) && Active(b.Status));
                var yBookings = bookings.Where(b => b.StartTime >= Utc(yesterday) && b.StartTime < Utc(today)).ToList();
                var yAttended = yBookings.Count(b => Active(b.Status) && b.Status != "noshow");
                var yCancelled = yBookings.Count(b => b.Status == "cancelled");
                var yNoShow = yBookings.Count(b => b.Status == "noshow");
                var yIncome = payments.Where(p => p.PaymentDate >= Utc(yesterday) && p.PaymentDate < Utc(today)).Sum(p => p.Amount);

                var weekBookings = bookings.Count(b => b.StartTime >= Utc(weekFrom) && b.StartTime < Utc(weekTo) && Active(b.Status));
                var weekIncome = payments.Where(p => p.PaymentDate >= Utc(weekFrom) && p.PaymentDate < Utc(weekTo)).Sum(p => p.Amount);
                var prevBookings = bookings.Count(b => b.StartTime >= Utc(prevFrom) && b.StartTime < Utc(prevTo) && Active(b.Status));
                var prevIncome = payments.Where(p => p.PaymentDate >= Utc(prevFrom) && p.PaymentDate < Utc(prevTo)).Sum(p => p.Amount);

                if (!force && todayAgenda.Count == 0 && yAttended == 0 && yIncome == 0 && weekBookings == 0)
                    return OwnerReportResult.Nothing;

                var name = FirstName(tenant.OwnerName);
                var greet = name == null ? "¡Buen día!" : $"¡Buen día, {name}!";
                var sb = new StringBuilder();
                sb.AppendLine($"📊 {greet} Reporte de *{tenant.BusinessName}* · {today:dd/MM}");
                sb.AppendLine();

                sb.AppendLine($"*Hoy*: {Plural(todayAgenda.Count, "turno")} agendados");
                if (todayAgenda.Count > 0)
                {
                    var byPro = todayAgenda.GroupBy(b => b.EmployeeName).OrderByDescending(g => g.Count()).Take(6)
                        .Select(g => $"{g.Key} {g.Count()}");
                    sb.AppendLine($"   {string.Join(" · ", byPro)}");
                }
                sb.AppendLine($"*Mañana*: {Plural(tomorrowCount, "turno")} ya agendados");
                sb.AppendLine();

                sb.Append($"*Ayer*: {Plural(yAttended, "turno")} · {Money(yIncome)} cobrados");
                if (yCancelled > 0) sb.Append($" · {yCancelled} cancelados");
                if (yNoShow > 0) sb.Append($" · {yNoShow} no vinieron");
                sb.AppendLine();
                sb.AppendLine();

                var weekLabel = isMonday
                    ? $"*Semana pasada* (lun {weekFrom:dd/MM} → dom)"
                    : $"*Semana* (lun {weekFrom:dd/MM} → ayer)";
                sb.AppendLine($"{weekLabel}: {Plural(weekBookings, "turno")} · {Money(weekIncome)} cobrados");
                sb.AppendLine($"   vs. semana anterior: turnos {Delta(weekBookings, prevBookings)} · ingresos {Delta(weekIncome, prevIncome)}");
                sb.AppendLine();
                sb.Append("_Reporte automático de Turnos Pro. Lo configurás en Mensajería → Avisos a tu WhatsApp._");

                var ok = await SendToOwnerAsync(tenant, phone, sb.ToString(), waitForGauge: true, ct);
                return ok ? OwnerReportResult.Sent : OwnerReportResult.Failed;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OwnerNotify: falló el reporte diario del tenant {TenantId}", tenantId);
                return OwnerReportResult.Failed;
            }
        }

        // ==================== Prueba ====================

        public async Task<ServiceResult<bool>> SendTestAsync(Guid tenantId, bool report)
        {
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null) return ServiceResult<bool>.Fail("Negocio no encontrado");
            var settings = await _context.TenantMessagingSettings.IgnoreQueryFilters().AsNoTracking()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);
            var phone = ResolveNotifyPhone(settings, tenant);
            if (phone == null) return ServiceResult<bool>.Fail("Cargá un número de WhatsApp para los avisos (o el teléfono del dueño en Configuración).");

            if (report)
            {
                var result = await SendDailyReportAsync(tenantId, TenantClock.NowLocal(tenant.TimeZone).Date, force: true);
                return result == OwnerReportResult.Sent
                    ? ServiceResult<bool>.Ok(true, $"Reporte enviado a +{phone}")
                    : ServiceResult<bool>.Fail("No se pudo enviar el reporte. Probá de nuevo en unos minutos.");
            }

            var text = $"✅ Listo: los avisos de *{tenant.BusinessName}* van a llegar a este WhatsApp.";
            var ok = await SendToOwnerAsync(tenant, phone, text, waitForGauge: false, CancellationToken.None);
            return ok
                ? ServiceResult<bool>.Ok(true, $"Mensaje enviado a +{phone}")
                : ServiceResult<bool>.Fail("No se pudo enviar el mensaje. Revisá el número o probá más tarde.");
        }

        // ==================== Envío ====================

        internal async Task<bool> SendToOwnerAsync(Tenant tenant, string phone, string text, bool waitForGauge, CancellationToken ct)
        {
            // 1) La línea del propio negocio, si está conectada. Es un mensaje del negocio a
            //    su dueño: no cuenta como contacto frío ni espera hueco (kind Reply), pero
            //    queda registrado en su presupuesto.
            try
            {
                var own = await _line.SendTextAsync(tenant.Id, phone, text, WaSendKind.Reply, "owner_notify");
                if (own.Success) return true;
                if (own.Reason != "not_connected")
                    _logger.LogInformation("OwnerNotify: la línea del tenant {TenantId} no pudo mandar ({Reason}); se usa la de plataforma", tenant.Id, own.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OwnerNotify: error por la línea del tenant {TenantId}; se usa la de plataforma", tenant.Id);
            }

            // 2) Línea de plataforma. El reporte de la mañana sale a la misma hora para muchos
            //    negocios: se respeta el gauge (hueco aleatorio + tope por hora) esperando el
            //    turno, con un techo para no colgar el worker si la línea está saturada.
            if (waitForGauge)
            {
                var deadline = DateTime.UtcNow.AddMinutes(5);
                while (!WhatsAppLine.GaugeReady(_configuration))
                {
                    if (DateTime.UtcNow > deadline) { _logger.LogWarning("OwnerNotify: línea de plataforma saturada, se reintenta más tarde"); return false; }
                    try { await Task.Delay(TimeSpan.FromSeconds(10), ct); } catch (TaskCanceledException) { return false; }
                }
            }

            var result = await WhatsAppLine.SendAsync(_httpClientFactory, _configuration, _logger, Section, phone, text, ct);
            if (result == WaSendResult.Sent)
            {
                WhatsAppLine.RecordSend(_configuration);
                return true;
            }
            _logger.LogWarning("OwnerNotify: envío a {Phone} terminó en {Result}", phone, result);
            return false;
        }

        private static string Money(decimal n) => "$" + Math.Round(n).ToString("N0", new CultureInfo("es-AR"));
        private static string Plural(int n, string singular) => n == 1 ? $"1 {singular}" : $"{n} {singular}s";
        private static string Delta(decimal now, decimal before)
        {
            if (before == 0) return now == 0 ? "=" : "↑ (sin base)";
            var pct = (now - before) / before * 100;
            return pct >= 0 ? $"↑ {pct:0}%" : $"↓ {Math.Abs(pct):0}%";
        }
        private static string? FirstName(string? full) =>
            string.IsNullOrWhiteSpace(full) ? null : full.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)[0];
    }
}
