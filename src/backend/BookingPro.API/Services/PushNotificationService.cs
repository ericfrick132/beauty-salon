using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BookingPro.API.Controllers;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public interface IPushNotificationService
    {
        bool IsConfigured { get; }

        /// <summary>Avisa al negocio de un turno nuevo ("created") o cancelado por el cliente ("cancelled").</summary>
        Task NotifyBookingAsync(Guid tenantId, Guid bookingId, string kind);

        /// <summary>Manda una notificación a todos los teléfonos registrados de esos usuarios. Devuelve cuántos la aceptaron.</summary>
        Task<int> SendToUsersAsync(IReadOnlyCollection<Guid> userIds, string title, string body, IDictionary<string, string>? data = null);
    }

    /// <summary>
    /// Push a las apps nativas sin SDKs: FCM HTTP v1 (Android) con la cuenta de servicio de Firebase y
    /// APNs por HTTP/2 (iOS) con la clave .p8, firmando los JWT con System.Security.Cryptography.
    /// Configuración (variables de entorno con "__" en lugar de ":"):
    ///   Push:Fcm:ServiceAccountJson  JSON de la cuenta de servicio (o el mismo en base64)
    ///   Push:Apns:KeyId, Push:Apns:TeamId, Push:Apns:PrivateKey (.p8, PEM o base64), Push:Apns:BundleId
    /// Lo que no está configurado se saltea sin error (los tokens quedan guardados para cuando lo esté).
    /// </summary>
    public class PushNotificationService : IPushNotificationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<PushNotificationService> _logger;
        private readonly string _fcmJson;
        private readonly string _apnsKeyId, _apnsTeamId, _apnsKey, _apnsBundleId;

        private static readonly SemaphoreSlim TokenLock = new(1, 1);
        private static string? _fcmAccessToken;
        private static DateTime _fcmAccessTokenExpires;
        private static string? _apnsJwt;
        private static DateTime _apnsJwtIssued;

        public PushNotificationService(ApplicationDbContext context, IHttpClientFactory httpFactory,
            IConfiguration configuration, ILogger<PushNotificationService> logger)
        {
            _context = context;
            _httpFactory = httpFactory;
            _logger = logger;
            _fcmJson = DecodeMaybeBase64(configuration["Push:Fcm:ServiceAccountJson"]);
            _apnsKeyId = configuration["Push:Apns:KeyId"] ?? string.Empty;
            _apnsTeamId = configuration["Push:Apns:TeamId"] ?? string.Empty;
            _apnsKey = configuration["Push:Apns:PrivateKey"] ?? string.Empty;
            _apnsBundleId = configuration["Push:Apns:BundleId"] ?? "com.ericfrick.turnospro";
        }

        private bool FcmConfigured => _fcmJson.Contains("private_key");
        private bool ApnsConfigured => _apnsKeyId.Length > 0 && _apnsTeamId.Length > 0 && _apnsKey.Length > 0;
        public bool IsConfigured => FcmConfigured || ApnsConfigured;

        public async Task NotifyBookingAsync(Guid tenantId, Guid bookingId, string kind)
        {
            try
            {
                var booking = await _context.Bookings.IgnoreQueryFilters().AsNoTracking()
                    .Include(b => b.Customer).Include(b => b.Employee).Include(b => b.Service)
                    .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);
                if (booking == null) return;

                var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant == null) return;

                // Preferencias de la pestaña Notificaciones de /settings ("Notificaciones del personal").
                var prefKey = kind == "cancelled" ? "cancellationNotification" : "newBookingNotification";
                if (!SectionFlag(tenant.Settings, "notifications", prefKey, true)) return;

                var users = await _context.Users.AsNoTracking()
                    .Where(u => u.TenantId == tenantId && u.IsActive)
                    .Select(u => new { u.Id, u.Role, u.Email })
                    .ToListAsync();
                var employeeEmail = booking.Employee?.Email?.Trim().ToLowerInvariant();
                // Dueño / admins siempre; el staff solo por sus propios turnos (se unen por email, como en las apps).
                var recipients = users
                    .Where(u => u.Role == "admin" ||
                                (!string.IsNullOrEmpty(employeeEmail) && u.Email.Trim().ToLowerInvariant() == employeeEmail))
                    .Select(u => u.Id).Distinct().ToList();
                if (recipients.Count == 0) return;

                var local = ToLocal(booking.StartTime, tenant.TimeZone);
                var when = local.ToString("ddd d/M HH:mm", new System.Globalization.CultureInfo("es-AR"));
                var customer = $"{booking.Customer?.FirstName} {booking.Customer?.LastName}".Trim();
                var service = booking.Service?.Name ?? "Turno";
                var title = kind switch { "cancelled" => "Turno cancelado", "paid" => "Seña recibida ✓", _ => "Nuevo turno" };
                var body = $"{(string.IsNullOrEmpty(customer) ? "Un cliente" : customer)} · {service} · {when}" +
                           (string.IsNullOrEmpty(booking.Employee?.Name) ? "" : $" con {booking.Employee!.Name}");

                await SendToUsersAsync(recipients, title, body, new Dictionary<string, string>
                {
                    ["type"] = kind switch { "cancelled" => "booking_cancelled", "paid" => "booking_paid", _ => "booking_created" },
                    ["bookingId"] = booking.Id.ToString(),
                    ["date"] = local.ToString("yyyy-MM-dd")
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Push: no se pudo avisar el turno {BookingId} ({Kind})", bookingId, kind);
            }
        }

        public async Task<int> SendToUsersAsync(IReadOnlyCollection<Guid> userIds, string title, string body, IDictionary<string, string>? data = null)
        {
            if (userIds.Count == 0 || !IsConfigured) return 0;
            var devices = await _context.DeviceTokens.Where(d => userIds.Contains(d.UserId)).ToListAsync();
            var sent = 0;
            var dead = new List<DeviceToken>();
            foreach (var d in devices)
            {
                var result = d.Platform == "ios"
                    ? (ApnsConfigured ? await SendApnsAsync(d, title, body, data) : PushResult.Skipped)
                    : (FcmConfigured ? await SendFcmAsync(d, title, body, data) : PushResult.Skipped);
                if (result == PushResult.Ok) sent++;
                if (result == PushResult.InvalidToken) dead.Add(d);
            }
            if (dead.Count > 0)
            {
                _context.DeviceTokens.RemoveRange(dead);
                await _context.SaveChangesAsync();
            }
            return sent;
        }

        private enum PushResult { Ok, Failed, InvalidToken, Skipped }

        // ---------------------------------------------------------------- FCM (Android)

        private async Task<PushResult> SendFcmAsync(DeviceToken d, string title, string body, IDictionary<string, string>? data)
        {
            try
            {
                using var sa = JsonDocument.Parse(_fcmJson);
                var projectId = sa.RootElement.GetProperty("project_id").GetString();
                var token = await GetFcmAccessTokenAsync(sa.RootElement);
                var payload = new
                {
                    message = new
                    {
                        token = d.Token,
                        notification = new { title, body },
                        data = data ?? new Dictionary<string, string>(),
                        android = new { priority = "HIGH", notification = new { channel_id = "turnos" } }
                    }
                };
                var req = new HttpRequestMessage(HttpMethod.Post, $"https://fcm.googleapis.com/v1/projects/{projectId}/messages:send")
                {
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                using var res = await _httpFactory.CreateClient().SendAsync(req);
                if (res.IsSuccessStatusCode) return PushResult.Ok;
                var text = await res.Content.ReadAsStringAsync();
                if (res.StatusCode == HttpStatusCode.NotFound || text.Contains("UNREGISTERED") || text.Contains("INVALID_ARGUMENT"))
                    return PushResult.InvalidToken;
                _logger.LogWarning("FCM {Status}: {Body}", (int)res.StatusCode, text);
                return PushResult.Failed;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "FCM: error enviando push");
                return PushResult.Failed;
            }
        }

        private async Task<string> GetFcmAccessTokenAsync(JsonElement sa)
        {
            await TokenLock.WaitAsync();
            try
            {
                if (_fcmAccessToken != null && DateTime.UtcNow < _fcmAccessTokenExpires) return _fcmAccessToken;
                var email = sa.GetProperty("client_email").GetString()!;
                var pem = sa.GetProperty("private_key").GetString()!;
                var tokenUri = sa.TryGetProperty("token_uri", out var tu) ? tu.GetString()! : "https://oauth2.googleapis.com/token";
                var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                using var rsa = RSA.Create();
                rsa.ImportFromPem(pem);
                var jwt = SignJwt(new { alg = "RS256", typ = "JWT" },
                    new { iss = email, scope = "https://www.googleapis.com/auth/firebase.messaging", aud = tokenUri, iat = now, exp = now + 3600 },
                    bytes => rsa.SignData(bytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
                using var res = await _httpFactory.CreateClient().PostAsync(tokenUri, new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    ["assertion"] = jwt
                }));
                res.EnsureSuccessStatusCode();
                using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
                _fcmAccessToken = doc.RootElement.GetProperty("access_token").GetString();
                _fcmAccessTokenExpires = DateTime.UtcNow.AddMinutes(50);
                return _fcmAccessToken!;
            }
            finally
            {
                TokenLock.Release();
            }
        }

        // ---------------------------------------------------------------- APNs (iOS)

        private async Task<PushResult> SendApnsAsync(DeviceToken d, string title, string body, IDictionary<string, string>? data)
        {
            try
            {
                var host = d.Environment == "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
                var payload = new Dictionary<string, object>
                {
                    ["aps"] = new { alert = new { title, body }, sound = "default" }
                };
                if (data != null) foreach (var kv in data) payload[kv.Key] = kv.Value;
                var req = new HttpRequestMessage(HttpMethod.Post, $"https://{host}/3/device/{d.Token}")
                {
                    Version = HttpVersion.Version20,
                    VersionPolicy = HttpVersionPolicy.RequestVersionExact,
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };
                req.Headers.Authorization = new AuthenticationHeaderValue("bearer", GetApnsJwt());
                req.Headers.TryAddWithoutValidation("apns-topic", _apnsBundleId);
                req.Headers.TryAddWithoutValidation("apns-push-type", "alert");
                using var res = await _httpFactory.CreateClient().SendAsync(req);
                if (res.IsSuccessStatusCode) return PushResult.Ok;
                var text = await res.Content.ReadAsStringAsync();
                if (res.StatusCode == HttpStatusCode.Gone || text.Contains("BadDeviceToken") || text.Contains("Unregistered"))
                    return PushResult.InvalidToken;
                _logger.LogWarning("APNs {Status}: {Body}", (int)res.StatusCode, text);
                return PushResult.Failed;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "APNs: error enviando push");
                return PushResult.Failed;
            }
        }

        private string GetApnsJwt()
        {
            // Apple pide renovarlo entre 20 y 60 minutos.
            if (_apnsJwt != null && DateTime.UtcNow - _apnsJwtIssued < TimeSpan.FromMinutes(40)) return _apnsJwt;
            using var ecdsa = ECDsa.Create();
            if (_apnsKey.Contains("BEGIN")) ecdsa.ImportFromPem(_apnsKey);
            else ecdsa.ImportPkcs8PrivateKey(Convert.FromBase64String(_apnsKey.Trim()), out _);
            _apnsJwt = SignJwt(new { alg = "ES256", kid = _apnsKeyId },
                new { iss = _apnsTeamId, iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds() },
                bytes => ecdsa.SignData(bytes, HashAlgorithmName.SHA256));
            _apnsJwtIssued = DateTime.UtcNow;
            return _apnsJwt;
        }

        // ---------------------------------------------------------------- helpers

        private static string SignJwt(object header, object claims, Func<byte[], byte[]> sign)
        {
            var h = B64Url(JsonSerializer.SerializeToUtf8Bytes(header));
            var c = B64Url(JsonSerializer.SerializeToUtf8Bytes(claims));
            var input = $"{h}.{c}";
            return $"{input}.{B64Url(sign(Encoding.ASCII.GetBytes(input)))}";
        }

        private static string B64Url(byte[] bytes) =>
            Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        private static string DecodeMaybeBase64(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var v = value.Trim();
            if (v.StartsWith("{")) return v;
            try { return Encoding.UTF8.GetString(Convert.FromBase64String(v)); }
            catch { return string.Empty; }
        }

        private static DateTime ToLocal(DateTime utc, string? tzId)
        {
            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById(string.IsNullOrWhiteSpace(tzId) || tzId == "UTC" ? "America/Argentina/Buenos_Aires" : tzId); }
            catch { tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires"); }
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), tz);
        }

        private static bool SectionFlag(string? settingsJson, string section, string key, bool fallback)
        {
            if (string.IsNullOrWhiteSpace(settingsJson)) return fallback;
            try
            {
                using var doc = JsonDocument.Parse(settingsJson);
                if (doc.RootElement.TryGetProperty(SettingsController.SectionKey(section), out var sec) &&
                    sec.ValueKind == JsonValueKind.Object && sec.TryGetProperty(key, out var v) &&
                    (v.ValueKind == JsonValueKind.True || v.ValueKind == JsonValueKind.False))
                    return v.GetBoolean();
            }
            catch { }
            return fallback;
        }
    }

    /// <summary>Dispara el aviso en segundo plano con su propio scope: no demora ni rompe la reserva.</summary>
    public static class PushDispatch
    {
        private static IServiceScopeFactory? _scopes;

        public static void Init(IServiceProvider services) => _scopes = services.GetRequiredService<IServiceScopeFactory>();

        public static void BookingEvent(Guid tenantId, Guid bookingId, string kind)
        {
            var scopes = _scopes;
            if (scopes == null || tenantId == Guid.Empty) return;
            _ = Task.Run(async () =>
            {
                using var scope = scopes.CreateScope();
                var push = scope.ServiceProvider.GetRequiredService<IPushNotificationService>();
                if (!push.IsConfigured) return;
                await push.NotifyBookingAsync(tenantId, bookingId, kind);
            });
        }
    }
}
