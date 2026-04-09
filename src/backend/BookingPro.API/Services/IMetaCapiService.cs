namespace BookingPro.API.Services
{
    public interface IMetaCapiService
    {
        Task SendEventAsync(MetaCapiEvent ev, CancellationToken ct = default);
    }

    public class MetaCapiEvent
    {
        /// <summary>Standard Meta event name (PageView, Lead, InitiateCheckout, CompleteRegistration, Purchase, etc.)</summary>
        public string EventName { get; set; } = string.Empty;

        /// <summary>Stable id used by Meta to deduplicate the same event reported by the browser pixel + CAPI within 48h.</summary>
        public string? EventId { get; set; }

        public DateTime EventTime { get; set; } = DateTime.UtcNow;
        public string? EventSourceUrl { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Fbclid { get; set; }
        public string? ClientIpAddress { get; set; }
        public string? ClientUserAgent { get; set; }

        // Optional commerce data
        public decimal? Value { get; set; }
        public string? Currency { get; set; }
    }
}
