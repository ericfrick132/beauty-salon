using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services.Invoicing
{
    /// <summary>
    /// Cada minuto: actualiza el estado de los comprobantes en proceso y, en los negocios con la
    /// facturación automática prendida, manda a facturar los cobros y ventas nuevos.
    /// </summary>
    public class SalonInvoicingBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SalonInvoicingBackgroundService> _logger;

        public SalonInvoicingBackgroundService(IServiceScopeFactory scopeFactory, ILogger<SalonInvoicingBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try { await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken); } catch (OperationCanceledException) { return; }
            while (!stoppingToken.IsCancellationRequested)
            {
                try { await RunOnceAsync(stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { _logger.LogError(ex, "Error en la facturación automática"); }
                try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (OperationCanceledException) { break; }
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            List<(Guid Id, bool Auto, DateTime? Since)> tenants;
            using (var scope = _scopeFactory.CreateScope())
            {
                if (!scope.ServiceProvider.GetRequiredService<IFacturadorClient>().IsConfigured) return;
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var pending = await db.ElectronicInvoices.IgnoreQueryFilters()
                    .Where(i => i.Status == "queued" || i.Status == "processing").Select(i => i.TenantId).Distinct().ToListAsync(ct);
                tenants = (await db.Tenants.IgnoreQueryFilters().AsNoTracking()
                        .Where(t => t.InvoicingCuit != null && (t.AutoInvoice || pending.Contains(t.Id)))
                        .Select(t => new { t.Id, t.AutoInvoice, t.AutoInvoiceSince }).ToListAsync(ct))
                    .Select(t => (t.Id, t.AutoInvoice, t.AutoInvoiceSince)).ToList();
            }

            foreach (var (tenantId, auto, since) in tenants)
            {
                using var scope = _scopeFactory.CreateScope();
                try
                {
                    var invoicing = scope.ServiceProvider.GetRequiredService<SalonInvoicingService>();
                    await invoicing.SyncPendingAsync(tenantId, ct);
                    if (auto)
                    {
                        var keys = await invoicing.PendingAutoKeysAsync(tenantId, since ?? DateTime.UtcNow, ct);
                        if (keys.Count > 0)
                        {
                            var r = await invoicing.InvoiceAsync(tenantId, keys, ct);
                            _logger.LogInformation("Facturación automática tenant {TenantId}: {Queued} en cola, {Failed} con error", tenantId, r.Queued, r.Failed);
                        }
                    }
                }
                catch (FacturadorException ex)
                {
                    _logger.LogWarning("Facturación tenant {TenantId}: {Message}", tenantId, ex.Message);
                }
            }
        }
    }
}
