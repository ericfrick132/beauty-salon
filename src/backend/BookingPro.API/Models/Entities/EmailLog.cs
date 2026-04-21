using System;
using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Registro auditable de todos los emails enviados por la plataforma.
    /// No lleva filtro multi-tenant — es una tabla pública (infraestructura) que
    /// también guarda emails de onboarding/verificación que ocurren antes de
    /// tener un tenant creado.
    /// </summary>
    public class EmailLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(255)]
        public string ToEmail { get; set; } = "";

        [Required, MaxLength(500)]
        public string Subject { get; set; } = "";

        /// <summary>
        /// Identificador estable del template:
        /// welcome | payment_succeeded | payment_failed | trial_ending_2d |
        /// trial_expired | booking_confirmation | test
        /// </summary>
        [Required, MaxLength(50)]
        public string TemplateKey { get; set; } = "";

        /// <summary>sent | failed</summary>
        [Required, MaxLength(20)]
        public string Status { get; set; } = "sent";

        public string? ErrorMessage { get; set; }

        public Guid? TenantId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
