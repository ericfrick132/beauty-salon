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

            var clientId = _configuration["Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
            {
                _logger.LogError("Google:ClientId not configured in appsettings");
                return null;
            }

            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { clientId }
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
    }
}
