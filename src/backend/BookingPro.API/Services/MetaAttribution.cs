using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Datos de atribución de Meta que puede traer cualquier alta (web, bot de WhatsApp, form
    /// de leads). Los DTOs de registro lo implementan para que el mapeo al Tenant sea uno solo.
    /// </summary>
    public interface IMetaAttributionSource
    {
        string? UtmSource { get; }
        string? UtmMedium { get; }
        string? UtmCampaign { get; }
        /// <summary>utm_content: en los links de anuncios va {{ad.id}} → id del anuncio.</summary>
        string? UtmContent { get; }
        string? Fbclid { get; }
        string? Fbp { get; }
        /// <summary>Click id de click-to-WhatsApp (externalAdReply.ctwaClid).</summary>
        string? CtwaClid { get; }
        string? MetaAdId { get; }
        string? MetaAdsetId { get; }
        string? MetaCampaignId { get; }
    }

    /// <summary>DTO plano de atribución (lo que devuelve sales-hub y lo que mandan los frontends).</summary>
    public class MetaAttributionDto : IMetaAttributionSource
    {
        public string? UtmSource { get; set; }
        public string? UtmMedium { get; set; }
        public string? UtmCampaign { get; set; }
        public string? UtmContent { get; set; }
        public string? Fbclid { get; set; }
        public string? Fbp { get; set; }
        public string? CtwaClid { get; set; }
        public string? MetaAdId { get; set; }
        public string? MetaAdsetId { get; set; }
        public string? MetaCampaignId { get; set; }
        /// <summary>"ctwa" | "leadgen" | "web" | "hub" — de dónde salió la atribución.</summary>
        public string? Source { get; set; }

        public bool HasAdAttribution =>
            !string.IsNullOrWhiteSpace(CtwaClid) || !string.IsNullOrWhiteSpace(MetaAdId)
            || !string.IsNullOrWhiteSpace(Fbclid) || !string.IsNullOrWhiteSpace(UtmContent);
    }

    public static class MetaAttribution
    {
        /// <summary>Copia la atribución al tenant. Sin overwrite solo llena lo que está vacío.</summary>
        public static bool Apply(Tenant tenant, IMetaAttributionSource? src, string? attributionSource = null, bool overwrite = false)
        {
            if (src == null) return false;
            var changed = false;
            changed |= Set(v => tenant.UtmSource = v, tenant.UtmSource, src.UtmSource, 100, overwrite);
            changed |= Set(v => tenant.UtmMedium = v, tenant.UtmMedium, src.UtmMedium, 100, overwrite);
            changed |= Set(v => tenant.UtmCampaign = v, tenant.UtmCampaign, src.UtmCampaign, 200, overwrite);
            changed |= Set(v => tenant.UtmContent = v, tenant.UtmContent, src.UtmContent, 200, overwrite);
            changed |= Set(v => tenant.Fbclid = v, tenant.Fbclid, src.Fbclid, 255, overwrite);
            changed |= Set(v => tenant.Fbp = v, tenant.Fbp, src.Fbp, 100, overwrite);
            changed |= Set(v => tenant.CtwaClid = v, tenant.CtwaClid, src.CtwaClid, 255, overwrite);
            var adId = FirstNonEmpty(src.MetaAdId, LooksLikeMetaId(src.UtmContent) ? src.UtmContent : null);
            changed |= Set(v => tenant.MetaAdId = v, tenant.MetaAdId, adId, 50, overwrite);
            changed |= Set(v => tenant.MetaAdsetId = v, tenant.MetaAdsetId, src.MetaAdsetId, 50, overwrite);
            changed |= Set(v => tenant.MetaCampaignId = v, tenant.MetaCampaignId, src.MetaCampaignId, 50, overwrite);
            if (changed)
            {
                var source = attributionSource ?? (src as MetaAttributionDto)?.Source
                             ?? (!string.IsNullOrWhiteSpace(src.CtwaClid) ? "ctwa" : "web");
                if (overwrite || string.IsNullOrWhiteSpace(tenant.MetaAttributionSource))
                    tenant.MetaAttributionSource = source;
                tenant.MetaAttributionAt ??= DateTime.UtcNow;
            }
            return changed;
        }

        /// <summary>Evento CAPI con todos los identificadores que tenemos del tenant.</summary>
        public static MetaCapiEvent EventFor(Tenant tenant, string eventName, string eventId,
            decimal? value = null, string? currency = null, decimal? predictedLtv = null, string? orderId = null)
        {
            return new MetaCapiEvent
            {
                EventName = eventName,
                EventId = eventId,
                EventTime = DateTime.UtcNow,
                Email = tenant.OwnerEmail,
                Phone = tenant.OwnerPhone,
                Fbclid = tenant.Fbclid,
                Fbp = tenant.Fbp,
                CtwaClid = tenant.CtwaClid,
                ExternalId = $"tenant-{tenant.Id}",
                Value = value,
                Currency = currency ?? "ARS",
                PredictedLtv = predictedLtv,
                OrderId = orderId
            };
        }

        public static bool HasAdAttribution(Tenant t) =>
            !string.IsNullOrWhiteSpace(t.CtwaClid) || !string.IsNullOrWhiteSpace(t.MetaAdId) || !string.IsNullOrWhiteSpace(t.Fbclid);

        private static bool LooksLikeMetaId(string? s) => !string.IsNullOrWhiteSpace(s) && s.Length >= 10 && s.All(char.IsDigit);
        private static string? FirstNonEmpty(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

        private static bool Set(Action<string?> setter, string? current, string? incoming, int max, bool overwrite)
        {
            if (string.IsNullOrWhiteSpace(incoming)) return false;
            if (!overwrite && !string.IsNullOrWhiteSpace(current)) return false;
            var v = incoming.Trim();
            if (v.Length > max) v = v[..max];
            if (v == current) return false;
            setter(v);
            return true;
        }
    }

    /// <summary>
    /// Completa la atribución de un tenant recién creado preguntándole a sales-hub (que ve el
    /// externalAdReply del CTWA y los leads de formularios). Fire-and-forget con scope propio.
    /// </summary>
    public interface IMetaAttributionEnricher
    {
        void Enqueue(Guid tenantId);
    }

    public class MetaAttributionEnricher : IMetaAttributionEnricher
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<MetaAttributionEnricher> _log;

        public MetaAttributionEnricher(IServiceScopeFactory scopes, ILogger<MetaAttributionEnricher> log)
        {
            _scopes = scopes; _log = log;
        }

        public void Enqueue(Guid tenantId)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(3));
                    using var scope = _scopes.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var hub = scope.ServiceProvider.GetRequiredService<ISalesHubHubClient>();

                    var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
                    if (tenant == null || MetaAttribution.HasAdAttribution(tenant)) return;

                    var attr = await hub.GetAttributionAsync(tenant.OwnerPhone, tenant.OwnerEmail);
                    if (attr == null || !attr.HasAdAttribution) return;

                    if (MetaAttribution.Apply(tenant, attr, attr.Source ?? "hub"))
                    {
                        tenant.UpdatedAt = DateTime.UtcNow;
                        await db.SaveChangesAsync();
                        _log.LogInformation("Atribución Meta completada desde sales-hub para tenant {TenantId}: ad={AdId} ctwa={Ctwa}",
                            tenantId, tenant.MetaAdId, tenant.CtwaClid != null);
                    }
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "No se pudo enriquecer la atribución del tenant {TenantId}", tenantId);
                }
            });
        }
    }
}

namespace BookingPro.API.Services
{
    /// <summary>Campos de atribución Meta que puede mandar cualquier alta. Los DTOs de registro heredan de acá.</summary>
    public abstract class MetaAttributionFieldsDto : IMetaAttributionSource
    {
        [System.ComponentModel.DataAnnotations.StringLength(100)]
        public string? UtmSource { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(100)]
        public string? UtmMedium { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(200)]
        public string? UtmCampaign { get; set; }
        /// <summary>utm_content = {{ad.id}} en los links de anuncios.</summary>
        [System.ComponentModel.DataAnnotations.StringLength(200)]
        public string? UtmContent { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(255)]
        public string? Fbclid { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(100)]
        public string? Fbp { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(255)]
        public string? CtwaClid { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(50)]
        public string? MetaAdId { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(50)]
        public string? MetaAdsetId { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(50)]
        public string? MetaCampaignId { get; set; }
        /// <summary>"ctwa" | "leadgen" | "web" | "hub" — lo manda sales-hub según el origen del lead.</summary>
        [System.ComponentModel.DataAnnotations.StringLength(30)]
        public string? AttributionSource { get; set; }
    }
}
