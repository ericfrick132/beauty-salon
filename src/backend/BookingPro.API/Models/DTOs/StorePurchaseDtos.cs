namespace BookingPro.API.Models.DTOs
{
    /// <summary>
    /// Compra in-app de un add-on o de créditos de mensajería, enviada por la app después de comprar.
    /// Independiente de la tienda: hoy solo "apple"; "google" usará PurchaseToken.
    /// </summary>
    public class StorePurchaseRequestDto
    {
        /// <summary>"apple" | "google".</summary>
        public string Store { get; set; } = "apple";

        public string ProductId { get; set; } = string.Empty;

        /// <summary>Apple: Transaction.id de StoreKit 2 (como string).</summary>
        public string? TransactionId { get; set; }

        /// <summary>Google Play: purchaseToken (todavía no soportado).</summary>
        public string? PurchaseToken { get; set; }
    }

    public class StorePurchaseResultDto
    {
        public bool Granted { get; set; }
        /// <summary>La transacción ya se había acreditado antes (reintento / restauración).</summary>
        public bool AlreadyProcessed { get; set; }
        public string Kind { get; set; } = string.Empty; // addon | credits
        public string? AddonCode { get; set; }
        public int Quantity { get; set; }
        /// <summary>Vigencia del add-on después de acreditar.</summary>
        public DateTime? PaidUntil { get; set; }
        /// <summary>Saldo de créditos después de acreditar.</summary>
        public int? Balance { get; set; }
    }
}
