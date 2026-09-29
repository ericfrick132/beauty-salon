using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Copia local de un comprobante emitido por el facturador (ARCA) para un cobro de turno o una venta
    /// de productos. El facturador es la fuente de verdad; acá se guarda lo necesario para listar.
    /// </summary>
    public class ElectronicInvoice : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>"payment" (cobro de turno) o "sale" (venta de productos).</summary>
        public string SourceType { get; set; } = "payment";
        public Guid SourceId { get; set; }

        /// <summary>"payment-{id:N}" / "sale-{id:N}" (+ "-rN" en reintentos) o "nc-{id}-{n}".</summary>
        public string ExternalRef { get; set; } = string.Empty;
        public int FacturadorInvoiceId { get; set; }

        /// <summary>queued | processing | authorized | rejected | error</summary>
        public string Status { get; set; } = "queued";
        public string VoucherName { get; set; } = string.Empty;
        public string? FullNumber { get; set; }
        public decimal Total { get; set; }
        public string? Cae { get; set; }
        public string? Error { get; set; }
        public bool IsCreditNote { get; set; }
        public Guid? CreditsElectronicInvoiceId { get; set; }
        public DateOnly? IssueDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
    }
}
