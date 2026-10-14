using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Manda por Meta CAPI el evento estándar StartTrial cuando un negocio arranca la prueba gratis
    /// (alta del tenant con suscripción en trial). Usa los mismos user_data que Subscribe/Purchase
    /// (MetaAttribution.EventFor: email/teléfono del dueño, fbclid, fbp, ctwa_clid, external_id).
    ///
    /// event_id = <see cref="EventIdFor"/> ("tenant-{id}-StartTrial"): el front lo arma igual con el
    /// tenantId que devuelve el registro y lo pasa como eventID al fbq, así Meta deduplica.
    /// Fire-and-forget con su propio scope: nunca frena ni rompe el alta.
    /// </summary>
    public interface IMetaTrialTracker
    {
        void SendStartTrial(Guid tenantId, string? clientIp = null, string? userAgent = null, string? sourceUrl = null);
    }

    public class MetaTrialTracker : IMetaTrialTracker
    {
        public const string EventName = "StartTrial";
        public static string EventIdFor(Guid tenantId) => $"tenant-{tenantId}-{EventName}";

        private readonly IServiceScopeFactory _scopes;
        private readonly IMetaCapiService _capi;
        private readonly ILogger<MetaTrialTracker> _log;

        public MetaTrialTracker(IServiceScopeFactory scopes, IMetaCapiService capi, ILogger<MetaTrialTracker> log)
        {
            _scopes = scopes; _capi = capi; _log = log;
        }

        public void SendStartTrial(Guid tenantId, string? clientIp = null, string? userAgent = null, string? sourceUrl = null)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopes.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    var tenant = await db.Tenants.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
                    if (tenant == null) return;

                    // Sin atribución en el alta, MetaAttributionEnricher la busca en sales-hub (~3 s + la
                    // consulta). Esperamos a que termine para que el evento salga con el ctwa_clid/ad.
                    if (!MetaAttribution.HasAdAttribution(tenant))
                    {
                        await Task.Delay(TimeSpan.FromSeconds(10));
                        db.ChangeTracker.Clear();
                        tenant = await db.Tenants.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
                        if (tenant == null) return;
                    }

                    var ev = MetaAttribution.EventFor(tenant, EventName, EventIdFor(tenantId), value: 0m);
                    ev.ClientIpAddress = clientIp;
                    ev.ClientUserAgent = userAgent;
                    ev.EventSourceUrl = sourceUrl;
                    await _capi.SendEventAsync(ev);
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "Meta CAPI StartTrial falló para tenant {TenantId}", tenantId);
                }
            });
        }
    }
}
