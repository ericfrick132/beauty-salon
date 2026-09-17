using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Decoded App Store transaction (from the App Store Server API or an
    /// App Store Server Notification V2 payload).
    /// </summary>
    public class AppleTransactionInfo
    {
        public string? BundleId { get; set; }
        public string? ProductId { get; set; }
        public string? TransactionId { get; set; }
        public string? OriginalTransactionId { get; set; }
        public DateTime? ExpiresDate { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? Type { get; set; }            // e.g. "Auto-Renewable Subscription"
        public string? Environment { get; set; }     // "Production" | "Sandbox"

        /// <summary>UUID the app attached to the purchase (the business' tenant id).</summary>
        public string? AppAccountToken { get; set; }

        /// <summary>Set when Apple refunded or revoked the transaction.</summary>
        public DateTime? RevocationDate { get; set; }

        /// <summary>Price charged, in units of <see cref="Currency"/> (Apple sends milliunits).</summary>
        public decimal? Price { get; set; }

        /// <summary>ISO 4217 currency of <see cref="Price"/>.</summary>
        public string? Currency { get; set; }

        public bool IsSandbox =>
            string.Equals(Environment, "Sandbox", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Decoded App Store Server Notification V2.
    /// </summary>
    public class AppleNotificationInfo
    {
        public string? NotificationType { get; set; } // e.g. DID_RENEW, EXPIRED, REFUND
        public string? Subtype { get; set; }
        public AppleTransactionInfo? Transaction { get; set; }
    }

    /// <summary>
    /// Thin client over Apple's App Store Server API. Verifies StoreKit 2
    /// transactions server-side and decodes notification payloads. Built on
    /// .NET crypto primitives — no third-party dependency.
    ///
    /// <see cref="IsConfigured"/> is false when the Apple credentials are not
    /// set, so callers can degrade gracefully (mirrors the MercadoPago pattern).
    /// </summary>
    public interface IAppleAppStoreService
    {
        bool IsConfigured { get; }

        /// <summary>Expected app bundle id (e.g. com.ericfrick.turnospro).</summary>
        string BundleId { get; }

        /// <summary>
        /// Look up an authoritative transaction from Apple by its id. Returns
        /// null if not found / not verifiable. Tries production then sandbox.
        /// </summary>
        Task<AppleTransactionInfo?> GetTransactionInfoAsync(string transactionId);

        /// <summary>
        /// Decode (and trust, since the body is a re-fetch trigger) an App Store
        /// Server Notification V2 signedPayload into its notification + transaction.
        /// </summary>
        AppleNotificationInfo? DecodeNotification(string signedPayload);

        /// <summary>Decode the payload segment of a JWS without signature checks.</summary>
        JsonElement? DecodeJwsPayload(string jws);
    }
}
