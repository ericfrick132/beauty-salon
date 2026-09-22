using BookingPro.API.Data;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Detección automática de transferencias: cada IntervalMinutes (default 10) concilia los cobros
    /// de Mercado Pago de todos los negocios con el add-on activo, y cada minuto cruza los
    /// comprobantes que llegaron por WhatsApp (confirmación en el chat en menos de un minuto).
    /// Corre fuera de un request: todo usa IgnoreQueryFilters con el TenantId explícito.
    /// </summary>
    public class TransferDetectionBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TransferDetectionBackgroundService> _logger;

        public TransferDetectionBackgroundService(IServiceProvider serviceProvider, IConfiguration configuration, ILogger<TransferDetectionBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_configuration.GetValue("TransferDetection:Enabled", true))
            {
                _logger.LogInformation("Detección de transferencias deshabilitada por configuración");
                return;
            }
            var interval = TimeSpan.FromMinutes(_configuration.GetValue("TransferDetection:IntervalMinutes", 10));
            var lookbackDays = _configuration.GetValue("TransferDetection:LookbackDays", 3);
            _logger.LogInformation("Detección de transferencias HABILITADA: cada {Interval} min, mirando {Days} días para atrás", interval.TotalMinutes, lookbackDays);

            try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (OperationCanceledException) { return; }

            var lastFull = DateTime.MinValue;
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    if (DateTime.UtcNow - lastFull >= interval) { await RunFullAsync(lookbackDays, stoppingToken); lastFull = DateTime.UtcNow; }
                    await RunReceiptClaimsAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { _logger.LogError(ex, "Error en la detección de transferencias"); }

                try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (OperationCanceledException) { break; }
            }
        }

        private async Task RunFullAsync(int lookbackDays, CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var now = DateTime.UtcNow;

            // Negocios con el add-on pago y vigente, Mercado Pago conectado y el switch prendido.
            var withAddon = await context.TenantFeatureAddons.IgnoreQueryFilters()
                .Where(a => a.AddonCode == FeatureCodes.TransferDetection && a.Status == "active" && a.PaidUntil != null && a.PaidUntil > now)
                .Select(a => a.TenantId).Distinct().ToListAsync(ct);
            if (withAddon.Count == 0)
            {
                _logger.LogInformation("Detección de transferencias: ningún negocio con el add-on activo");
                return;
            }
            var withMp = await context.Set<MercadoPagoOAuthConfiguration>().IgnoreQueryFilters()
                .Where(c => c.IsActive && withAddon.Contains(c.TenantId)).Select(c => c.TenantId).Distinct().ToListAsync(ct);
            var disabled = await context.TransferDetectionSettings.IgnoreQueryFilters()
                .Where(s => !s.Enabled && withMp.Contains(s.TenantId)).Select(s => s.TenantId).ToListAsync(ct);
            var startedAt = await context.TransferDetectionSettings.IgnoreQueryFilters()
                .Where(s => withMp.Contains(s.TenantId)).ToDictionaryAsync(s => s.TenantId, s => s.StartedAt, ct);

            var targets = withMp.Except(disabled).ToList();
            var applied = 0; var pending = 0;
            foreach (var tenantId in targets)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    var from = now.AddDays(-lookbackDays);
                    if (startedAt.TryGetValue(tenantId, out var started) && started.HasValue && started.Value > from) from = started.Value;

                    using var tenantScope = _serviceProvider.CreateScope();
                    var service = tenantScope.ServiceProvider.GetRequiredService<ITransferDetectionService>();
                    await service.GetOrCreateSettingsAsync(tenantId);
                    var result = await service.ReconcileAsync(tenantId, from, now);
                    if (result.Error != null) { _logger.LogWarning("Detección de transferencias del tenant {TenantId} falló: {Error}", tenantId, result.Error); continue; }

                    var ctx2 = tenantScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var settings = await ctx2.TransferDetectionSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);
                    if (settings != null) { settings.LastRunAt = now; await ctx2.SaveChangesAsync(ct); }

                    applied += result.Applied; pending += result.Pending;
                    if (result.Applied > 0 || result.Pending > 0)
                        _logger.LogInformation("Tenant {TenantId}: {Applied} pagos aplicados, {Pending} sin validar de {Scanned} cobros", tenantId, result.Applied, result.Pending, result.Scanned);
                }
                catch (Exception ex) { _logger.LogError(ex, "Error detectando transferencias del tenant {TenantId}", tenantId); }
            }
            _logger.LogInformation("Detección de transferencias: {Applied} aplicados y {Pending} sin validar en {Tenants} negocios", applied, pending, targets.Count);
        }

        private async Task RunReceiptClaimsAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var tenantIds = await context.WhatsAppReceiptClaims.IgnoreQueryFilters()
                .Where(c => c.Status == ReceiptClaimStatus.Pending).Select(c => c.TenantId).Distinct().ToListAsync(ct);
            foreach (var tenantId in tenantIds)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    using var tenantScope = _serviceProvider.CreateScope();
                    var service = tenantScope.ServiceProvider.GetRequiredService<ITransferDetectionService>();
                    var resolved = await service.ProcessReceiptClaimsAsync(tenantId);
                    if (resolved > 0) _logger.LogInformation("Tenant {TenantId}: {Count} comprobantes de WhatsApp confirmados", tenantId, resolved);
                }
                catch (Exception ex) { _logger.LogError(ex, "Error cruzando comprobantes del tenant {TenantId}", tenantId); }
            }
        }
    }
}
