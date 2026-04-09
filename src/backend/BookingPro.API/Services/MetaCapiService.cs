using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Meta Conversions API (server-side) sender. Mirrors browser-pixel events to
    /// Meta from the backend so iOS/adblockers can't suppress them.
    /// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
    /// </summary>
    public class MetaCapiService : IMetaCapiService
    {
        private const string GraphApiVersion = "v18.0";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<MetaCapiService> _logger;

        public MetaCapiService(
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            ILogger<MetaCapiService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        public async Task SendEventAsync(MetaCapiEvent ev, CancellationToken ct = default)
        {
            var pixelId = _config["MetaCapi:PixelId"];
            var accessToken = _config["MetaCapi:AccessToken"];
            if (string.IsNullOrWhiteSpace(pixelId) || string.IsNullOrWhiteSpace(accessToken))
            {
                _logger.LogDebug("MetaCapi not configured — skipping {Event}", ev.EventName);
                return;
            }

            try
            {
                var userData = new Dictionary<string, object>();
                if (!string.IsNullOrWhiteSpace(ev.Email))
                    userData["em"] = new[] { Sha256(ev.Email.Trim().ToLowerInvariant()) };
                if (!string.IsNullOrWhiteSpace(ev.Phone))
                {
                    var normalized = NormalizePhone(ev.Phone);
                    if (!string.IsNullOrEmpty(normalized))
                        userData["ph"] = new[] { Sha256(normalized) };
                }
                if (!string.IsNullOrWhiteSpace(ev.ClientIpAddress))
                    userData["client_ip_address"] = ev.ClientIpAddress;
                if (!string.IsNullOrWhiteSpace(ev.ClientUserAgent))
                    userData["client_user_agent"] = ev.ClientUserAgent;
                if (!string.IsNullOrWhiteSpace(ev.Fbclid))
                    userData["fbc"] = $"fb.1.{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.{ev.Fbclid}";

                if (userData.Count == 0)
                {
                    // Meta requires at least one user_data identifier
                    _logger.LogDebug("MetaCapi: no user_data for {Event}, skipping", ev.EventName);
                    return;
                }

                var eventData = new Dictionary<string, object>
                {
                    ["event_name"] = ev.EventName,
                    ["event_time"] = new DateTimeOffset(ev.EventTime, TimeSpan.Zero).ToUnixTimeSeconds(),
                    ["action_source"] = "website",
                    ["user_data"] = userData,
                };
                if (!string.IsNullOrWhiteSpace(ev.EventId)) eventData["event_id"] = ev.EventId;
                if (!string.IsNullOrWhiteSpace(ev.EventSourceUrl)) eventData["event_source_url"] = ev.EventSourceUrl;
                if (ev.Value.HasValue || !string.IsNullOrWhiteSpace(ev.Currency))
                {
                    var custom = new Dictionary<string, object>();
                    if (ev.Value.HasValue) custom["value"] = ev.Value.Value;
                    if (!string.IsNullOrWhiteSpace(ev.Currency)) custom["currency"] = ev.Currency;
                    eventData["custom_data"] = custom;
                }

                var payload = new Dictionary<string, object>
                {
                    ["data"] = new[] { eventData },
                };
                var testCode = _config["MetaCapi:TestEventCode"];
                if (!string.IsNullOrWhiteSpace(testCode)) payload["test_event_code"] = testCode;

                var url = $"https://graph.facebook.com/{GraphApiVersion}/{pixelId}/events?access_token={accessToken}";
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                var response = await client.PostAsync(url, content, ct);
                var body = await response.Content.ReadAsStringAsync(ct);
                if (response.IsSuccessStatusCode)
                    _logger.LogInformation("CAPI sent {Event} pixel={Pixel}: {Body}", ev.EventName, pixelId, body);
                else
                    _logger.LogWarning("CAPI {Event} failed ({Status}): {Body}", ev.EventName, response.StatusCode, body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "CAPI send failed for {Event}", ev.EventName);
            }
        }

        private static string Sha256(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            var sb = new StringBuilder(bytes.Length * 2);
            foreach (var b in bytes) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private static string NormalizePhone(string phone)
        {
            // E.164-ish: strip everything but digits. Meta hashes the normalized digit string.
            var sb = new StringBuilder();
            foreach (var c in phone)
                if (char.IsDigit(c)) sb.Append(c);
            return sb.ToString();
        }
    }
}
