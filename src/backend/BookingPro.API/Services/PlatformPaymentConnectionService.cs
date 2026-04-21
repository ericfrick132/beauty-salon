using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public interface IPlatformPaymentConnectionService
    {
        Task<PlatformPaymentConnection?> GetActiveAsync(string providerCode);
        Task<string?> GetAccessTokenAsync(string providerCode);
        string BuildMercadoPagoAuthorizationUrl(string state);
        Task<PlatformPaymentConnection> HandleMercadoPagoCallbackAsync(string code);
        Task DisconnectAsync(string providerCode);
    }

    public class PlatformPaymentConnectionService : IPlatformPaymentConnectionService
    {
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
        {
            var conn = await GetActiveAsync(providerCode);
            if (conn is null)
            {
                return providerCode switch
                {
                    "mercadopago" => _configuration["MercadoPago:AccessToken"],
                    "stripe" => _configuration["Stripe:SecretKey"],
                    _ => null
                };
            }

            if (conn.ExpiresAt.HasValue && conn.ExpiresAt.Value < DateTime.UtcNow.AddMinutes(5))
            {
                var refreshed = await TryRefreshAsync(conn);
                if (refreshed is not null) return refreshed.AccessToken;
            }

            return conn.AccessToken;
        }

        public string BuildMercadoPagoAuthorizationUrl(string state)
        {
            var clientId = _configuration["MercadoPago:ClientId"] ?? string.Empty;
            var redirectUri = $"{(_configuration["BackendUrl"] ?? "").TrimEnd('/')}/api/super-admin/payments/mercadopago/callback";
            return $"https://auth.mercadopago.com.ar/authorization" +
                   $"?client_id={Uri.EscapeDataString(clientId)}" +
                   $"&response_type=code&platform_id=mp" +
                   $"&state={Uri.EscapeDataString(state)}" +
                   $"&redirect_uri={Uri.EscapeDataString(redirectUri)}";
        }

        public async Task<PlatformPaymentConnection> HandleMercadoPagoCallbackAsync(string code)
        {
            var clientId = _configuration["MercadoPago:ClientId"] ?? throw new InvalidOperationException("MercadoPago:ClientId not configured");
            var clientSecret = _configuration["MercadoPago:ClientSecret"] ?? throw new InvalidOperationException("MercadoPago:ClientSecret not configured");
            var redirectUri = $"{(_configuration["BackendUrl"] ?? "").TrimEnd('/')}/api/super-admin/payments/mercadopago/callback";

            var form = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", redirectUri),
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

            var existing = await _context.PlatformPaymentConnections
                .IgnoreQueryFilters()
                .Where(c => c.ProviderCode == "mercadopago" && c.IsActive)
                .ToListAsync();
            foreach (var e in existing)
            {
                e.IsActive = false;
                e.DisconnectedAt = DateTime.UtcNow;
                e.UpdatedAt = DateTime.UtcNow;
            }

            var conn = new PlatformPaymentConnection
            {
                ProviderCode = "mercadopago",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                PublicKey = publicKey,
                ExternalAccountId = userId,
                Scope = scope,
                ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                IsActive = true
            };
            _context.PlatformPaymentConnections.Add(conn);
            await _context.SaveChangesAsync();
            return conn;
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
