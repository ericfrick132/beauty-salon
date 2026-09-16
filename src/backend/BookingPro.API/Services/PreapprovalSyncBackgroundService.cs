using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Red de seguridad del webhook de preapprovals: cada 15 minutos consulta a MP todas las
    /// preapprovals pending (las más nuevas primero, de a una con 500 ms de hueco) y aplica su estado
    /// real con ProcessPreapprovalWebhookAsync. Si el webhook no llegó o falló, el negocio que autorizó
    /// la tarjeta igual queda activo.
    ///
    /// Checkout abandonado: si después de consultar MP sigue pending a las 48 h, pasa a "expired" solo
    /// en la base (no se cancela en MP ni se toca el tenant) para no revisarla para siempre. Si igual se
    /// autoriza después, el webhook la encuentra por MercadoPagoPreapprovalId y la activa.
    /// </summary>
    public class PreapprovalSyncBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PreapprovalSyncBackgroundService> _logger;
        private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan DelayBetweenCalls = TimeSpan.FromMilliseconds(500);
        private static readonly TimeSpan AbandonedAfter = TimeSpan.FromHours(48);
        private static readonly TimeSpan UnreachableAfter = TimeSpan.FromDays(7);

        public PreapprovalSyncBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<PreapprovalSyncBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("PreapprovalSyncBackgroundService started (interval={Minutes}m)", TickInterval.TotalMinutes);

            // Arranque diferido como los otros hosted services: no pegarle a la base durante las migraciones.
            try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); }
            catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try { await RunTickAsync(stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { _logger.LogError(ex, "PreapprovalSync tick failed"); }

                try { await Task.Delay(TickInterval, stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private async Task RunTickAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Todas las pending, las más nuevas primero: son las que tienen un negocio esperando del
            // otro lado del checkout. Las viejas se consultan igual y al final del tick se expiran.
            var pending = await db.TenantPreapprovals
                .AsNoTracking()
                .Where(p => p.Status == "pending")
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new { p.Id, p.MercadoPagoPreapprovalId, p.CreatedAt })
                .ToListAsync(ct);

            if (pending.Count == 0) return;

            var synced = 0;
            var failed = 0;
            var answeredIds = new HashSet<Guid>();
            foreach (var item in pending)
            {
                ct.ThrowIfCancellationRequested();

                // Un scope por preapproval: si un SaveChanges falla, la entidad no queda en el change
                // tracker arrastrando el error a todas las que siguen.
                using (var itemScope = _serviceProvider.CreateScope())
                {
                    var preapprovals = itemScope.ServiceProvider.GetRequiredService<IPreapprovalService>();
                    var result = await preapprovals.ProcessPreapprovalWebhookAsync(item.MercadoPagoPreapprovalId, "sync");
                    if (result.Success) { synced++; answeredIds.Add(item.Id); } else failed++;
                }

                await Task.Delay(DelayBetweenCalls, ct);
            }

            // Checkout abandonado: si MP contestó que sigue pending y tiene más de 48 h, pasa a expired. Si
            // la consulta a MP falló no se da por abandonada (podría estar autorizada), salvo que ya tenga
            // más de 7 días: una preapproval que MP no conoce no se consulta para siempre.
            var abandonedBefore = DateTime.UtcNow - AbandonedAfter;
            var unreachableBefore = DateTime.UtcNow - UnreachableAfter;
            var oldIds = pending
                .Where(p => p.CreatedAt < abandonedBefore && (answeredIds.Contains(p.Id) || p.CreatedAt < unreachableBefore))
                .Select(p => p.Id).ToList();
            var expired = 0;
            if (oldIds.Count > 0)
            {
                var stillPending = await db.TenantPreapprovals
                    .Where(p => oldIds.Contains(p.Id) && p.Status == "pending")
                    .ToListAsync(ct);
                foreach (var p in stillPending)
                {
                    p.Status = "expired";
                    p.UpdatedAt = DateTime.UtcNow;
                }
                await db.SaveChangesAsync(ct);
                expired = stillPending.Count;
            }

            _logger.LogInformation(
                "PreapprovalSync tick: {Total} pending checked, {Synced} synced, {Failed} failed, {Expired} expired",
                pending.Count, synced, failed, expired);
        }
    }
}
