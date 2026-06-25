using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using BookingPro.API.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Services
{
    /// <summary>
    /// App Store Server API client + JWS decoder, implemented with .NET crypto
    /// primitives (ECDsa P-256 / ES256). No third-party NuGet.
    ///
    /// Authenticity model:
    ///  - <see cref="GetTransactionInfoAsync"/> calls Apple over TLS with a
    ///    signed JWT; the transaction returned by Apple is authoritative, so we
    ///    decode (don't re-verify) the signed payload it returns.
    ///  - Notifications are treated as triggers: we decode the payload to learn
    ///    the originalTransactionId, then act on it. (Callers may re-fetch the
    ///    authoritative state via the API for defence in depth.)
    ///
    /// Config (appsettings / env), all optional — service is a graceful no-op
    /// when unset:
    ///   Apple:BundleId      e.g. com.ericfrick.turnospro
    ///   Apple:IssuerId      App Store Connect API issuer id (UUID)
    ///   Apple:KeyId         In-App Purchase key id
    ///   Apple:PrivateKey    contents of the .p8 (PEM or bare base64)
    ///   Apple:Environment   "Production" | "Sandbox" (default Production-first)
    /// </summary>
    public class AppleAppStoreService : IAppleAppStoreService
    {
        private const string ProductionBase = "https://api.storekit.itunes.apple.com";
        private const string SandboxBase = "https://api.storekit-sandbox.itunes.apple.com";
        private const string Audience = "appstoreconnect-v1";

        private readonly HttpClient _httpClient;
        private readonly ILogger<AppleAppStoreService> _logger;

        private readonly string _bundleId;
        private readonly string _issuerId;
        private readonly string _keyId;
        private readonly string _privateKey;
        private readonly bool _sandboxFirst;

        public AppleAppStoreService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<AppleAppStoreService> logger)
        {
            _httpClient = httpClientFactory.CreateClient();
            _logger = logger;

            _bundleId = configuration["Apple:BundleId"] ?? string.Empty;
            _issuerId = configuration["Apple:IssuerId"] ?? string.Empty;
            _keyId = configuration["Apple:KeyId"] ?? string.Empty;
            _privateKey = configuration["Apple:PrivateKey"] ?? string.Empty;
            _sandboxFirst = string.Equals(
                configuration["Apple:Environment"], "Sandbox", StringComparison.OrdinalIgnoreCase);
        }

        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(_bundleId) &&
            !string.IsNullOrWhiteSpace(_issuerId) &&
            !string.IsNullOrWhiteSpace(_keyId) &&
            !string.IsNullOrWhiteSpace(_privateKey);

        public string BundleId => _bundleId;

        public async Task<AppleTransactionInfo?> GetTransactionInfoAsync(string transactionId)
        {
            if (!IsConfigured)
            {
                _logger.LogWarning("Apple App Store not configured; cannot verify transaction {Tx}", transactionId);
                return null;
            }
            if (string.IsNullOrWhiteSpace(transactionId)) return null;

            // Try the most likely environment first, then fall back to the other —
            // Apple's recommended strategy (TestFlight / App Review use Sandbox).
            var bases = _sandboxFirst
                ? new[] { SandboxBase, ProductionBase }
                : new[] { ProductionBase, SandboxBase };

            foreach (var baseUrl in bases)
            {
                try
                {
                    var jwt = GenerateApiToken();
                    using var request = new HttpRequestMessage(
                        HttpMethod.Get, $"{baseUrl}/inApps/v1/transactions/{transactionId}");
                    request.Headers.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", jwt);

                    var response = await _httpClient.SendAsync(request);
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation(
                            "Apple transaction lookup {Tx} at {Base} returned {Status}",
                            transactionId, baseUrl, (int)response.StatusCode);
                        continue;
                    }

                    var body = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(body);
                    if (!doc.RootElement.TryGetProperty("signedTransactionInfo", out var signed))
                        continue;

                    var jws = signed.GetString();
                    if (string.IsNullOrEmpty(jws)) continue;

                    var payload = DecodeJwsPayload(jws);
                    if (payload == null) continue;

                    return MapTransaction(payload.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error verifying Apple transaction {Tx} at {Base}", transactionId, baseUrl);
                }
            }

            return null;
        }

        public AppleNotificationInfo? DecodeNotification(string signedPayload)
        {
            if (string.IsNullOrWhiteSpace(signedPayload)) return null;
            try
            {
                var payload = DecodeJwsPayload(signedPayload);
                if (payload == null) return null;

                var root = payload.Value;
                var info = new AppleNotificationInfo
                {
                    NotificationType = GetString(root, "notificationType"),
                    Subtype = GetString(root, "subtype")
                };

                if (root.TryGetProperty("data", out var data) &&
                    data.ValueKind == JsonValueKind.Object &&
                    data.TryGetProperty("signedTransactionInfo", out var signedTx) &&
                    signedTx.ValueKind == JsonValueKind.String)
                {
                    var txPayload = DecodeJwsPayload(signedTx.GetString()!);
                    if (txPayload != null)
                        info.Transaction = MapTransaction(txPayload.Value);
                }

                return info;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error decoding Apple notification payload");
                return null;
            }
        }

        public JsonElement? DecodeJwsPayload(string jws)
        {
            try
            {
                var parts = jws.Split('.');
                if (parts.Length < 2) return null;
                var json = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.Clone();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error decoding JWS payload");
                return null;
            }
        }

        // --- helpers ------------------------------------------------------

        private string GenerateApiToken()
        {
            var header = new { alg = "ES256", kid = _keyId, typ = "JWT" };
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var payload = new System.Collections.Generic.Dictionary<string, object>
            {
                ["iss"] = _issuerId,
                ["iat"] = now,
                ["exp"] = now + 1200, // 20 min (Apple max is 60)
                ["aud"] = Audience,
                ["bid"] = _bundleId
            };

            var headerSeg = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(header));
            var payloadSeg = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(payload));
            var signingInput = $"{headerSeg}.{payloadSeg}";

            using var ecdsa = LoadPrivateKey(_privateKey);
            // ES256 = ECDSA P-256 + SHA-256, signature in IEEE P-1363 (r||s) — the .NET default.
            var signature = ecdsa.SignData(
                Encoding.ASCII.GetBytes(signingInput), HashAlgorithmName.SHA256);

            return $"{signingInput}.{Base64UrlEncode(signature)}";
        }

        private static ECDsa LoadPrivateKey(string key)
        {
            var ecdsa = ECDsa.Create();
            if (key.Contains("BEGIN"))
            {
                ecdsa.ImportFromPem(key);
            }
            else
            {
                ecdsa.ImportPkcs8PrivateKey(Convert.FromBase64String(key.Trim()), out _);
            }
            return ecdsa;
        }

        private AppleTransactionInfo MapTransaction(JsonElement t)
        {
            return new AppleTransactionInfo
            {
                BundleId = GetString(t, "bundleId"),
                ProductId = GetString(t, "productId"),
                TransactionId = GetString(t, "transactionId"),
                OriginalTransactionId = GetString(t, "originalTransactionId"),
                ExpiresDate = GetUnixMs(t, "expiresDate"),
                PurchaseDate = GetUnixMs(t, "purchaseDate"),
                Type = GetString(t, "type"),
                Environment = GetString(t, "environment")
            };
        }

        private static string? GetString(JsonElement el, string name)
            => el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
                ? v.GetString()
                : null;

        private static DateTime? GetUnixMs(JsonElement el, string name)
        {
            if (el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number &&
                v.TryGetInt64(out var ms))
            {
                return DateTimeOffset.FromUnixTimeMilliseconds(ms).UtcDateTime;
            }
            return null;
        }

        private static string Base64UrlEncode(byte[] bytes)
            => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        private static byte[] Base64UrlDecode(string input)
        {
            var s = input.Replace('-', '+').Replace('_', '/');
            switch (s.Length % 4)
            {
                case 2: s += "=="; break;
                case 3: s += "="; break;
            }
            return Convert.FromBase64String(s);
        }
    }
}
