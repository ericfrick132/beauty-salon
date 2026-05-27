using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// OAuth flow for connecting tenant Chytapay accounts. Mirrors
    /// MercadoPagoOAuthService — the main differences are:
    ///   - No PKCE (Chytapay docs don't reference it).
    ///   - Token endpoint uses JSON body (not form-urlencoded).
    ///   - The "access token" is called `idToken` in their payload.
    ///   - No /me endpoint, so we don't fetch account info post-connect.
    /// </summary>
    public class ChytapayOAuthService : IChytapayOAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ChytapayOAuthService> _logger;
        private readonly IConfiguration _configuration;
        private readonly ITenantProvider _tenantProvider;
        private readonly HttpClient _httpClient;

        public ChytapayOAuthService(
            ApplicationDbContext context,
            ILogger<ChytapayOAuthService> logger,
            IConfiguration configuration,
            ITenantProvider tenantProvider,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _tenantProvider = tenantProvider;
            _httpClient = httpClientFactory.CreateClient();
        }

        private string AuthApiUrl =>
            (_configuration["Chytapay:AuthApiUrl"] ?? string.Empty).TrimEnd('/');

        public async Task<ServiceResult<ChytapayOAuthUrlDto>> InitiateOAuthFlowAsync(InitiateChytapayOAuthDto dto)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<ChytapayOAuthUrlDto>.Fail("Tenant not found");
                }

                var clientId = _configuration["Chytapay:ClientId"];
                var redirectUri = _configuration["Chytapay:RedirectUri"];

                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(redirectUri) || string.IsNullOrEmpty(AuthApiUrl))
                {
                    return ServiceResult<ChytapayOAuthUrlDto>.Fail("Chytapay OAuth not configured");
                }

                var state = GenerateStateParameter(tenantId);
                await CleanupExpiredStatesAsync(tenantId);

                var oauthState = new ChytapayOAuthState
                {
                    TenantId = tenantId,
                    State = state,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(15)
                };

                _context.Set<ChytapayOAuthState>().Add(oauthState);
                await _context.SaveChangesAsync();

                var authUrl = BuildAuthorizationUrl(clientId, redirectUri, state);
                oauthState.AuthorizationUrl = authUrl;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Chytapay OAuth flow initiated for tenant {TenantId}", tenantId);

                return ServiceResult<ChytapayOAuthUrlDto>.Ok(new ChytapayOAuthUrlDto
                {
                    AuthorizationUrl = authUrl,
                    State = state,
                    ExpiresAt = oauthState.ExpiresAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating Chytapay OAuth flow");
                return ServiceResult<ChytapayOAuthUrlDto>.Fail("Error initiating OAuth");
            }
        }

        public async Task<ServiceResult<bool>> ProcessOAuthCallbackAsync(ChytapayOAuthCallbackDto dto)
        {
            try
            {
                var stateResult = await ValidateOAuthStateAsync(dto.State);
                if (!stateResult.Success || stateResult.Data == Guid.Empty)
                {
                    return ServiceResult<bool>.Fail("Invalid OAuth state");
                }

                var tenantId = stateResult.Data;

                var oauthState = await _context.Set<ChytapayOAuthState>()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.State == dto.State && s.TenantId == tenantId);

                if (oauthState == null || oauthState.IsExpired || oauthState.ExpiresAt < DateTime.UtcNow)
                {
                    return ServiceResult<bool>.Fail("OAuth state expired");
                }

                if (!string.IsNullOrEmpty(dto.Error))
                {
                    oauthState.ErrorCode = dto.Error;
                    oauthState.ErrorDescription = dto.ErrorDescription;
                    oauthState.IsCompleted = true;
                    await _context.SaveChangesAsync();

                    _logger.LogWarning("Chytapay OAuth error for tenant {TenantId}: {Error} - {Description}",
                        tenantId, dto.Error, dto.ErrorDescription);
                    return ServiceResult<bool>.Fail($"OAuth error: {dto.Error}");
                }

                var tokenResult = await ExchangeCodeForTokenAsync(dto.Code);
                if (!tokenResult.Success || tokenResult.Data == null)
                {
                    oauthState.ErrorCode = "token_exchange_failed";
                    oauthState.ErrorDescription = tokenResult.Message;
                    oauthState.IsCompleted = true;
                    oauthState.CompletedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    var reason = string.IsNullOrWhiteSpace(tokenResult.Message)
                        ? "Failed to exchange code for token"
                        : $"Failed to exchange code for token: {tokenResult.Message}";
                    return ServiceResult<bool>.Fail(reason);
                }

                await SaveOAuthConfigurationAsync(tenantId, tokenResult.Data);

                oauthState.AuthorizationCode = dto.Code;
                oauthState.IsCompleted = true;
                oauthState.CompletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Chytapay OAuth flow completed for tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Ok(true, "Chytapay connected successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Chytapay OAuth callback");
                return ServiceResult<bool>.Fail("Error processing OAuth callback");
            }
        }

        public async Task<ServiceResult<ChytapayConnectionStatusDto>> GetConnectionStatusAsync()
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<ChytapayConnectionStatusDto>.Fail("Tenant not found");
                }

                var config = await _context.Set<ChytapayOAuthConfiguration>()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (config == null)
                {
                    return ServiceResult<ChytapayConnectionStatusDto>.Ok(new ChytapayConnectionStatusDto
                    {
                        IsConnected = false
                    });
                }

                return ServiceResult<ChytapayConnectionStatusDto>.Ok(new ChytapayConnectionStatusDto
                {
                    IsConnected = true,
                    ConnectedAt = config.ConnectedAt,
                    IdTokenExpiresAt = config.IdTokenExpiresAt,
                    NeedsRefresh = config.IdTokenExpiresAt <= DateTime.UtcNow.AddDays(7),
                    IsTestMode = config.IsTestMode,
                    LastError = config.LastRefreshError
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Chytapay connection status");
                return ServiceResult<ChytapayConnectionStatusDto>.Fail("Error getting status");
            }
        }

        public async Task<ServiceResult<bool>> RefreshAccessTokenAsync(Guid? tenantId = null)
        {
            try
            {
                tenantId ??= _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var config = await _context.Set<ChytapayOAuthConfiguration>()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (config == null || string.IsNullOrEmpty(config.RefreshToken))
                {
                    return ServiceResult<bool>.Fail("No refresh token available");
                }

                var refreshToken = DecryptToken(config.RefreshToken);
                var tokenResult = await RefreshTokenAsync(refreshToken);

                if (!tokenResult.Success || tokenResult.Data == null)
                {
                    config.LastRefreshError = tokenResult.Message;
                    config.RefreshAttempts++;
                    config.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return ServiceResult<bool>.Fail(tokenResult.Message ?? "Token refresh failed");
                }

                config.IdToken = EncryptToken(tokenResult.Data.IdToken);
                config.IdTokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResult.Data.ExpiresIn);
                config.LastRefreshAt = DateTime.UtcNow;
                config.RefreshAttempts = 0;
                config.LastRefreshError = null;
                config.LastUsedAt = DateTime.UtcNow;
                config.UpdatedAt = DateTime.UtcNow;

                if (!string.IsNullOrEmpty(tokenResult.Data.RefreshToken))
                {
                    config.RefreshToken = EncryptToken(tokenResult.Data.RefreshToken);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Chytapay token refreshed for tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing Chytapay access token");
                return ServiceResult<bool>.Fail("Error refreshing token");
            }
        }

        public async Task<ServiceResult<bool>> DisconnectOAuthAsync(DisconnectChytapayDto dto)
        {
            try
            {
                if (!dto.ConfirmDisconnect)
                {
                    return ServiceResult<bool>.Fail("Disconnection not confirmed");
                }

                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var config = await _context.Set<ChytapayOAuthConfiguration>()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (config != null)
                {
                    config.IsActive = false;
                    config.DisconnectedAt = DateTime.UtcNow;
                    config.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                var states = await _context.Set<ChytapayOAuthState>()
                    .Where(s => s.TenantId == tenantId)
                    .ToListAsync();

                _context.Set<ChytapayOAuthState>().RemoveRange(states);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Chytapay disconnected for tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Ok(true, "Chytapay disconnected successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting Chytapay");
                return ServiceResult<bool>.Fail("Error disconnecting");
            }
        }

        public async Task<ServiceResult<string>> GetValidAccessTokenAsync(Guid? tenantId = null)
        {
            try
            {
                tenantId ??= _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<string>.Fail("Tenant not found");
                }

                var config = await _context.Set<ChytapayOAuthConfiguration>()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (config == null)
                {
                    return ServiceResult<string>.Fail("Chytapay not connected");
                }

                // Refresh if expiring in under an hour (mirrors MP behaviour).
                if (config.IdTokenExpiresAt <= DateTime.UtcNow.AddHours(1))
                {
                    var refreshResult = await RefreshAccessTokenAsync(tenantId);
                    if (!refreshResult.Success)
                    {
                        return ServiceResult<string>.Fail("Failed to refresh token");
                    }

                    config = await _context.Set<ChytapayOAuthConfiguration>()
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);
                }

                if (config == null)
                {
                    return ServiceResult<string>.Fail("Configuration not found after refresh");
                }

                config.LastUsedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return ServiceResult<string>.Ok(DecryptToken(config.IdToken));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting valid Chytapay token");
                return ServiceResult<string>.Fail("Error getting access token");
            }
        }

        public async Task<ServiceResult<Guid>> ValidateOAuthStateAsync(string state)
        {
            try
            {
                if (string.IsNullOrEmpty(state))
                {
                    return ServiceResult<Guid>.Fail("Invalid state");
                }

                var parts = state.Split('_');
                if (parts.Length != 3 || parts[0] != "ctp")
                {
                    return ServiceResult<Guid>.Fail("Invalid state format");
                }

                if (!Guid.TryParse(parts[1], out var tenantId))
                {
                    return ServiceResult<Guid>.Fail("Invalid tenant ID in state");
                }

                var oauthState = await _context.Set<ChytapayOAuthState>()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.State == state && s.TenantId == tenantId);

                if (oauthState == null)
                {
                    return ServiceResult<Guid>.Fail("State not found");
                }

                if (oauthState.ExpiresAt < DateTime.UtcNow)
                {
                    oauthState.IsExpired = true;
                    await _context.SaveChangesAsync();
                    return ServiceResult<Guid>.Fail("State expired");
                }

                return ServiceResult<Guid>.Ok(tenantId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating Chytapay OAuth state");
                return ServiceResult<Guid>.Fail("Error validating state");
            }
        }

        public async Task<ServiceResult<int>> RefreshExpiringTokensAsync()
        {
            try
            {
                var expiring = await _context.Set<ChytapayOAuthConfiguration>()
                    .Where(c => c.IsActive &&
                                c.IdTokenExpiresAt <= DateTime.UtcNow.AddDays(7) &&
                                !string.IsNullOrEmpty(c.RefreshToken))
                    .ToListAsync();

                var refreshed = 0;
                foreach (var config in expiring)
                {
                    var result = await RefreshAccessTokenAsync(config.TenantId);
                    if (result.Success) refreshed++;
                }

                _logger.LogInformation("Refreshed {Count} expiring Chytapay tokens", refreshed);
                return ServiceResult<int>.Ok(refreshed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing expiring Chytapay tokens");
                return ServiceResult<int>.Fail("Error refreshing tokens");
            }
        }

        public async Task<ServiceResult<bool>> TestConnectionAsync()
        {
            // No /me endpoint in Chytapay docs — best we can do is confirm we
            // have a non-expired token (refreshing if needed).
            var tokenResult = await GetValidAccessTokenAsync();
            return tokenResult.Success
                ? ServiceResult<bool>.Ok(true, "Chytapay connection OK")
                : ServiceResult<bool>.Fail(tokenResult.Message ?? "Chytapay not connected");
        }

        // ============================ Private helpers ============================

        private static string GenerateStateParameter(Guid tenantId)
        {
            var randomBytes = new byte[16];
            RandomNumberGenerator.Fill(randomBytes);
            var randomString = Convert.ToBase64String(randomBytes)
                .Replace("+", "")
                .Replace("/", "")
                .Replace("=", "")[..10];
            return $"ctp_{tenantId}_{randomString}";
        }

        private string BuildAuthorizationUrl(string clientId, string redirectUri, string state)
        {
            var queryParams = new Dictionary<string, string>
            {
                ["response_type"] = "code",
                ["client_id"] = clientId,
                ["redirect_uri"] = redirectUri,
                ["state"] = state
            };

            var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
            return $"{AuthApiUrl}/integration/oauth2/authorize?{queryString}";
        }

        private async Task<ServiceResult<ChytapayTokenResponseDto>> ExchangeCodeForTokenAsync(string code)
        {
            var clientId = _configuration["Chytapay:ClientId"];
            var clientSecret = _configuration["Chytapay:ClientSecret"];
            var redirectUri = _configuration["Chytapay:RedirectUri"];

            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret) || string.IsNullOrWhiteSpace(redirectUri))
            {
                return ServiceResult<ChytapayTokenResponseDto>.Fail("Chytapay OAuth configuration missing");
            }

            var body = new
            {
                grant_type = "authorization_code",
                code,
                client_id = clientId,
                client_secret = clientSecret,
                redirect_uri = redirectUri
            };

            return await PostTokenAsync($"{AuthApiUrl}/integration/oauth2/token", body);
        }

        private async Task<ServiceResult<ChytapayTokenResponseDto>> RefreshTokenAsync(string refreshToken)
        {
            var clientId = _configuration["Chytapay:ClientId"];
            var clientSecret = _configuration["Chytapay:ClientSecret"];

            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            {
                return ServiceResult<ChytapayTokenResponseDto>.Fail("Chytapay OAuth configuration missing");
            }

            var body = new
            {
                refresh_token = refreshToken,
                client_id = clientId,
                client_secret = clientSecret
            };

            return await PostTokenAsync($"{AuthApiUrl}/integration/oauth2/refresh", body);
        }

        private async Task<ServiceResult<ChytapayTokenResponseDto>> PostTokenAsync(string url, object body)
        {
            try
            {
                var json = JsonSerializer.Serialize(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Accept.Clear();
                _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                var response = await _httpClient.PostAsync(url, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Chytapay token call failed. Status: {Status}, Body: {Body}", (int)response.StatusCode, responseContent);
                    try
                    {
                        using var doc = JsonDocument.Parse(responseContent);
                        var root = doc.RootElement;
                        var err = root.TryGetProperty("error_description", out var ed) ? ed.GetString() :
                                  root.TryGetProperty("message", out var msg) ? msg.GetString() :
                                  root.TryGetProperty("error", out var e) ? e.GetString() : null;
                        return ServiceResult<ChytapayTokenResponseDto>.Fail(err ?? "Token call failed");
                    }
                    catch
                    {
                        return ServiceResult<ChytapayTokenResponseDto>.Fail("Token call failed");
                    }
                }

                using var okDoc = JsonDocument.Parse(responseContent);
                var okRoot = okDoc.RootElement;

                // Chytapay returns camelCase keys: idToken, refreshToken, expires_in, token_type
                string GetString(string prop) =>
                    okRoot.TryGetProperty(prop, out var v) ? v.GetString() ?? string.Empty : string.Empty;

                var result = new ChytapayTokenResponseDto
                {
                    IdToken = GetString("idToken"),
                    RefreshToken = GetString("refreshToken"),
                    TokenType = GetString("token_type"),
                    ExpiresIn = okRoot.TryGetProperty("expires_in", out var ei) && ei.TryGetInt32(out var sec) ? sec : 3600
                };

                if (string.IsNullOrEmpty(result.IdToken))
                {
                    return ServiceResult<ChytapayTokenResponseDto>.Fail("Chytapay response missing idToken");
                }

                return ServiceResult<ChytapayTokenResponseDto>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Chytapay token endpoint");
                return ServiceResult<ChytapayTokenResponseDto>.Fail("Error calling token endpoint");
            }
        }

        private async Task SaveOAuthConfigurationAsync(Guid tenantId, ChytapayTokenResponseDto tokenData)
        {
            var existing = await _context.Set<ChytapayOAuthConfiguration>()
                .Where(c => c.TenantId == tenantId && c.IsActive)
                .ToListAsync();

            foreach (var config in existing)
            {
                config.IsActive = false;
                config.DisconnectedAt = DateTime.UtcNow;
                config.UpdatedAt = DateTime.UtcNow;
            }

            var newConfig = new ChytapayOAuthConfiguration
            {
                TenantId = tenantId,
                IdToken = EncryptToken(tokenData.IdToken),
                RefreshToken = string.IsNullOrEmpty(tokenData.RefreshToken) ? null : EncryptToken(tokenData.RefreshToken),
                IdTokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn),
                IsActive = true,
                IsTestMode = _configuration["Chytapay:IsTestMode"] == "true"
            };

            _context.Set<ChytapayOAuthConfiguration>().Add(newConfig);
            await _context.SaveChangesAsync();
        }

        private async Task CleanupExpiredStatesAsync(Guid tenantId)
        {
            var expired = await _context.Set<ChytapayOAuthState>()
                .Where(s => s.TenantId == tenantId &&
                            (s.ExpiresAt < DateTime.UtcNow || s.IsCompleted))
                .ToListAsync();

            if (expired.Any())
            {
                _context.Set<ChytapayOAuthState>().RemoveRange(expired);
                await _context.SaveChangesAsync();
            }
        }

        private static string EncryptToken(string token)
        {
            // Minimal reversible encoding (Base64). Same pattern as MercadoPagoOAuthService.
            // For production-grade encryption at rest, replace with proper KMS / DataProtection.
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(token));
        }

        private static string DecryptToken(string encryptedToken)
        {
            var bytes = Convert.FromBase64String(encryptedToken);
            return Encoding.UTF8.GetString(bytes);
        }
    }
}
