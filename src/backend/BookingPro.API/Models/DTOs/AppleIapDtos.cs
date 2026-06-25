using System.Text.Json.Serialization;

namespace BookingPro.API.Models.DTOs
{
    /// <summary>Body sent by the iOS app to verify a StoreKit 2 purchase.</summary>
    public class AppleVerifyDto
    {
        /// <summary>The StoreKit 2 Transaction.id (as a string).</summary>
        public string TransactionId { get; set; } = string.Empty;

        /// <summary>Optional product id, for logging/diagnostics.</summary>
        public string? ProductId { get; set; }
    }

    /// <summary>App Store Server Notifications V2 envelope: { signedPayload }.</summary>
    public class AppleNotificationDto
    {
        [JsonPropertyName("signedPayload")]
        public string SignedPayload { get; set; } = string.Empty;
    }
}
