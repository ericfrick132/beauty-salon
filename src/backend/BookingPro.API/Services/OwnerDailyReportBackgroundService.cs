using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Manda a cada negocio con OwnerDailyReportEnabled el reporte del día y la semana a la
    /// hora local configurada (OwnerDailyReportTime, zona del tenant).
    ///
    /// Una vez por día (OwnerDailyReportLastSentOn). Si el proceso estuvo caído se manda con
    /// retraso sólo dentro de una ventana de 3 horas; después el día se da por perdido para
    /// no mandar un "buen día" a la noche.
    /// </summary>
    public class OwnerDailyReportBackgroundService : BackgroundService
    {
        private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(60);
        private static readonly TimeSpan LateWindow = TimeSpan.FromHours(3);
        private static readonly TimeSpan RetryDelay = TimeSpan.FromMinutes(10);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OwnerDailyReportBackgroundService> _logger;
        private readonly Dictionary<Guid, DateTime> _retryAfter = new();

        public OwnerDailyReportBackgroundService(IServiceScopeFactory scopeFactory, ILogger<OwnerDailyReportBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try { await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken); }
            catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try { await ProcessTickAsync(stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { _logger.LogError(ex, "Error mandando reportes diarios a los dueños"); }

                try { await Task.Delay(TickInterval, stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private async Task ProcessTickAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var notifier = scope.ServiceProvider.GetRequiredService<IOwnerWhatsAppNotifier>();

            var enabled = await db.TenantMessagingSettings
                .IgnoreQueryFilters()
                .Where(s => s.OwnerDailyReportEnabled)
                .ToListAsync(ct);
            if (enabled.Count == 0) return;

            var tenantIds = enabled.Select(s => s.TenantId).ToList();
            var zones = await db.Tenants.AsNoTracking()
                .Where(t => tenantIds.Contains(t.Id) && t.Status != "suspended")
                .Select(t => new { t.Id, t.TimeZone })
                .ToDictionaryAsync(t => t.Id, t => t.TimeZone, ct);

            var changed = false;
            foreach (var s in enabled)
            {
                if (!zones.TryGetValue(s.TenantId, out var tz)) continue;

                var nowLocal = TenantClock.NowLocal(tz);
                var today = nowLocal.Date;
                if (!TimeSpan.TryParse(s.OwnerDailyReportTime, out var sendAt)) sendAt = new TimeSpan(8, 30, 0);

                if (s.OwnerDailyReportLastSentOn.HasValue && s.OwnerDailyReportLastSentOn.Value.Date == today) continue;
                if (nowLocal.TimeOfDay < sendAt) continue;

                if (nowLocal.TimeOfDay >= sendAt + LateWindow)
                {
                    s.OwnerDailyReportLastSentOn = DateTime.SpecifyKind(today, DateTimeKind.Utc);
                    changed = true;
                    continue;
                }

                if (_retryAfter.TryGetValue(s.TenantId, out var retryAt) && DateTime.UtcNow < retryAt) continue;

                var result = await notifier.SendDailyReportAsync(s.TenantId, today, force: false, ct);
                switch (result)
                {
                    case OwnerReportResult.Sent:
                    case OwnerReportResult.Nothing:
                    case OwnerReportResult.NotConfigured:
                        s.OwnerDailyReportLastSentOn = DateTime.SpecifyKind(today, DateTimeKind.Utc);
                        _retryAfter.Remove(s.TenantId);
                        changed = true;
                        if (result == OwnerReportResult.Sent)
                            _logger.LogInformation("Reporte diario mandado al dueño del tenant {TenantId}", s.TenantId);
                        break;
                    case OwnerReportResult.Failed:
                        _retryAfter[s.TenantId] = DateTime.UtcNow.Add(RetryDelay);
                        break;
                }
            }

            if (changed) await db.SaveChangesAsync(ct);
        }
    }
}
