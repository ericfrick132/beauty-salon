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
    public class MercadoPagoOAuthService : IMercadoPagoOAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MercadoPagoOAuthService> _logger;
        private readonly IConfiguration _configuration;
        private readonly ITenantProvider _tenantProvider;
        private readonly HttpClient _httpClient;

        // OAuth endpoints
        // Use global auth host per official docs
        private const string AUTH_URL = "https://auth.mercadopago.com/authorization";
        private const string TOKEN_URL = "https://api.mercadopago.com/oauth/token";
        private const string USER_INFO_URL = "https://api.mercadopago.com/users/me";
        
        public MercadoPagoOAuthService(
            ApplicationDbContext context,
            ILogger<MercadoPagoOAuthService> logger,
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

        public async Task<ServiceResult<MercadoPagoOAuthUrlDto>> InitiateOAuthFlowAsync(InitiateMercadoPagoOAuthDto dto)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<MercadoPagoOAuthUrlDto>.Fail("Tenant not found");
                }

                // Get OAuth configuration
                var clientId = _configuration["MercadoPago:ClientId"];
                var redirectUri = _configuration["MercadoPago:RedirectUri"];

                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(redirectUri))
                {
                    return ServiceResult<MercadoPagoOAuthUrlDto>.Fail("OAuth not configured");
                }

                // Generate secure state parameter
                var state = GenerateStateParameter(tenantId);
                
                // Clean up old expired states
                await CleanupExpiredStatesAsync(tenantId);

                // Generate PKCE (code_verifier/challenge)
                var pkce = GeneratePkce();

                // Save OAuth state including PKCE
                var oauthState = new MercadoPagoOAuthState
                {
                    TenantId = tenantId,
                    State = state,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                    CodeVerifier = pkce.CodeVerifier,
                    CodeChallenge = pkce.CodeChallenge,
                    CodeChallengeMethod = pkce.CodeChallengeMethod
                };

                _context.Set<MercadoPagoOAuthState>().Add(oauthState);
                await _context.SaveChangesAsync();

                // Build authorization URL (with PKCE)
                var authUrl = BuildAuthorizationUrl(clientId, redirectUri, state, pkce.CodeChallenge, pkce.CodeChallengeMethod);
                oauthState.AuthorizationUrl = authUrl;
                await _context.SaveChangesAsync();

                _logger.LogInformation("OAuth flow initiated for tenant {TenantId}", tenantId);

                return ServiceResult<MercadoPagoOAuthUrlDto>.Ok(new MercadoPagoOAuthUrlDto
                {
                    AuthorizationUrl = authUrl,
                    State = state,
                    ExpiresAt = oauthState.ExpiresAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating OAuth flow");
                return ServiceResult<MercadoPagoOAuthUrlDto>.Fail("Error initiating OAuth");
            }
        }

        public async Task<ServiceResult<bool>> ProcessOAuthCallbackAsync(MercadoPagoOAuthCallbackDto dto)
        {
            try
            {
                // Validate state and get tenant
                var stateResult = await ValidateOAuthStateAsync(dto.State);
                if (!stateResult.Success || stateResult.Data == Guid.Empty)
                {
                    return ServiceResult<bool>.Fail("Invalid OAuth state");
                }

                var tenantId = stateResult.Data;

                // Get OAuth state record
                var oauthState = await _context.Set<MercadoPagoOAuthState>()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.State == dto.State && s.TenantId == tenantId);

                if (oauthState == null || oauthState.IsExpired || oauthState.ExpiresAt < DateTime.UtcNow)
                {
                    return ServiceResult<bool>.Fail("OAuth state expired");
                }

                // Handle OAuth error response
                if (!string.IsNullOrEmpty(dto.Error))
                {
                    oauthState.ErrorCode = dto.Error;
                    oauthState.ErrorDescription = dto.ErrorDescription;
                    oauthState.IsCompleted = true;
                    await _context.SaveChangesAsync();

                    _logger.LogWarning("OAuth error for tenant {TenantId}: {Error} - {Description}", 
                        tenantId, dto.Error, dto.ErrorDescription);
                    return ServiceResult<bool>.Fail($"OAuth error: {dto.Error}");
                }

                // Ensure PKCE verifier exists if PKCE is enabled on the app
                if (string.IsNullOrWhiteSpace(oauthState.CodeVerifier))
                {
                    _logger.LogWarning("OAuth state missing code_verifier for tenant {TenantId}. User must restart OAuth flow.", tenantId);
                    return ServiceResult<bool>.Fail("Missing PKCE verifier. Please restart the Mercado Pago connection.");
                }

                // Exchange code for tokens (include PKCE code_verifier)
                var tokenResult = await ExchangeCodeForTokenAsync(dto.Code, oauthState.CodeVerifier);
                if (!tokenResult.Success || tokenResult.Data == null)
                {
                    // Persist error details in state for audit/debugging
                    oauthState.ErrorCode = "token_exchange_failed";
                    oauthState.ErrorDescription = tokenResult.Message;
                    oauthState.IsCompleted = true;
                    oauthState.CompletedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    // Surface MercadoPago's error message if available
                    var reason = string.IsNullOrWhiteSpace(tokenResult.Message)
                        ? "Failed to exchange code for token"
                        : $"Failed to exchange code for token: {tokenResult.Message}";
                    return ServiceResult<bool>.Fail(reason);
                }

                // Get user info
                var userInfoResult = await GetUserInfoAsync(tokenResult.Data.AccessToken);
                if (!userInfoResult.Success || userInfoResult.Data == null)
                {
                    return ServiceResult<bool>.Fail("Failed to get user info");
                }

                // Save/update OAuth configuration
                await SaveOAuthConfigurationAsync(tenantId, tokenResult.Data, userInfoResult.Data);

                // Mark state as completed
                oauthState.AuthorizationCode = dto.Code;
                oauthState.IsCompleted = true;
                oauthState.CompletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("OAuth flow completed successfully for tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Ok(true, "MercadoPago connected successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing OAuth callback");
                return ServiceResult<bool>.Fail("Error processing OAuth callback");
            }
        }

        public async Task<ServiceResult<MercadoPagoConnectionStatusDto>> GetConnectionStatusAsync()
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<MercadoPagoConnectionStatusDto>.Fail("Tenant not found");
                }

                var config = await _context.Set<MercadoPagoOAuthConfiguration>()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (config == null)
                {
                    return ServiceResult<MercadoPagoConnectionStatusDto>.Ok(new MercadoPagoConnectionStatusDto
                    {
                        IsConnected = false
                    });
                }

                var needsRefresh = config.AccessTokenExpiresAt <= DateTime.UtcNow.AddDays(7);
                
                return ServiceResult<MercadoPagoConnectionStatusDto>.Ok(new MercadoPagoConnectionStatusDto
                {
                    IsConnected = true,
                    AccountEmail = config.AccountEmail,
                    AccountNickname = config.AccountNickname,
                    CountryId = config.CountryId,
                    CurrencyId = config.CurrencyId,
                    ConnectedAt = config.ConnectedAt,
                    AccessTokenExpiresAt = config.AccessTokenExpiresAt,
                    NeedsRefresh = needsRefresh,
                    IsTestMode = config.IsTestMode,
                    LastError = config.LastRefreshError
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting connection status");
                return ServiceResult<MercadoPagoConnectionStatusDto>.Fail("Error getting status");
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

                var config = await _context.Set<MercadoPagoOAuthConfiguration>()
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

                // Update configuration with new tokens
                config.AccessToken = EncryptToken(tokenResult.Data.AccessToken);
                config.AccessTokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResult.Data.ExpiresIn);
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

                _logger.LogInformation("Access token refreshed successfully for tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing access token");
                return ServiceResult<bool>.Fail("Error refreshing token");
            }
        }

        public async Task<ServiceResult<bool>> DisconnectOAuthAsync(DisconnectMercadoPagoDto dto)
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

                var config = await _context.Set<MercadoPagoOAuthConfiguration>()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (config != null)
                {
                    config.IsActive = false;
                    config.DisconnectedAt = DateTime.UtcNow;
                    config.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                // Clean up OAuth states
                var states = await _context.Set<MercadoPagoOAuthState>()
                    .Where(s => s.TenantId == tenantId)
                    .ToListAsync();

                _context.Set<MercadoPagoOAuthState>().RemoveRange(states);
                await _context.SaveChangesAsync();

                _logger.LogInformation("OAuth disconnected for tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Ok(true, "MercadoPago disconnected successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting OAuth");
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

                var config = await _context.Set<MercadoPagoOAuthConfiguration>()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (config == null)
                {
                    return ServiceResult<string>.Fail("MercadoPago not connected");
                }

                // Check if token needs refresh (expires in less than 1 hour)
                if (config.AccessTokenExpiresAt <= DateTime.UtcNow.AddHours(1))
                {
                    var refreshResult = await RefreshAccessTokenAsync(tenantId);
                    if (!refreshResult.Success)
                    {
                        return ServiceResult<string>.Fail("Failed to refresh token");
                    }
                    
                    // Reload config after refresh
                    config = await _context.Set<MercadoPagoOAuthConfiguration>()
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);
                }

                if (config == null)
                {
                    return ServiceResult<string>.Fail("Configuration not found after refresh");
                }

                // Update last used timestamp
                config.LastUsedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var accessToken = DecryptToken(config.AccessToken);
                return ServiceResult<string>.Ok(accessToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting valid access token");
                return ServiceResult<string>.Fail("Error getting access token");
            }
        }

        public async Task<ServiceResult<bool>> ConfigurePlatformOAuthAsync(PlatformOAuthConfigDto dto)
        {
            try
            {
                // This would be called by super admin to configure OAuth settings
                _configuration["MercadoPago:ClientId"] = dto.ClientId;
                _configuration["MercadoPago:ClientSecret"] = dto.ClientSecret;
                _configuration["MercadoPago:RedirectUri"] = dto.RedirectUri;
                _configuration["MercadoPago:IsTestMode"] = dto.IsTestMode.ToString();

                _logger.LogInformation("Platform OAuth configuration updated");
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error configuring platform OAuth");
                return ServiceResult<bool>.Fail("Error configuring OAuth");
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

                // State format: tenant_{tenantId}_{randomString}
                var parts = state.Split('_');
                if (parts.Length != 3 || parts[0] != "tenant")
                {
                    return ServiceResult<Guid>.Fail("Invalid state format");
                }

                if (!Guid.TryParse(parts[1], out var tenantId))
                {
                    return ServiceResult<Guid>.Fail("Invalid tenant ID in state");
                }

                var oauthState = await _context.Set<MercadoPagoOAuthState>()
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
                _logger.LogError(ex, "Error validating OAuth state");
                return ServiceResult<Guid>.Fail("Error validating state");
            }
        }

        public async Task<ServiceResult<int>> RefreshExpiringTokensAsync()
        {
            try
            {
                var expiringConfigs = await _context.Set<MercadoPagoOAuthConfiguration>()
                    .Where(c => c.IsActive && 
                               c.AccessTokenExpiresAt <= DateTime.UtcNow.AddDays(7) &&
                               !string.IsNullOrEmpty(c.RefreshToken))
                    .ToListAsync();

                var refreshedCount = 0;

                foreach (var config in expiringConfigs)
                {
                    var result = await RefreshAccessTokenAsync(config.TenantId);
                    if (result.Success)
                    {
                        refreshedCount++;
                    }
                }

                _logger.LogInformation("Refreshed {Count} expiring tokens", refreshedCount);
                return ServiceResult<int>.Ok(refreshedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing expiring tokens");
                return ServiceResult<int>.Fail("Error refreshing tokens");
            }
        }

        public async Task<ServiceResult<MercadoPagoUserInfoDto>> GetAccountInfoAsync()
        {
            try
            {
                var tokenResult = await GetValidAccessTokenAsync();
                if (!tokenResult.Success)
                {
                    return ServiceResult<MercadoPagoUserInfoDto>.Fail(tokenResult.Message);
                }

                var userInfoResult = await GetUserInfoAsync(tokenResult.Data!);
                return userInfoResult;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account info");
                return ServiceResult<MercadoPagoUserInfoDto>.Fail("Error getting account info");
            }
        }

        public async Task<ServiceResult<bool>> TestConnectionAsync()
        {
            try
            {
                var accountResult = await GetAccountInfoAsync();
                return ServiceResult<bool>.Ok(accountResult.Success, accountResult.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing connection");
                return ServiceResult<bool>.Fail("Error testing connection");
            }
        }

        #region Private Methods

        private string GenerateStateParameter(Guid tenantId)
        {
            var randomBytes = new byte[16];
            RandomNumberGenerator.Fill(randomBytes);
            var randomString = Convert.ToBase64String(randomBytes).Replace("+", "").Replace("/", "").Replace("=", "")[..10];
            return $"tenant_{tenantId}_{randomString}";
        }

        private (string CodeVerifier, string CodeChallenge, string CodeChallengeMethod) GeneratePkce()
        {
            // Generate code_verifier (43-128 chars) and S256 code_challenge
            var bytes = new byte[64];
            RandomNumberGenerator.Fill(bytes);
            var verifier = Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
            if (verifier.Length < 43) verifier = verifier.PadRight(43, '0');
            if (verifier.Length > 128) verifier = verifier[..128];

            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.ASCII.GetBytes(verifier));
            var challenge = Convert.ToBase64String(hash)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");

            return (verifier, challenge, "S256");
        }

        private string BuildAuthorizationUrl(string clientId, string redirectUri, string state, string codeChallenge, string codeChallengeMethod)
        {
            var queryParams = new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["response_type"] = "code",
                ["platform_id"] = "mp",
                ["redirect_uri"] = redirectUri,
                ["state"] = state,
                ["code_challenge"] = codeChallenge,
                ["code_challenge_method"] = codeChallengeMethod
            };

            var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
            return $"{AUTH_URL}?{queryString}";
        }

        private async Task<ServiceResult<MercadoPagoTokenResponseDto>> ExchangeCodeForTokenAsync(string code, string? codeVerifier)
        {
            try
            {
                var clientId = _configuration["MercadoPago:ClientId"];
                var clientSecret = _configuration["MercadoPago:ClientSecret"];
                var redirectUri = _configuration["MercadoPago:RedirectUri"];

                if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret) || string.IsNullOrWhiteSpace(redirectUri))
                {
                    _logger.LogError("Missing OAuth config. ClientId set: {HasId}, ClientSecret set: {HasSecret}, RedirectUri: {RedirectUri}",
                        !string.IsNullOrWhiteSpace(clientId), !string.IsNullOrWhiteSpace(clientSecret), redirectUri);
                    return ServiceResult<MercadoPagoTokenResponseDto>.Fail("OAuth configuration missing");
                }

                // MercadoPago expects x-www-form-urlencoded
                var form = new List<KeyValuePair<string, string>>
                {
                    new("client_id", clientId ?? string.Empty),
                    new("client_secret", clientSecret ?? string.Empty),
                    new("grant_type", "authorization_code"),
                    new("code", code),
                    new("redirect_uri", redirectUri ?? string.Empty),
                };
                if (!string.IsNullOrWhiteSpace(codeVerifier))
                {
                    form.Add(new("code_verifier", codeVerifier!));
                }
                var content = new FormUrlEncodedContent(form);

                _httpClient.DefaultRequestHeaders.Accept.Clear();
                _httpClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                var response = await _httpClient.PostAsync(TOKEN_URL, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Token exchange failed. Status: {Status}, Body: {Body}", (int)response.StatusCode, responseContent);
                    // Try to surface MP error
                    try
                    {
                        using var doc = JsonDocument.Parse(responseContent);
                        var root = doc.RootElement;
                        var err = root.TryGetProperty("error_description", out var ed) ? ed.GetString() :
                                  root.TryGetProperty("message", out var msg) ? msg.GetString() :
                                  root.TryGetProperty("error", out var e) ? e.GetString() : null;
                        return ServiceResult<MercadoPagoTokenResponseDto>.Fail(err ?? "Token exchange failed");
                    }
                    catch
                    {
                        return ServiceResult<MercadoPagoTokenResponseDto>.Fail("Token exchange failed");
                    }
                }

                var tokenResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                var result = new MercadoPagoTokenResponseDto
                {
                    AccessToken = tokenResponse.GetProperty("access_token").GetString() ?? "",
                    RefreshToken = tokenResponse.GetProperty("refresh_token").GetString() ?? "",
                    ExpiresIn = tokenResponse.GetProperty("expires_in").GetInt32(),
                    TokenType = tokenResponse.GetProperty("token_type").GetString() ?? "",
                    Scope = tokenResponse.GetProperty("scope").GetString() ?? "",
                    UserId = tokenResponse.GetProperty("user_id").GetString() ?? ""
                };

                return ServiceResult<MercadoPagoTokenResponseDto>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging code for token");
                return ServiceResult<MercadoPagoTokenResponseDto>.Fail("Error exchanging code");
            }
        }

        private async Task<ServiceResult<MercadoPagoTokenResponseDto>> RefreshTokenAsync(string refreshToken)
        {
            try
            {
                var clientId = _configuration["MercadoPago:ClientId"];
                var clientSecret = _configuration["MercadoPago:ClientSecret"];

                var form = new List<KeyValuePair<string, string>>
                {
                    new("grant_type", "refresh_token"),
                    new("client_id", clientId ?? string.Empty),
                    new("client_secret", clientSecret ?? string.Empty),
                    new("refresh_token", refreshToken),
                };
                var content = new FormUrlEncodedContent(form);

                _httpClient.DefaultRequestHeaders.Accept.Clear();
                _httpClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                var response = await _httpClient.PostAsync(TOKEN_URL, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Token refresh failed. Status: {Status}, Body: {Body}", (int)response.StatusCode, responseContent);
                    try
                    {
                        using var doc = JsonDocument.Parse(responseContent);
                        var root = doc.RootElement;
                        var err = root.TryGetProperty("error_description", out var ed) ? ed.GetString() :
                                  root.TryGetProperty("message", out var msg) ? msg.GetString() :
                                  root.TryGetProperty("error", out var e) ? e.GetString() : null;
                        return ServiceResult<MercadoPagoTokenResponseDto>.Fail(err ?? "Token refresh failed");
                    }
                    catch
                    {
                        return ServiceResult<MercadoPagoTokenResponseDto>.Fail("Token refresh failed");
                    }
                }

                var tokenResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                var result = new MercadoPagoTokenResponseDto
                {
                    AccessToken = tokenResponse.GetProperty("access_token").GetString() ?? "",
                    RefreshToken = tokenResponse.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "",
                    ExpiresIn = tokenResponse.GetProperty("expires_in").GetInt32(),
                    TokenType = tokenResponse.GetProperty("token_type").GetString() ?? "",
                    Scope = tokenResponse.TryGetProperty("scope", out var scope) ? scope.GetString() ?? "" : "",
                    UserId = tokenResponse.TryGetProperty("user_id", out var userId) ? userId.GetString() ?? "" : ""
                };

                return ServiceResult<MercadoPagoTokenResponseDto>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing token");
                return ServiceResult<MercadoPagoTokenResponseDto>.Fail("Error refreshing token");
            }
        }

        private async Task<ServiceResult<MercadoPagoUserInfoDto>> GetUserInfoAsync(string accessToken)
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.GetAsync(USER_INFO_URL);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Get user info failed: {Response}", responseContent);
                    return ServiceResult<MercadoPagoUserInfoDto>.Fail("Failed to get user info");
                }

                var userInfo = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                var result = new MercadoPagoUserInfoDto
                {
                    Id = userInfo.GetProperty("id").GetString() ?? "",
                    Nickname = userInfo.GetProperty("nickname").GetString() ?? "",
                    Email = userInfo.GetProperty("email").GetString() ?? "",
                    CountryId = userInfo.GetProperty("country_id").GetString() ?? "",
                    CurrencyId = userInfo.TryGetProperty("currency_id", out var curr) ? curr.GetString() ?? "" : "",
                    SiteStatus = userInfo.TryGetProperty("site_status", out var status) ? status.GetString() == "active" : true
                };

                return ServiceResult<MercadoPagoUserInfoDto>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user info");
                return ServiceResult<MercadoPagoUserInfoDto>.Fail("Error getting user info");
            }
        }

        private async Task SaveOAuthConfigurationAsync(Guid tenantId, MercadoPagoTokenResponseDto tokenData, MercadoPagoUserInfoDto userInfo)
        {
            // Deactivate existing configurations
            var existingConfigs = await _context.Set<MercadoPagoOAuthConfiguration>()
                .Where(c => c.TenantId == tenantId && c.IsActive)
                .ToListAsync();

            foreach (var config in existingConfigs)
            {
                config.IsActive = false;
                config.DisconnectedAt = DateTime.UtcNow;
                config.UpdatedAt = DateTime.UtcNow;
            }

            // Create new configuration
            var newConfig = new MercadoPagoOAuthConfiguration
            {
                TenantId = tenantId,
                MercadoPagoUserId = tokenData.UserId,
                AccessToken = EncryptToken(tokenData.AccessToken),
                RefreshToken = EncryptToken(tokenData.RefreshToken),
                AccessTokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn),
                AccountEmail = userInfo.Email,
                AccountNickname = userInfo.Nickname,
                CountryId = userInfo.CountryId,
                CurrencyId = userInfo.CurrencyId,
                IsActive = true,
                IsTestMode = _configuration["MercadoPago:IsTestMode"] == "true"
            };

            _context.Set<MercadoPagoOAuthConfiguration>().Add(newConfig);
            await _context.SaveChangesAsync();
        }

        private async Task CleanupExpiredStatesAsync(Guid tenantId)
        {
            var expiredStates = await _context.Set<MercadoPagoOAuthState>()
                .Where(s => s.TenantId == tenantId && 
                           (s.ExpiresAt < DateTime.UtcNow || s.IsCompleted))
                .ToListAsync();

            if (expiredStates.Any())
            {
                _context.Set<MercadoPagoOAuthState>().RemoveRange(expiredStates);
                await _context.SaveChangesAsync();
            }
        }

        private string EncryptToken(string token)
        {
            // Minimal reversible encoding (Base64). For production, replace with proper encryption at rest.
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(token));
        }

        private string DecryptToken(string encryptedToken)
        {
            var bytes = Convert.FromBase64String(encryptedToken);
            return Encoding.UTF8.GetString(bytes);
        }

        #endregion
    }
}
