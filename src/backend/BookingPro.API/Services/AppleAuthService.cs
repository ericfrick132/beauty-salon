using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;

namespace BookingPro.API.Services
{
    public interface IAppleAuthService
    {
        Task<AppleUserInfo?> VerifyIdentityTokenAsync(string identityToken);
    }

    public class AppleUserInfo
    {
        /// <summary>`sub` de Apple: id estable del usuario para ESTE equipo de desarrollo.</summary>
        public string Subject { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool EmailVerified { get; set; }
        /// <summary>true si el usuario eligió "Ocultar mi correo" (@privaterelay.appleid.com).</summary>
        public bool IsPrivateEmail { get; set; }
    }

    /// <summary>
    /// Verifica el identity token (JWT) que devuelve Sign in with Apple en el cliente nativo.
    /// Receta oficial (https://developer.apple.com/documentation/signinwithapple/...):
    /// firma contra el JWKS público de Apple, `iss` = https://appleid.apple.com,
    /// `aud` = bundle id de la app y `exp` vigente.
    ///
    /// Apple SOLO manda nombre/apellido en el primer login y fuera del token, así que el
    /// nombre viaja aparte en el DTO; acá únicamente salen `sub` y `email`.
    /// </summary>
    public class AppleAuthService : IAppleAuthService
    {
        private const string Issuer = "https://appleid.apple.com";
        private const string KeysUrl = "https://appleid.apple.com/auth/keys";

        // El JWKS de Apple rota, pero no seguido: cachearlo evita un round-trip por login.
        private static readonly SemaphoreSlim KeysLock = new(1, 1);
        private static IList<SecurityKey>? _keys;
        private static DateTime _keysFetchedAtUtc = DateTime.MinValue;
        private static readonly TimeSpan KeysTtl = TimeSpan.FromHours(6);

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AppleAuthService> _logger;

        public AppleAuthService(IHttpClientFactory httpClientFactory, IConfiguration configuration,
                                ILogger<AppleAuthService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<AppleUserInfo?> VerifyIdentityTokenAsync(string identityToken)
        {
            if (string.IsNullOrWhiteSpace(identityToken)) return null;

            var audiences = Audiences();
            if (audiences.Count == 0)
            {
                _logger.LogError("Apple:BundleIds no está configurado — no se puede validar el identity token");
                return null;
            }

            try
            {
                var keys = await GetSigningKeysAsync(forceRefresh: false);
                var handler = new JwtSecurityTokenHandler();

                var parameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = Issuer,
                    ValidateAudience = true,
                    ValidAudiences = audiences,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(2),
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = keys
                };

                JwtSecurityToken jwt;
                try
                {
                    handler.ValidateToken(identityToken, parameters, out var validated);
                    jwt = (JwtSecurityToken)validated;
                }
                catch (SecurityTokenSignatureKeyNotFoundException)
                {
                    // Apple rotó las claves: refrescar el cache una sola vez y reintentar.
                    parameters.IssuerSigningKeys = await GetSigningKeysAsync(forceRefresh: true);
                    handler.ValidateToken(identityToken, parameters, out var validated);
                    jwt = (JwtSecurityToken)validated;
                }

                var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
                if (string.IsNullOrWhiteSpace(sub)) return null;

                return new AppleUserInfo
                {
                    Subject = sub,
                    Email = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value ?? string.Empty,
                    EmailVerified = IsTrue(jwt.Claims.FirstOrDefault(c => c.Type == "email_verified")?.Value),
                    IsPrivateEmail = IsTrue(jwt.Claims.FirstOrDefault(c => c.Type == "is_private_email")?.Value)
                };
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Identity token de Apple inválido");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verificando el identity token de Apple");
                return null;
            }
        }

        /// <summary>Bundle ids aceptados como `aud`: iOS y, si existiera, el Service ID de la web.</summary>
        private List<string> Audiences()
        {
            var raw = _configuration["Apple:BundleIds"] ?? _configuration["Apple:BundleId"] ?? string.Empty;
            return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                      .Where(a => !a.StartsWith("TU_") && !a.StartsWith("YOUR_"))
                      .Distinct()
                      .ToList();
        }

        private static bool IsTrue(string? value) =>
            string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);

        private async Task<IList<SecurityKey>> GetSigningKeysAsync(bool forceRefresh)
        {
            if (!forceRefresh && _keys != null && DateTime.UtcNow - _keysFetchedAtUtc < KeysTtl)
                return _keys;

            await KeysLock.WaitAsync();
            try
            {
                if (!forceRefresh && _keys != null && DateTime.UtcNow - _keysFetchedAtUtc < KeysTtl)
                    return _keys;

                var http = _httpClientFactory.CreateClient();
                http.Timeout = TimeSpan.FromSeconds(15);
                var json = await http.GetStringAsync(KeysUrl);

                // JsonWebKeySet.Create devuelve las claves ya tipadas (RSA) listas para validar.
                var jwks = new JsonWebKeySet(json);
                _keys = jwks.GetSigningKeys();
                _keysFetchedAtUtc = DateTime.UtcNow;
                return _keys;
            }
            finally
            {
                KeysLock.Release();
            }
        }
    }
}
