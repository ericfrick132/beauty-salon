using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Registro de cada mensaje que llega al WhatsApp de un negocio y qué hizo el asistente con él
    /// (respondió, lo ignoró y por qué, o falló). Existe para que "no me contesta" tenga una
    /// explicación a la vista en el panel (lo mandó desde el mismo celular, el asistente está
    /// apagado, no era texto...). Tabla de infraestructura, sin filtro por tenant: el webhook
    /// escribe sin tenant en contexto y el panel filtra por TenantId. Se purga a los 14 días.
    /// </summary>
    [Table("whatsapp_inbound_events", Schema = "public")]
    public class WhatsAppInboundEvent
    {
        public long Id { get; set; }

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        [Required, MaxLength(100)]
        public string InstanceName { get; set; } = string.Empty;

        /// <summary>Null si la instancia no está asociada a ningún negocio.</summary>
        public Guid? TenantId { get; set; }

        [MaxLength(100)] public string? RemoteJid { get; set; }

        /// <summary>Dígitos del teléfono, o el JID @lid si WhatsApp ocultó el número.</summary>
        [MaxLength(100)] public string? Phone { get; set; }

        [MaxLength(100)] public string? ContactName { get; set; }

        /// <summary>Lo mandó el propio celular conectado (sólo se registra el "mensaje a vos mismo").</summary>
        public bool FromMe { get; set; }

        /// <summary>conversation, extendedTextMessage, imageMessage, audioMessage...</summary>
        [MaxLength(60)] public string? MessageType { get; set; }

        /// <summary>queued | ignored | replied | failed</summary>
        [Required, MaxLength(20)]
        public string Status { get; set; } = "queued";

        /// <summary>Código corto: from_me, no_text, no_tenant, no_plan, disabled, no_reply, send_failed, error...</summary>
        [MaxLength(40)] public string? Reason { get; set; }

        [MaxLength(1000)] public string? Detail { get; set; }

        public DateTime? ProcessedAt { get; set; }
    }
}
