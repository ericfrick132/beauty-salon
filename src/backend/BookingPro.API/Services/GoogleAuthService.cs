using Google.Apis.Auth;

namespace BookingPro.API.Services
{
    public interface IGoogleAuthService
    {
        Task<GoogleUserInfo?> VerifyIdTokenAsync(string idToken);
    }

    public class GoogleUserInfo
    {
        public string Email { get; set; } = string.Empty;
        public string GivenName { get; set; } = string.Empty;
        public string FamilyName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Picture { get; set; }
        public bool EmailVerified { get; set; }
    }

    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<GoogleAuthService> _logger;

        public GoogleAuthService(IConfiguration configuration, ILogger<GoogleAuthService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<GoogleUserInfo?> VerifyIdTokenAsync(string idToken)
        {
            if (string.IsNullOrWhiteSpace(idToken)) return null;

            // Un ID token trae como `aud` el client id de la plataforma que lo emitió:
            // web (GSI), iOS (cliente OAuth de la app) o Android. Aceptamos los tres,
            // si no el login nativo de las apps rebota con "Token de Google inválido".
            var audiences = GoogleAudiences(_configuration);
            if (audiences.Count == 0)
            {
                _logger.LogError("Google:ClientId not configured in appsettings");
                return null;
            }

            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = audiences
                };
                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

                return new GoogleUserInfo
                {
                    Email = payload.Email ?? string.Empty,
                    GivenName = payload.GivenName ?? string.Empty,
                    FamilyName = payload.FamilyName ?? string.Empty,
                    Name = payload.Name ?? string.Empty,
                    Picture = payload.Picture,
                    EmailVerified = payload.EmailVerified
                };
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogWarning(ex, "Invalid Google ID token");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying Google ID token");
                return null;
            }
        }

        /// <summary>
        /// Client ids aceptados como audiencia: web + iOS + Android.
        /// `Google:ClientIds` (coma-separado) permite sumar más sin tocar código.
        /// </summary>
        internal static List<string> GoogleAudiences(IConfiguration configuration)
        {
            var values = new List<string?>
            {
                configuration["Google:ClientId"],
                configuration["Google:IosClientId"],
                configuration["Google:AndroidClientId"]
            };

            var extra = configuration["Google:ClientIds"];
            if (!string.IsNullOrWhiteSpace(extra))
                values.AddRange(extra.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

            return values
                .Where(v => !string.IsNullOrWhiteSpace(v)
                            && !v!.StartsWith("YOUR_") && !v.StartsWith("TU_") && !v.StartsWith("<"))
                .Select(v => v!.Trim())
                .Distinct()
                .ToList();
        }

    }
}
