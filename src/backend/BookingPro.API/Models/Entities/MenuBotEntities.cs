using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Configuración por negocio del asistente de WhatsApp por menú (add-on FeatureCodes.MenuBot).
    /// </summary>
    public class MenuBotSettings : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        public bool Enabled { get; set; } = true;
        /// <summary>Anticipación mínima (horas) para que un cliente cancele su turno por el bot.</summary>
        public int CancellationCutoffHours { get; set; } = 24;
        /// <summary>Anticipación mínima (minutos) para reservar por el bot. 0 = hasta el próximo turno libre.</summary>
        public int MinBookingAdvanceMinutes { get; set; } = 60;
        /// <summary>Cuántos días hacia adelante ofrece.</summary>
        public int DaysToOffer { get; set; } = 7;
        /// <summary>Texto extra que el bot agrega en "servicios y precios" (dirección, cómo llegar, etc.).</summary>
        [StringLength(600)] public string? InfoText { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Estado de la conversación de un cliente con el bot por menú (paso actual y lo que ya eligió).
    /// Una fila por (tenant, teléfono); vence a los 30 minutos sin actividad.
    /// </summary>
    public class MenuBotSession : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, StringLength(100)]
        public string Phone { get; set; } = string.Empty;
        [StringLength(100)] public string? ContactName { get; set; }

        [StringLength(40)] public string Step { get; set; } = "menu";
        /// <summary>JSON con las elecciones parciales (servicio, profesional, fecha, hora, opciones listadas).</summary>
        public string? DataJson { get; set; }

        /// <summary>"Hablar con el negocio": el bot se calla hasta esta hora.</summary>
        public DateTime? PausedUntil { get; set; }

        public int MessagesIn { get; set; }
        public int BookingsCreated { get; set; }
        public int BookingsCancelled { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
