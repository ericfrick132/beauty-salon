using System.Net.Http.Json;

namespace BookingPro.API.Services
{
    public interface ISalesHubHubClient
    {
        Task PushLeadAsync(string externalId, string? name, string? businessName,
            string? phone, string? email, string leadType, CancellationToken ct = default);

        /// <summary>Delega en SalesHub el envío de un WhatsApp B2B al dueño (encolado humanizado).</summary>
        Task SendAsync(string externalId, string text, CancellationToken ct = default);
    }

    /// <summary>
    /// Pushea leads B2B al Hub de SalesHub (POST /api/hub/leads, auth X-Api-Key con Hub:ApiKey).
    /// Reemplaza el pull de 30 min para captura en tiempo real. Fire-and-forget: nunca tira excepción
    /// hacia arriba (no debe romper el alta de tenant). No-op si no está configurado.
    /// Config: SalesHub:HubBaseUrl, SalesHub:HubApiKey, SalesHub:ProductKey (default "turnospro").
    /// </summary>
    public class SalesHubHubClient : ISalesHubHubClient
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly ILogger<SalesHubHubClient> _log;

        public SalesHubHubClient(HttpClient http, IConfiguration config, ILogger<SalesHubHubClient> log)
        {
            _http = http; _config = config; _log = log;
        }

        public async Task PushLeadAsync(string externalId, string? name, string? businessName,
            string? phone, string? email, string leadType, CancellationToken ct = default)
        {
            var baseUrl = _config["SalesHub:HubBaseUrl"];
            var apiKey = _config["SalesHub:HubApiKey"];
            if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey)) return; // no configurado

            var productKey = _config["SalesHub:ProductKey"] ?? "turnospro";
            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/api/hub/leads");
                req.Headers.Add("X-Api-Key", apiKey);
                req.Content = JsonContent.Create(new
                {
                    productKey, externalId, name, businessName, phone, email, leadType
                });
                var resp = await _http.SendAsync(req, ct);
                if (!resp.IsSuccessStatusCode)
                    _log.LogWarning("SalesHub hub push {Code} para {Ext}", (int)resp.StatusCode, externalId);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "SalesHub hub push falló para {Ext}", externalId);
            }
        }

        public async Task SendAsync(string externalId, string text, CancellationToken ct = default)
        {
            var baseUrl = _config["SalesHub:HubBaseUrl"];
            var apiKey = _config["SalesHub:HubApiKey"];
            if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey)) return; // no configurado

            var productKey = _config["SalesHub:ProductKey"] ?? "turnospro";
            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/api/hub/send");
                req.Headers.Add("X-Api-Key", apiKey);
                req.Content = JsonContent.Create(new { productKey, externalId, text });
                var resp = await _http.SendAsync(req, ct);
                if (!resp.IsSuccessStatusCode)
                    _log.LogWarning("SalesHub hub send {Code} para {Ext}", (int)resp.StatusCode, externalId);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "SalesHub hub send falló para {Ext}", externalId);
            }
        }
    }
}
