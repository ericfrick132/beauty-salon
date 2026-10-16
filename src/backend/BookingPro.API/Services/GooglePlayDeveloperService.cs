using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Services
{
    /// <summary>Estado de una suscripción según la Google Play Developer API (purchases.subscriptionsv2).</summary>
    public class GooglePlaySubscriptionInfo
    {
        public string? State { get; set; }
        public string? ProductId { get; set; }
        public string? BasePlanId { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public DateTime? StartTime { get; set; }
        public string? LatestOrderId { get; set; }
        public bool Acknowledged { get; set; }
        public bool AutoRenewing { get; set; }
        public bool IsTest { get; set; }
        public string? LinkedPurchaseToken { get; set; }
        public string? ObfuscatedAccountId { get; set; }

        /// <summary>
        /// Estados con acceso vigente: activa o cancelada (sin renovación) que todavía no venció, y el
        /// período de gracia (Google sigue reintentando el cobro y el usuario conserva el acceso).
        /// </summary>
        public bool GrantsAccess(DateTime now) =>
            State == "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" ||
            ((State == "SUBSCRIPTION_STATE_ACTIVE" || State == "SUBSCRIPTION_STATE_CANCELED")
             && (!ExpiresAt.HasValue || ExpiresAt.Value > now));

        /// <summary>Estados que cortan el acceso (salvo que el negocio lo tenga pago por otro lado).</summary>
        public bool IsLapsed(DateTime now) =>
            State is "SUBSCRIPTION_STATE_EXPIRED" or "SUBSCRIPTION_STATE_ON_HOLD" or "SUBSCRIPTION_STATE_PAUSED"
            || (State == "SUBSCRIPTION_STATE_CANCELED" && ExpiresAt.HasValue && ExpiresAt.Value <= now);
    }

    public interface IGooglePlayDeveloperService
    {
        bool IsConfigured { get; }
        string PackageName { get; }
        Task<GooglePlaySubscriptionInfo?> GetSubscriptionAsync(string purchaseToken);
        Task<bool> AcknowledgeAsync(string productId, string purchaseToken);
    }

    /// <summary>
    /// Cliente de la Google Play Developer API (androidpublisher v3) con una service account (mismo
    /// cliente que Bunker). Config (env), opcional — sin credencial el servicio es un no-op y el verify
    /// responde GOOGLE_PLAY_NOT_CONFIGURED:
    ///   GooglePlay__PackageName          default com.ericfrick.turnospro
    ///   GooglePlay__ServiceAccountJson   JSON de la service account (crudo o en base64), invitada en
    ///                                    Play Console → Usuarios y permisos con "Ver datos financieros"
    ///                                    + "Administrar pedidos y suscripciones".
    /// </summary>
    public class GooglePlayDeveloperService : IGooglePlayDeveloperService
    {
        private const string Scope = "https://www.googleapis.com/auth/androidpublisher";
        private const string BaseUrl = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
        public const string DefaultPackageName = "com.ericfrick.turnospro";

        private static readonly object CredentialLock = new();
        private static GoogleCredential? _cachedCredential;
        private static string? _cachedCredentialSource;

        private readonly HttpClient _httpClient;
        private readonly ILogger<GooglePlayDeveloperService> _logger;
        private readonly string _serviceAccountJson;

        public GooglePlayDeveloperService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<GooglePlayDeveloperService> logger)
        {
            _httpClient = httpClientFactory.CreateClient();
            _logger = logger;
            PackageName = configuration["GooglePlay:PackageName"] is { Length: > 0 } pkg ? pkg : DefaultPackageName;
            _serviceAccountJson = DecodeJson(configuration["GooglePlay:ServiceAccountJson"]);
        }

        public string PackageName { get; }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(_serviceAccountJson);

        /// <summary>Acepta el JSON crudo o en base64 (más cómodo como variable de entorno).</summary>
        public static string DecodeJson(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var trimmed = value.Trim();
            if (trimmed.StartsWith("{")) return trimmed;
            try { return Encoding.UTF8.GetString(Convert.FromBase64String(trimmed)); }
            catch { return string.Empty; }
        }

        private async Task<string?> GetAccessTokenAsync()
        {
            GoogleCredential credential;
            lock (CredentialLock)
            {
                if (_cachedCredential == null || _cachedCredentialSource != _serviceAccountJson)
                {
                    _cachedCredential = GoogleCredential.FromJson(_serviceAccountJson).CreateScoped(Scope);
                    _cachedCredentialSource = _serviceAccountJson;
                }
                credential = _cachedCredential;
            }
            return await ((ITokenAccess)credential).GetAccessTokenForRequestAsync();
        }

        public async Task<GooglePlaySubscriptionInfo?> GetSubscriptionAsync(string purchaseToken)
        {
            if (!IsConfigured || string.IsNullOrWhiteSpace(purchaseToken)) return null;
            try
            {
                var token = await GetAccessTokenAsync();
                var url = $"{BaseUrl}/{Uri.EscapeDataString(PackageName)}/purchases/subscriptionsv2/tokens/{Uri.EscapeDataString(purchaseToken)}";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var response = await _httpClient.SendAsync(request);
                var body = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Google Play subscriptionsv2 lookup ({Package}) returned {Status}: {Body}",
                        PackageName, (int)response.StatusCode, body.Length > 500 ? body[..500] : body);
                    return null;
                }
                return Map(body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error consultando la suscripción de Google Play (¿GooglePlay:ServiceAccountJson inválido?)");
                return null;
            }
        }

        public async Task<bool> AcknowledgeAsync(string productId, string purchaseToken)
        {
            if (!IsConfigured) return false;
            try
            {
                var token = await GetAccessTokenAsync();
                var url = $"{BaseUrl}/{Uri.EscapeDataString(PackageName)}/purchases/subscriptions/{Uri.EscapeDataString(productId)}/tokens/{Uri.EscapeDataString(purchaseToken)}:acknowledge";
                using var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent("{}", Encoding.UTF8, "application/json")
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode) return true;
                _logger.LogWarning("Google Play acknowledge returned {Status}", (int)response.StatusCode);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reconociendo la compra de Google Play");
                return false;
            }
        }

        public static GooglePlaySubscriptionInfo Map(string json)
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var info = new GooglePlaySubscriptionInfo
            {
                State = Str(root, "subscriptionState"),
                LatestOrderId = Str(root, "latestOrderId"),
                Acknowledged = Str(root, "acknowledgementState") == "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
                IsTest = root.TryGetProperty("testPurchase", out _),
                LinkedPurchaseToken = Str(root, "linkedPurchaseToken"),
                StartTime = Date(Str(root, "startTime")),
            };
            if (root.TryGetProperty("externalAccountIdentifiers", out var ext))
                info.ObfuscatedAccountId = Str(ext, "obfuscatedExternalAccountId");

            if (root.TryGetProperty("lineItems", out var items) && items.ValueKind == JsonValueKind.Array)
            {
                // La suscripción de TurnosPro tiene un solo line item; si hubiera más, manda el que vence último.
                var best = items.EnumerateArray()
                    .Select(i => new
                    {
                        ProductId = Str(i, "productId"),
                        BasePlanId = i.TryGetProperty("offerDetails", out var od) ? Str(od, "basePlanId") : null,
                        Expiry = Date(Str(i, "expiryTime")),
                        AutoRenew = i.TryGetProperty("autoRenewingPlan", out var arp) &&
                                    arp.TryGetProperty("autoRenewEnabled", out var en) &&
                                    en.ValueKind == JsonValueKind.True
                    })
                    .OrderByDescending(i => i.Expiry ?? DateTime.MinValue)
                    .FirstOrDefault();
                if (best != null)
                {
                    info.ProductId = best.ProductId;
                    info.BasePlanId = best.BasePlanId;
                    info.ExpiresAt = best.Expiry;
                    info.AutoRenewing = best.AutoRenew;
                }
            }
            return info;
        }

        private static string? Str(JsonElement e, string name) =>
            e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

        private static DateTime? Date(string? value) =>
            DateTime.TryParse(value, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out var d)
                ? DateTime.SpecifyKind(d, DateTimeKind.Utc)
                : null;
    }

    /// <summary>
    /// Productos de Google Play de la suscripción del negocio. Un solo producto de suscripción (mismo id
    /// que el de App Store Connect) con un plan base por cada plan de la web: el plan base decide el
    /// SubscriptionPlan.Code y cada cuánto se cobra. El precio de Play es el de la web × meses.
    /// </summary>
    public static class GooglePlayCatalog
    {
        public const string ProductId = "com.ericfrick.turnospro.pro.mensual";

        public record BasePlan(string Id, string PlanCode, int Months);

        public static readonly BasePlan[] BasePlans =
        {
            new("mensual", "pro", 1),
            new("trimestral", "promo", 3),
            new("semestral", "6meses", 6),
            new("anual", "12meses", 12),
        };

        public static bool IsKnownProduct(string? productId) =>
            string.Equals(productId, ProductId, StringComparison.OrdinalIgnoreCase);

        /// <summary>Plan base → plan. Sin plan base (o uno desconocido) se toma el mensual.</summary>
        public static BasePlan Resolve(string? basePlanId) =>
            BasePlans.FirstOrDefault(b => string.Equals(b.Id, basePlanId, StringComparison.OrdinalIgnoreCase))
            ?? BasePlans[0];
    }
}
