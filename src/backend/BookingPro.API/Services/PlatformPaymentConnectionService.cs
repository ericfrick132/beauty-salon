using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// De dónde salió el token con el que la plataforma cobra hoy.
    /// </summary>
    public enum PlatformTokenSource
    {
        None,
        OAuth,
        Manual,
        LegacyDatabase,
        AppSettings
    }

    public record PlatformTokenResolution(string? AccessToken, PlatformTokenSource Source);

    public record PlatformAccountInfo(string? Email, string? Nickname, string? UserId, string? SiteId);

    public interface IPlatformPaymentConnectionService
    {
        /// <summary>Prefijo de state que marca un OAuth de la plataforma (vs. el de un tenant).</summary>
        const string PlatformStatePrefix = "platform_";

        Task<PlatformPaymentConnection?> GetActiveAsync(string providerCode);
        Task<string?> GetAccessTokenAsync(string providerCode);
        Task<PlatformTokenResolution> ResolveAccessTokenAsync(string providerCode);
        string CreatePlatformState();
        bool ValidatePlatformState(string? state);
        string GetMercadoPagoRedirectUri(string? baseUrl = null);
        string BuildMercadoPagoAuthorizationUrl(string state, string? baseUrl = null);
        Task<PlatformPaymentConnection> HandleMercadoPagoCallbackAsync(string code, string state, string? baseUrl = null);
        Task<PlatformPaymentConnection> SaveManualMercadoPagoTokenAsync(string accessToken, string? publicKey);
        Task<PlatformAccountInfo?> FetchMercadoPagoAccountAsync(string accessToken);
        Task DisconnectAsync(string providerCode);
    }

    public class PlatformPaymentConnectionService : IPlatformPaymentConnectionService
    {
        private const string DefaultBaseUrl = "https://turnos-pro.com";

        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly ILogger<PlatformPaymentConnectionService> _logger;

        public PlatformPaymentConnectionService(
            ApplicationDbContext context,
            IConfiguration configuration,
            HttpClient httpClient,
            ILogger<PlatformPaymentConnectionService> logger)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = httpClient;
            _logger = logger;
        }

        public Task<PlatformPaymentConnection?> GetActiveAsync(string providerCode) =>
            _context.PlatformPaymentConnections
                .IgnoreQueryFilters()
                .Where(c => c.ProviderCode == providerCode && c.IsActive)
                .OrderByDescending(c => c.ConnectedAt)
                .FirstOrDefaultAsync();

        public async Task<string?> GetAccessTokenAsync(string providerCode)
            => (await ResolveAccessTokenAsync(providerCode)).AccessToken;

        /// <summary>
        /// Orden de resolución: conexión del super admin (OAuth o token manual) →
        /// tabla legacy platform_mercadopago_config → appsettings/env.
        /// </summary>
        public async Task<PlatformTokenResolution> ResolveAccessTokenAsync(string providerCode)
        {
            var conn = await GetActiveAsync(providerCode);
            if (conn is not null)
            {
                if (conn.ExpiresAt.HasValue && conn.ExpiresAt.Value < DateTime.UtcNow.AddMinutes(5))
                {
                    var refreshed = await TryRefreshAsync(conn);
                    if (refreshed is not null)
                        return new PlatformTokenResolution(refreshed.AccessToken, ModeToSource(refreshed.ConnectionMode));
                }

                return new PlatformTokenResolution(conn.AccessToken, ModeToSource(conn.ConnectionMode));
            }

            if (providerCode == "mercadopago")
            {
                var legacy = await _context.PlatformMercadoPagoConfigurations
                    .IgnoreQueryFilters()
                    .Where(c => c.IsActive && c.AccessToken != "")
                    .OrderByDescending(c => c.ConnectedAt)
                    .FirstOrDefaultAsync();
                if (legacy is not null)
                    return new PlatformTokenResolution(legacy.AccessToken, PlatformTokenSource.LegacyDatabase);
            }

            var fromConfig = providerCode switch
            {
                "mercadopago" => _configuration["MercadoPago:AccessToken"],
                "stripe" => _configuration["Stripe:SecretKey"],
                _ => null
            };

            return string.IsNullOrWhiteSpace(fromConfig)
                ? new PlatformTokenResolution(null, PlatformTokenSource.None)
                : new PlatformTokenResolution(fromConfig, PlatformTokenSource.AppSettings);
        }

        private static PlatformTokenSource ModeToSource(string? mode)
            => string.Equals(mode, "manual", StringComparison.OrdinalIgnoreCase)
                ? PlatformTokenSource.Manual
                : PlatformTokenSource.OAuth;

        /// <summary>
        /// Base pública del backend. Preferimos la URL de la request (la app se sirve
        /// bajo el mismo dominio que la API) porque BackendUrl no siempre está seteada.
        /// </summary>
        private string ResolveBaseUrl(string? baseUrl)
        {
            var candidate = baseUrl
                ?? _configuration["BackendUrl"]
                ?? _configuration["ApiUrl"];

            if (string.IsNullOrWhiteSpace(candidate) || candidate.Contains("localhost"))
                candidate = DefaultBaseUrl;

            return candidate.TrimEnd('/');
        }

        /// <summary>
        /// State firmado: el callback es anónimo, así que sin firma cualquiera podría
        /// postear un code y desviar la cuenta que cobra. Se valida solo (sin tabla) para
        /// que funcione con más de una instancia.
        /// </summary>
        public string CreatePlatformState()
        {
            var issued = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            return $"{IPlatformPaymentConnectionService.PlatformStatePrefix}{issued}_{SignState(issued)}";
        }

        public bool ValidatePlatformState(string? state)
        {
            if (string.IsNullOrEmpty(state) || !state.StartsWith(IPlatformPaymentConnectionService.PlatformStatePrefix, StringComparison.Ordinal))
                return false;

            // La firma es base64url y puede traer '_', así que cortamos solo en el primer separador.
            var payload = state.Substring(IPlatformPaymentConnectionService.PlatformStatePrefix.Length);
            var separator = payload.IndexOf('_');
            if (separator <= 0 || separator == payload.Length - 1) return false;

            var issuedRaw = payload.Substring(0, separator);
            var signature = payload.Substring(separator + 1);
            if (!long.TryParse(issuedRaw, out var issued)) return false;

            var age = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - issued;
            if (age < -60 || age > 900) return false; // 15 minutos de ventana

            var expected = System.Text.Encoding.UTF8.GetBytes(SignState(issuedRaw));
            var actual = System.Text.Encoding.UTF8.GetBytes(signature);
            return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expected, actual);
        }

        private static string? IssuedFromState(string? state)
        {
            if (string.IsNullOrEmpty(state) || !state.StartsWith(IPlatformPaymentConnectionService.PlatformStatePrefix, StringComparison.Ordinal))
                return null;
            var payload = state.Substring(IPlatformPaymentConnectionService.PlatformStatePrefix.Length);
            var separator = payload.IndexOf('_');
            return separator <= 0 ? null : payload.Substring(0, separator);
        }

        /// <summary>
        /// MercadoPago exige PKCE. Derivamos el verifier del state firmado en vez de
        /// guardarlo: el server lo puede recalcular en el callback sin tabla ni sesión,
        /// y nunca sale del backend.
        /// </summary>
        private (string Verifier, string Challenge) DerivePkce(string issued)
        {
            var key = _configuration["Jwt:Key"] ?? "platform-oauth-state";
            using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(key));
            var verifier = Base64Url(hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes($"platform-mp-pkce:{issued}")));

            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var challenge = Base64Url(sha256.ComputeHash(System.Text.Encoding.ASCII.GetBytes(verifier)));

            return (verifier, challenge);
        }

        private static string Base64Url(byte[] bytes)
            => Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');

        private string SignState(string issued)
        {
            var key = _configuration["Jwt:Key"] ?? "platform-oauth-state";
            using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(key));
            return Base64Url(hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes($"platform-mp-oauth:{issued}")));
        }

        /// <summary>
        /// MercadoPago solo acepta la redirect URI dada de alta en la aplicación, así que
        /// reusamos la que ya está registrada (la del flujo por tenant) y distinguimos el
        /// flujo de plataforma por el prefijo del state.
        /// </summary>
        public string GetMercadoPagoRedirectUri(string? baseUrl = null)
        {
            var configured = _configuration["MercadoPago:RedirectUri"];
            if (!string.IsNullOrWhiteSpace(configured) && !configured.Contains("localhost"))
                return configured.Trim();

            return $"{ResolveBaseUrl(baseUrl)}/api/mercadopago/oauth/callback";
        }

        public string BuildMercadoPagoAuthorizationUrl(string state, string? baseUrl = null)
        {
            var clientId = _configuration["MercadoPago:ClientId"] ?? string.Empty;
            var redirectUri = GetMercadoPagoRedirectUri(baseUrl);
            var issued = IssuedFromState(state) ?? throw new InvalidOperationException("State de plataforma inválido");
            var (_, challenge) = DerivePkce(issued);

            return $"https://auth.mercadopago.com.ar/authorization" +
                   $"?client_id={Uri.EscapeDataString(clientId)}" +
                   $"&response_type=code&platform_id=mp" +
                   $"&state={Uri.EscapeDataString(state)}" +
                   $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                   $"&code_challenge={Uri.EscapeDataString(challenge)}" +
                   $"&code_challenge_method=S256";
        }

        public async Task<PlatformPaymentConnection> HandleMercadoPagoCallbackAsync(string code, string state, string? baseUrl = null)
        {
            var clientId = _configuration["MercadoPago:ClientId"] ?? throw new InvalidOperationException("MercadoPago:ClientId not configured");
            var clientSecret = _configuration["MercadoPago:ClientSecret"] ?? throw new InvalidOperationException("MercadoPago:ClientSecret not configured");
            var redirectUri = GetMercadoPagoRedirectUri(baseUrl);
            var issued = IssuedFromState(state) ?? throw new InvalidOperationException("State de plataforma inválido");
            var (verifier, _) = DerivePkce(issued);

            var form = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", redirectUri),
                new KeyValuePair<string, string>("code_verifier", verifier),
            });

            var response = await _httpClient.PostAsync("https://api.mercadopago.com/oauth/token", form);
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("MP OAuth token exchange failed: {Body}", body);
                throw new InvalidOperationException("MercadoPago rejected the authorization code");
            }

            var token = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body)
                ?? throw new InvalidOperationException("Empty MP token response");

            var accessToken = token["access_token"].GetString() ?? throw new InvalidOperationException("Missing access_token");
            var refreshToken = token.TryGetValue("refresh_token", out var rt) ? rt.GetString() : null;
            var publicKey = token.TryGetValue("public_key", out var pk) ? pk.GetString() : null;
            var userId = token.TryGetValue("user_id", out var uid) ? uid.GetRawText().Trim('"') : null;
            var scope = token.TryGetValue("scope", out var sc) ? sc.GetString() : null;
            var expiresIn = token.TryGetValue("expires_in", out var ei) ? ei.GetInt32() : 15552000;

            var account = await FetchMercadoPagoAccountAsync(accessToken);

            return await SaveConnectionAsync(new PlatformPaymentConnection
            {
                ProviderCode = "mercadopago",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                PublicKey = publicKey,
                ExternalAccountId = userId ?? account?.UserId,
                AccountEmail = account?.Email ?? account?.Nickname,
                Scope = scope,
                ConnectionMode = "oauth",
                ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                IsActive = true
            });
        }

        /// <summary>
        /// Guarda un access token pegado a mano (el que aparece en el panel de
        /// desarrolladores de MP). Sirve cuando todavía no hay redirect URI habilitada
        /// para el flujo OAuth.
        /// </summary>
        public async Task<PlatformPaymentConnection> SaveManualMercadoPagoTokenAsync(string accessToken, string? publicKey)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
                throw new ArgumentException("El access token no puede estar vacío", nameof(accessToken));

            accessToken = accessToken.Trim();

            var account = await FetchMercadoPagoAccountAsync(accessToken)
                ?? throw new InvalidOperationException("MercadoPago rechazó ese access token");

            return await SaveConnectionAsync(new PlatformPaymentConnection
            {
                ProviderCode = "mercadopago",
                AccessToken = accessToken,
                PublicKey = string.IsNullOrWhiteSpace(publicKey) ? null : publicKey.Trim(),
                ExternalAccountId = account.UserId,
                AccountEmail = account.Email ?? account.Nickname,
                ConnectionMode = "manual",
                ExpiresAt = null,
                IsActive = true
            });
        }

        /// <summary>
        /// Consulta /users/me para saber a qué cuenta pertenece el token (y de paso validarlo).
        /// </summary>
        public async Task<PlatformAccountInfo?> FetchMercadoPagoAccountAsync(string accessToken)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.mercadopago.com/users/me");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("MP /users/me returned {Status}", response.StatusCode);
                    return null;
                }

                var json = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                    await response.Content.ReadAsStringAsync());
                if (json is null) return null;

                string? Str(string key) => json.TryGetValue(key, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
                string? Raw(string key) => json.TryGetValue(key, out var v) ? v.GetRawText().Trim('"') : null;

                return new PlatformAccountInfo(Str("email"), Str("nickname"), Raw("id"), Str("site_id"));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error querying MP /users/me");
                return null;
            }
        }

        private async Task<PlatformPaymentConnection> SaveConnectionAsync(PlatformPaymentConnection connection)
        {
            var existing = await _context.PlatformPaymentConnections
                .IgnoreQueryFilters()
                .Where(c => c.ProviderCode == connection.ProviderCode && c.IsActive)
                .ToListAsync();
            foreach (var e in existing)
            {
                e.IsActive = false;
                e.DisconnectedAt = DateTime.UtcNow;
                e.UpdatedAt = DateTime.UtcNow;
            }

            _context.PlatformPaymentConnections.Add(connection);
            await _context.SaveChangesAsync();
            return connection;
        }

        private async Task<PlatformPaymentConnection?> TryRefreshAsync(PlatformPaymentConnection conn)
        {
            if (conn.ProviderCode != "mercadopago" || string.IsNullOrEmpty(conn.RefreshToken)) return null;
            var clientId = _configuration["MercadoPago:ClientId"];
            var clientSecret = _configuration["MercadoPago:ClientSecret"];
            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret)) return null;

            var form = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "refresh_token"),
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("refresh_token", conn.RefreshToken),
            });

            var response = await _httpClient.PostAsync("https://api.mercadopago.com/oauth/token", form);
            if (!response.IsSuccessStatusCode) return null;

            var token = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(await response.Content.ReadAsStringAsync());
            if (token is null) return null;

            conn.AccessToken = token["access_token"].GetString() ?? conn.AccessToken;
            if (token.TryGetValue("refresh_token", out var rt)) conn.RefreshToken = rt.GetString();
            var expiresIn = token.TryGetValue("expires_in", out var ei) ? ei.GetInt32() : 15552000;
            conn.ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
            conn.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return conn;
        }

        public async Task DisconnectAsync(string providerCode)
        {
            var connections = await _context.PlatformPaymentConnections
                .IgnoreQueryFilters()
                .Where(c => c.ProviderCode == providerCode && c.IsActive)
                .ToListAsync();
            foreach (var c in connections)
            {
                c.IsActive = false;
                c.DisconnectedAt = DateTime.UtcNow;
                c.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }
    }
}
