using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Configuración por negocio del add-on "detección de transferencias" (FeatureCodes.TransferDetection).
    /// El add-on se compra como cualquier otro (TenantFeatureAddon); acá va el switch y desde
    /// cuándo se miran los cobros (nunca antes: lo anterior el negocio ya lo cargó a mano).
    /// </summary>
    public class TransferDetectionSettings : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        public bool Enabled { get; set; } = true;
        public DateTime? StartedAt { get; set; }
        public DateTime? LastRunAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum IncomingPaymentStatus
    {
        /// <summary>No se pudo identificar el turno: cae en la pantalla de pagos sin validar.</summary>
        Pending = 1,
        /// <summary>Ya se registró el pago sobre un turno.</summary>
        Applied = 2,
        /// <summary>El negocio lo descartó: no era una seña (una venta, plata propia, un cobro ya cargado).</summary>
        Ignored = 3
    }

    /// <summary>
    /// Un cobro que le entró al negocio en su cuenta de Mercado Pago (transferencia al CVU/alias o
    /// cobro por QR/link), detectado por la detección automática de transferencias. Se guarda uno
    /// por movimiento aunque se aplique solo: audita de dónde salió cada pago y evita procesar dos
    /// veces el mismo movimiento. Calcado de GymHero/PlayCrew, adaptado a turnos.
    /// </summary>
    public class IncomingPayment : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Id del pago en Mercado Pago. Único por tenant: clave de idempotencia.</summary>
        [Required, StringLength(50)]
        public string MpPaymentId { get; set; } = string.Empty;

        public DateTime DateApproved { get; set; }
        public decimal Amount { get; set; }
        public decimal NetAmount { get; set; }

        /// <summary>CUIL/CUIT tal cual lo devuelve Mercado Pago.</summary>
        [StringLength(30)] public string? PayerDocument { get; set; }
        /// <summary>DNI extraído del CUIL, como lo carga el negocio en sus clientes.</summary>
        [StringLength(20)] public string? PayerDni { get; set; }
        /// <summary>Id del usuario de Mercado Pago que pagó: la clave más estable para aprender el mapeo.</summary>
        [StringLength(50)] public string? PayerId { get; set; }
        [StringLength(150)] public string? PayerEmail { get; set; }
        [StringLength(150)] public string? PayerName { get; set; }
        [StringLength(50)] public string? PaymentMethodId { get; set; }
        [StringLength(50)] public string? OperationType { get; set; }
        [StringLength(500)] public string? Description { get; set; }
        [StringLength(200)] public string? ExternalReference { get; set; }

        public IncomingPaymentStatus Status { get; set; } = IncomingPaymentStatus.Pending;

        /// <summary>Cómo se resolvió o por qué quedó pendiente: dni, mapeo, nombre, comprobante, manual, monto, ninguno…</summary>
        [StringLength(40)] public string? MatchType { get; set; }

        /// <summary>Turno al que se aplicó el cobro.</summary>
        public Guid? BookingId { get; set; }
        /// <summary>Turno candidato cuando quedó pendiente: la pantalla lo ofrece preseleccionado.</summary>
        public Guid? SuggestedBookingId { get; set; }
        public Guid? CustomerId { get; set; }
        /// <summary>El Payment creado a partir de este cobro, si se aplicó.</summary>
        public Guid? PaymentId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
        [StringLength(100)] public string? ResolvedBy { get; set; }

        public Booking? Booking { get; set; }
        public Customer? Customer { get; set; }
    }

    /// <summary>
    /// Recuerda que los pagos de una cuenta de Mercado Pago corresponden a un cliente (la seña la
    /// paga la pareja, el padre, la empresa). Se aprende la primera vez que el negocio lo resuelve
    /// a mano y desde ahí los pagos de esa cuenta van solos.
    /// </summary>
    public class PayerCustomerMapping : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>"mp:{payerId}" si vino el id de usuario de MP, si no "doc:{cuil}".</summary>
        [Required, StringLength(60)]
        public string PayerKey { get; set; } = string.Empty;

        public Guid CustomerId { get; set; }
        [StringLength(150)] public string? PayerLabel { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [StringLength(100)] public string? CreatedBy { get; set; }

        public Customer Customer { get; set; } = null!;
    }

    public enum ReceiptClaimStatus
    {
        Pending = 1,
        Matched = 2,
        Expired = 3
    }

    /// <summary>
    /// "Te mandé el comprobante": un cliente mandó una imagen/PDF al WhatsApp del negocio. No se lee
    /// la imagen; se usa como disparador para buscar en Mercado Pago una transferencia que coincida
    /// con el turno pendiente de ese teléfono, y se le confirma por el mismo chat.
    /// </summary>
    public class WhatsAppReceiptClaim : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, StringLength(100)]
        public string Phone { get; set; } = string.Empty;
        [StringLength(100)] public string? ContactName { get; set; }

        /// <summary>Turno pendiente de pago que tenía ese teléfono al mandar el comprobante.</summary>
        public Guid? BookingId { get; set; }

        public ReceiptClaimStatus Status { get; set; } = ReceiptClaimStatus.Pending;
        public Guid? IncomingPaymentId { get; set; }
        public bool AckSent { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
