using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Compra in-app de un add-on o de créditos de mensajería hecha en una tienda (App Store; Google Play
    /// después). Tabla de plataforma (sin filtro por tenant): el índice único (Store, TransactionId)
    /// garantiza que cada transacción se acredite una sola vez, aunque la app la reenvíe.
    /// </summary>
    public class StorePurchase
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }

        [Required, MaxLength(20)]
        public string Store { get; set; } = "apple"; // apple | google

        [Required, MaxLength(150)]
        public string ProductId { get; set; } = string.Empty;

        /// <summary>Apple transactionId / Google orderId (o purchaseToken).</summary>
        [Required, MaxLength(200)]
        public string TransactionId { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? OriginalTransactionId { get; set; }

        [Required, MaxLength(20)]
        public string Kind { get; set; } = string.Empty; // addon | credits

        /// <summary>Código del add-on (FeatureAddon.Code) o null para créditos.</summary>
        [MaxLength(50)]
        public string? AddonCode { get; set; }

        /// <summary>Meses de add-on o cantidad de créditos acreditados.</summary>
        public int Quantity { get; set; }

        public decimal? Price { get; set; }

        [MaxLength(10)]
        public string? Currency { get; set; }

        [MaxLength(20)]
        public string? Environment { get; set; } // Production | Sandbox

        [MaxLength(20)]
        public string Status { get; set; } = "granted"; // granted | refunded

        public DateTime? PurchasedAt { get; set; }
        public DateTime? RefundedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
