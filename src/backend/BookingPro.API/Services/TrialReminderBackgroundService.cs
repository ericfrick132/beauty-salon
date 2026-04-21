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
    /// </summary>
    public class TrialReminderBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<TrialReminderBackgroundService> _logger;
        private static readonly TimeSpan TickInterval = TimeSpan.FromHours(12);

        public TrialReminderBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<TrialReminderBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
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
                try
                {
                    await RunTickAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "TrialReminderBackgroundService tick failed");
                }

                try { await Task.Delay(TickInterval, stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private async Task RunTickAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

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
                    await TrySendOncePerDayAsync(db, emailService, sub, "trial_ending_2d", upgradeUrl, daysLeft: 2, ct);
                }
                // Recently expired (within 48h of expiry)
                else if (hoursLeft <= 0 && hoursLeft >= -48)
                {
                    await TrySendOnceAsync(db, emailService, sub, "trial_expired", upgradeUrl, daysLeft: 0, ct);
                }
            }
        }

        private async Task TrySendOncePerDayAsync(
            ApplicationDbContext db,
            IEmailService emailService,
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
                await emailService.SendTrialEndingAsync(tenant.OwnerEmail, recipient, daysLeft, upgradeUrl, sub.TenantId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send {Template} to tenant {Tenant}", templateKey, sub.TenantId);
            }
        }

        private async Task TrySendOnceAsync(
            ApplicationDbContext db,
            IEmailService emailService,
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
                await emailService.SendTrialEndingAsync(tenant.OwnerEmail, recipient, daysLeft, upgradeUrl, sub.TenantId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send {Template} to tenant {Tenant}", templateKey, sub.TenantId);
            }
        }
    }
}
