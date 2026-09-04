namespace BookingPro.API.Services
{
    public interface IMetaCapiService
    {
        Task SendEventAsync(MetaCapiEvent ev, CancellationToken ct = default);
    }

    public class MetaCapiEvent
    {
        /// <summary>Standard Meta event name (PageView, Lead, InitiateCheckout, CompleteRegistration, Subscribe, Purchase, etc.)</summary>
        public string EventName { get; set; } = string.Empty;

        /// <summary>Stable id used by Meta to deduplicate the same event reported by the browser pixel + CAPI within 48h.</summary>
        public string? EventId { get; set; }

        public DateTime EventTime { get; set; } = DateTime.UtcNow;
        public string? EventSourceUrl { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Fbclid { get; set; }
        /// <summary>Cookie _fbp del browser (si la app la capturó). Mejora el match rate.</summary>
        public string? Fbp { get; set; }
        /// <summary>Id estable del cliente en nuestra DB (tenant id). Va hasheado como external_id.</summary>
        public string? ExternalId { get; set; }
        public string? ClientIpAddress { get; set; }
        public string? ClientUserAgent { get; set; }

        /// <summary>
        /// Click-to-WhatsApp click id (externalAdReply.ctwaClid del primer mensaje del lead).
        /// Si está presente el evento se manda con action_source=business_messaging +
        /// messaging_channel=whatsapp, que es lo que Meta exige para atribuir compras a un CTWA.
        /// </summary>
        public string? CtwaClid { get; set; }

        /// <summary>Override explícito de action_source (default: "business_messaging" si hay CtwaClid, si no "website").</summary>
        public string? ActionSource { get; set; }

        // Optional commerce data
        public decimal? Value { get; set; }
        public string? Currency { get; set; }
        /// <summary>LTV estimado del cliente (Meta lo usa para optimizar a valor en Subscribe).</summary>
        public decimal? PredictedLtv { get; set; }
        /// <summary>Id del pago/orden (custom_data.order_id) — dedup adicional del lado de Meta.</summary>
        public string? OrderId { get; set; }
    }
}
