using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    // Catálogo de features cobrables por separado (add-ons). Tabla compartida (public).
    public class FeatureAddon
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty; // e.g. "confirmation_bot"

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public decimal MonthlyPrice { get; set; }

        [MaxLength(10)]
        public string Currency { get; set; } = "ARS";

        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // Add-on contratado por un tenant. Activo mientras PaidUntil esté en el futuro.
    public class TenantFeatureAddon : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(50)]
        public string AddonCode { get; set; } = string.Empty;

        [MaxLength(30)]
        public string Status { get; set; } = "active"; // active | cancelled

        public DateTime? PaidUntil { get; set; }
        public DateTime? ActivatedAt { get; set; }

        [MaxLength(30)]
        public string Source { get; set; } = "payment"; // payment | manual | plan

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // Compra de un add-on vía MercadoPago (cuenta de la plataforma).
    public class FeatureAddonPurchase : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(50)]
        public string AddonCode { get; set; } = string.Empty;

        public int Months { get; set; } = 1;
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "pending"; // pending, approved, cancelled

        [MaxLength(100)]
        public string? PreferenceId { get; set; }

        [MaxLength(100)]
        public string? PlatformPaymentId { get; set; }

        [MaxLength(200)]
        public string? ExternalReference { get; set; } // ADDON-{tenantId}-{code}-{timestamp}

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAt { get; set; }
    }

    // Pedido de confirmación de turno enviado por el bot de WhatsApp.
    public class BookingConfirmationRequest : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid BookingId { get; set; }
        public Guid? CustomerId { get; set; }

        [MaxLength(100)]
        public string Phone { get; set; } = string.Empty; // normalizado, solo dígitos

        [MaxLength(30)]
        public string Status { get; set; } = "sent"; // sent | confirmed | cancelled | expired

        [MaxLength(50)]
        public string? ProviderMessageId { get; set; }

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public DateTime? RespondedAt { get; set; }

        [MaxLength(500)]
        public string? ResponseText { get; set; }

        // Veces que el bot re-preguntó ante una respuesta que no entendió (tope para no loopear)
        public int RepromptCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
