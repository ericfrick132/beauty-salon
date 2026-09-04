using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Meta Conversions API (server-side). Espeja los eventos del pixel y manda los de negocio
    /// (Subscribe/Purchase con monto) que el browser nunca ve. Soporta dos "action_source":
    ///  - website: identificadores em/ph/fbc/fbp/external_id (registros y pagos que vinieron de la web).
    ///  - business_messaging + messaging_channel=whatsapp: cuando el tenant tiene ctwa_clid
    ///    (llegó por un anuncio click-to-WhatsApp). Es la ÚNICA forma de que Meta atribuya la
    ///    compra a ese anuncio y muestre ROAS en el Ads Manager.
    /// Config: MetaCapi:PixelId, MetaCapi:AccessToken, MetaCapi:PageId (página de Facebook dueña
    /// del WhatsApp que recibe los CTWA), MetaCapi:TestEventCode (opcional).
    /// Nunca tira excepción hacia arriba: loguea y sigue.
    /// </summary>
    public class MetaCapiService : IMetaCapiService
    {
        private const string GraphApiVersion = "v21.0";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<MetaCapiService> _logger;

        public MetaCapiService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<MetaCapiService> logger)
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
                _logger.LogDebug("Meta CAPI not configured (PixelId/AccessToken missing); skipping {Event}", ev.EventName);
                return;
            }

            try
            {
                var isMessaging = !string.IsNullOrWhiteSpace(ev.CtwaClid)
                                  && !string.Equals(ev.ActionSource, "website", StringComparison.OrdinalIgnoreCase);
                var actionSource = ev.ActionSource ?? (isMessaging ? "business_messaging" : "website");

                var userData = new Dictionary<string, object>();
                if (!string.IsNullOrWhiteSpace(ev.Email))
                    userData["em"] = new[] { Sha256(ev.Email.Trim().ToLowerInvariant()) };
                var phone = NormalizePhone(ev.Phone);
                if (!string.IsNullOrWhiteSpace(phone))
                    userData["ph"] = new[] { Sha256(phone) };
                if (!string.IsNullOrWhiteSpace(ev.ExternalId))
                    userData["external_id"] = new[] { Sha256(ev.ExternalId.Trim()) };
                if (!string.IsNullOrWhiteSpace(ev.ClientIpAddress))
                    userData["client_ip_address"] = ev.ClientIpAddress;
                if (!string.IsNullOrWhiteSpace(ev.ClientUserAgent))
                    userData["client_user_agent"] = ev.ClientUserAgent;
                if (!string.IsNullOrWhiteSpace(ev.Fbp))
                    userData["fbp"] = ev.Fbp.Trim();
                if (!string.IsNullOrWhiteSpace(ev.Fbclid))
                {
                    // fb.1.<ms del click>.<fbclid>. No guardamos el timestamp del click: usamos el del evento.
                    var ts = new DateTimeOffset(ev.EventTime.ToUniversalTime()).ToUnixTimeMilliseconds();
                    userData["fbc"] = ev.Fbclid.StartsWith("fb.1.", StringComparison.Ordinal)
                        ? ev.Fbclid.Trim()
                        : $"fb.1.{ts}.{ev.Fbclid.Trim()}";
                }
                if (isMessaging)
                {
                    userData["ctwa_clid"] = ev.CtwaClid!.Trim();
                    var pageId = _config["MetaCapi:PageId"];
                    if (!string.IsNullOrWhiteSpace(pageId)) userData["page_id"] = pageId;
                }

                if (userData.Count == 0)
                {
                    _logger.LogDebug("Meta CAPI: no user identifiers for {Event}; skipping", ev.EventName);
                    return;
                }

                var eventData = new Dictionary<string, object>
                {
                    ["event_name"] = ev.EventName,
                    ["event_time"] = new DateTimeOffset(ev.EventTime.ToUniversalTime()).ToUnixTimeSeconds(),
                    ["action_source"] = actionSource,
                    ["user_data"] = userData
                };
                if (actionSource == "business_messaging")
                    eventData["messaging_channel"] = "whatsapp";
                if (!string.IsNullOrWhiteSpace(ev.EventId))
                    eventData["event_id"] = ev.EventId;
                if (!string.IsNullOrWhiteSpace(ev.EventSourceUrl) && actionSource == "website")
                    eventData["event_source_url"] = ev.EventSourceUrl;

                var customData = new Dictionary<string, object>();
                if (ev.Value.HasValue) customData["value"] = ev.Value.Value;
                if (!string.IsNullOrWhiteSpace(ev.Currency)) customData["currency"] = ev.Currency.Trim().ToUpperInvariant();
                if (ev.PredictedLtv.HasValue) customData["predicted_ltv"] = ev.PredictedLtv.Value;
                if (!string.IsNullOrWhiteSpace(ev.OrderId)) customData["order_id"] = ev.OrderId;
                if (customData.Count > 0) eventData["custom_data"] = customData;

                var payload = new Dictionary<string, object> { ["data"] = new[] { eventData } };
                var testCode = _config["MetaCapi:TestEventCode"];
                if (!string.IsNullOrWhiteSpace(testCode)) payload["test_event_code"] = testCode;

                var url = $"https://graph.facebook.com/{GraphApiVersion}/{pixelId}/events?access_token={Uri.EscapeDataString(accessToken)}";
                var json = JsonSerializer.Serialize(payload);

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                using var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await client.PostAsync(url, content, ct);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogWarning("Meta CAPI {Event} ({Source}) failed {Status}: {Body}", ev.EventName, actionSource, (int)response.StatusCode, body);
                }
                else
                {
                    _logger.LogInformation("Meta CAPI {Event} sent ({Source}, value={Value} {Currency}, id={EventId})",
                        ev.EventName, actionSource, ev.Value, ev.Currency, ev.EventId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Meta CAPI send failed for {Event}", ev.EventName);
            }
        }

        private static string Sha256(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        /// <summary>Solo dígitos, con código de país (Meta exige E.164 sin "+"). Números AR sin 54 → se agrega.</summary>
        private static string? NormalizePhone(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return null;
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.Length < 8) return null;
            if (digits.Length == 10 && !digits.StartsWith("54")) digits = "549" + digits;      // 11xxxxxxxx (AR sin 9)
            else if (digits.Length == 11 && digits.StartsWith("0")) digits = "549" + digits[1..]; // 011xxxxxxxx
            else if (digits.StartsWith("54") && digits.Length == 12 && !digits.StartsWith("549")) digits = "549" + digits[2..];
            return digits;
        }
    }
}
