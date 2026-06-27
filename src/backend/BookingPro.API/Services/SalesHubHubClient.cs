using System.Net.Http.Json;

namespace BookingPro.API.Services
{
    public interface ISalesHubHubClient
    {
        Task PushLeadAsync(string externalId, string? name, string? businessName,
            string? phone, string? email, string leadType, CancellationToken ct = default);

        /// <summary>Delega en SalesHub el envío de un WhatsApp B2B al dueño (encolado humanizado).</summary>
        Task SendAsync(string externalId, string text, CancellationToken ct = default);

        /// <summary>Baja la config central de follow-up de esta app (contrato pull-and-persist).
        /// Devuelve el JSON crudo { sequences: [...] } o null si no está configurado/falla.</summary>
        Task<string?> GetFollowupConfigRawAsync(CancellationToken ct = default);

        /// <summary>Reporta un evento de follow-up a SalesHub (telemetría, no dispara envíos).</summary>
        Task ReportFollowupEventAsync(string trigger, string? externalRef, string eventType,
            int stepIndex, string? channel, string? detail, CancellationToken ct = default);
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

        public async Task<string?> GetFollowupConfigRawAsync(CancellationToken ct = default)
        {
            var baseUrl = _config["SalesHub:HubBaseUrl"];
            var apiKey = _config["SalesHub:HubApiKey"];
            if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey)) return null;

            var productKey = _config["SalesHub:ProductKey"] ?? "turnospro";
            try
            {
                var req = new HttpRequestMessage(HttpMethod.Get,
                    $"{baseUrl.TrimEnd('/')}/api/hub/followup-config?productKey={Uri.EscapeDataString(productKey)}");
                req.Headers.Add("X-Api-Key", apiKey);
                var resp = await _http.SendAsync(req, ct);
                if (!resp.IsSuccessStatusCode)
                {
                    _log.LogWarning("SalesHub followup-config {Code}", (int)resp.StatusCode);
                    return null;
                }
                return await resp.Content.ReadAsStringAsync(ct);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "SalesHub followup-config falló");
                return null;
            }
        }

        public async Task ReportFollowupEventAsync(string trigger, string? externalRef, string eventType,
            int stepIndex, string? channel, string? detail, CancellationToken ct = default)
        {
            var baseUrl = _config["SalesHub:HubBaseUrl"];
            var apiKey = _config["SalesHub:HubApiKey"];
            if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey)) return;

            var productKey = _config["SalesHub:ProductKey"] ?? "turnospro";
            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/api/hub/followup-events");
                req.Headers.Add("X-Api-Key", apiKey);
                req.Content = JsonContent.Create(new { productKey, trigger, externalRef, eventType, stepIndex, channel, detail });
                var resp = await _http.SendAsync(req, ct);
                if (!resp.IsSuccessStatusCode)
                    _log.LogWarning("SalesHub followup-event {Code} ({Type})", (int)resp.StatusCode, eventType);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "SalesHub followup-event falló ({Type})", eventType);
            }
        }
    }
}
