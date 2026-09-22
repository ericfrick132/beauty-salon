using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    // Un envío por la línea de WhatsApp del NEGOCIO (su instancia de Evolution), exitoso o no.
    // Es lo que hace que el freno por tenant (WhatsAppSendGate) sobreviva a un deploy y que
    // se pueda contar cuántos contactos nuevos se abrieron en el día.
    public class WhatsAppOutboundEvent : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(100)]
        public string Phone { get; set; } = string.Empty; // sólo dígitos

        [MaxLength(20)]
        public string Kind { get; set; } = "outbound"; // reply | outbound

        [MaxLength(40)]
        public string Section { get; set; } = string.Empty; // reminder, confirmation, ai_agent, menu_bot, owner_notify, test

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public bool Success { get; set; }

        [MaxLength(300)]
        public string? Error { get; set; }

        // Si el destinatario ya le había escrito al negocio alguna vez. Los "fríos" son los que queman números.
        public bool ToKnownContact { get; set; }
    }

    // Un mensaje ENTRANTE por la línea del negocio. Se guarda para todos los tenants
    // conectados (tengan bot o no): es el semáforo de "este contacto ya nos escribió".
    public class WhatsAppInboundEvent : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(100)]
        public string Phone { get; set; } = string.Empty; // sólo dígitos

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(40)]
        public string? HandledBy { get; set; } // confirmation_bot | ai_agent | menu_bot | none
    }
}
