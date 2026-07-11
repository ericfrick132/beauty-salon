using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Scans subscriptions twice a day and sends:
    ///   - trial_ending_2d  when trial expires in ~2 days (once per tenant per day)
    ///   - trial_expired    when trial just expired          (once per tenant)
    /// De-duplication is done against EmailLog.
    ///
    /// El aviso por WhatsApp sale por la MISMA línea de plataforma que el OTP y el resto del
    /// follow-up (regla: al tenant siempre le escribe el mismo número — antes se delegaba al hub).
    /// El tick entero se difiere a horario activo AR para que ni el email ni el WhatsApp salgan
    /// de madrugada; las ventanas (24h/48h) aguantan el corrimiento de 12h.
    /// </summary>
    public class TrialReminderBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TrialReminderBackgroundService> _logger;
        private static readonly TimeSpan TickInterval = TimeSpan.FromHours(12);

        public TrialReminderBackgroundService(
            IServiceProvider serviceProvider,
            IHttpClientFactory httpClientFactory,
            ILogger<TrialReminderBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("TrialReminderBackgroundService started (interval={Hours}h)", TickInterval.TotalHours);

            // Small delay on boot so we don't hammer the DB during startup migrations.
            try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); }
            catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                var ranTick = false;
                try
                {
                    ranTick = await RunTickAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "TrialReminderBackgroundService tick failed");
                    ranTick = true; // no reintentar en caliente ante un error
                }

                // Fuera de horario AR el tick se difiere: reintento cada hora hasta caer adentro
                // (con 12h fijas, dos ticks seguidos podrían caer ambos de madrugada y no correr nunca).
                var delay = ranTick ? TickInterval : TimeSpan.FromHours(1);
                try { await Task.Delay(delay, stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private async Task<bool> RunTickAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

            if (!WhatsAppLine.WithinActiveHours(config)) return false;

            var now = DateTime.UtcNow;
            var upgradeUrl = $"{(config["FrontendUrl"] ?? "https://turnos-pro.com").TrimEnd('/')}/subscription/upgrade";

            // Pull candidate trial subscriptions (platform table — no tenant filter needed)
            var trialSubs = await db.Subscriptions
                .Where(s => s.Status == "trial" && s.TrialEndsAt != null)
                .ToListAsync(ct);

            _logger.LogInformation("TrialReminder tick: {Count} trial subscriptions in scope", trialSubs.Count);

            foreach (var sub in trialSubs)
            {
                if (ct.IsCancellationRequested) break;
                var trialEndsAt = sub.TrialEndsAt!.Value;
                var hoursLeft = (trialEndsAt - now).TotalHours;

                // Window: about 2 days out
                if (hoursLeft > 36 && hoursLeft <= 60)
                {
                    await TrySendOncePerDayAsync(db, emailService, config, sub, "trial_ending_2d", upgradeUrl, daysLeft: 2, ct);
                }
                // Recently expired (within 48h of expiry)
                else if (hoursLeft <= 0 && hoursLeft >= -48)
                {
                    await TrySendOnceAsync(db, emailService, config, sub, "trial_expired", upgradeUrl, daysLeft: 0, ct);
                }
            }
            return true;
        }

        private async Task TrySendOncePerDayAsync(
            ApplicationDbContext db,
            IEmailService emailService,
            IConfiguration config,
            Subscription sub,
            string templateKey,
            string upgradeUrl,
            int daysLeft,
            CancellationToken ct)
        {
            var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == sub.TenantId, ct);
            if (tenant == null || string.IsNullOrWhiteSpace(tenant.OwnerEmail)) return;

            var since = DateTime.UtcNow.AddHours(-20); // strict: one per ~day
            var alreadySent = await db.EmailLogs.AnyAsync(l =>
                l.TenantId == sub.TenantId &&
                l.TemplateKey == templateKey &&
                l.Status == "sent" &&
                l.CreatedAt >= since, ct);

            if (alreadySent) return;

            try
            {
                var recipient = !string.IsNullOrWhiteSpace(tenant.BusinessName)
                    ? tenant.BusinessName
                    : tenant.OwnerEmail;
                // Link al panel del tenant (no genérico): cae en SU cuenta para suscribirse.
                var tenantUpgradeUrl = !string.IsNullOrWhiteSpace(tenant.Subdomain)
                    ? $"https://{tenant.Subdomain}.turnos-pro.com/subscription/upgrade"
                    : upgradeUrl;
                await emailService.SendTrialEndingAsync(tenant.OwnerEmail, recipient, daysLeft, tenantUpgradeUrl, sub.TenantId);

                // WhatsApp por la línea de plataforma (la misma del OTP): el tenant ve siempre el mismo número.
                if (!string.IsNullOrWhiteSpace(tenant.OwnerPhone))
                {
                    var waText = daysLeft > 0
                        ? $"buenas! te quedan {daysLeft} días de prueba en turnospro 🙌 si te está sirviendo, activá tu plan acá: {tenantUpgradeUrl}[[next]]y si algo no te cerró contame por acá, te doy una mano"
                        : $"buenas! se te venció la prueba de turnospro. la reactivás acá y seguís con tu agenda como estaba: {tenantUpgradeUrl}[[next]]si te quedó alguna duda escribime por acá";
                    var waResult = await WhatsAppLine.SendAsync(_httpClientFactory, config, _logger, "TrialReminder", tenant.OwnerPhone, waText, ct);
                    if (waResult == WaSendResult.Sent) WhatsAppLine.RecordSend(config);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send {Template} to tenant {Tenant}", templateKey, sub.TenantId);
            }
        }

        private async Task TrySendOnceAsync(
            ApplicationDbContext db,
            IEmailService emailService,
            IConfiguration config,
            Subscription sub,
            string templateKey,
            string upgradeUrl,
            int daysLeft,
            CancellationToken ct)
        {
            var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == sub.TenantId, ct);
            if (tenant == null || string.IsNullOrWhiteSpace(tenant.OwnerEmail)) return;

            var alreadySent = await db.EmailLogs.AnyAsync(l =>
                l.TenantId == sub.TenantId &&
                l.TemplateKey == templateKey &&
                l.Status == "sent", ct);

            if (alreadySent) return;

            try
            {
                var recipient = !string.IsNullOrWhiteSpace(tenant.BusinessName)
                    ? tenant.BusinessName
                    : tenant.OwnerEmail;
                // Link al panel del tenant (no genérico): cae en SU cuenta para suscribirse.
                var tenantUpgradeUrl = !string.IsNullOrWhiteSpace(tenant.Subdomain)
                    ? $"https://{tenant.Subdomain}.turnos-pro.com/subscription/upgrade"
                    : upgradeUrl;
                await emailService.SendTrialEndingAsync(tenant.OwnerEmail, recipient, daysLeft, tenantUpgradeUrl, sub.TenantId);

                // WhatsApp por la línea de plataforma (la misma del OTP): el tenant ve siempre el mismo número.
                if (!string.IsNullOrWhiteSpace(tenant.OwnerPhone))
                {
                    var waText = daysLeft > 0
                        ? $"buenas! te quedan {daysLeft} días de prueba en turnospro 🙌 si te está sirviendo, activá tu plan acá: {tenantUpgradeUrl}[[next]]y si algo no te cerró contame por acá, te doy una mano"
                        : $"buenas! se te venció la prueba de turnospro. la reactivás acá y seguís con tu agenda como estaba: {tenantUpgradeUrl}[[next]]si te quedó alguna duda escribime por acá";
                    var waResult = await WhatsAppLine.SendAsync(_httpClientFactory, config, _logger, "TrialReminder", tenant.OwnerPhone, waText, ct);
                    if (waResult == WaSendResult.Sent) WhatsAppLine.RecordSend(config);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send {Template} to tenant {Tenant}", templateKey, sub.TenantId);
            }
        }
    }
}
