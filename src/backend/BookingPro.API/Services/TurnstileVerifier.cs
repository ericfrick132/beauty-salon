using System.Text.Json;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Valida tokens de Cloudflare Turnstile (widget "efcloud-logins", modo Managed) contra siteverify.
    /// Config: <c>Turnstile:SecretKey</c> (env <c>Turnstile__SecretKey</c>). Sin secret no se exige nada
    /// (kill-switch). <c>Turnstile:Enforce=false</c> solo registra en el log lo que habría bloqueado.
    /// </summary>
    public interface ITurnstileVerifier
    {
        bool Configured { get; }
        bool Enforce { get; }
        Task<bool> VerifyAsync(string token, string? remoteIp, CancellationToken ct);
    }

    public class TurnstileVerifier : ITurnstileVerifier
    {
        private const string SiteVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
        private readonly HttpClient _http;
        private readonly ILogger<TurnstileVerifier> _log;
        private readonly string? _secret;

        public TurnstileVerifier(HttpClient http, IConfiguration config, ILogger<TurnstileVerifier> log)
        {
            _http = http;
            _log = log;
            _secret = config["Turnstile:SecretKey"];
            Enforce = config.GetValue("Turnstile:Enforce", true);
        }

        public bool Configured => !string.IsNullOrWhiteSpace(_secret);
        public bool Enforce { get; }

        public async Task<bool> VerifyAsync(string token, string? remoteIp, CancellationToken ct)
        {
            var form = new Dictionary<string, string> { ["secret"] = _secret!, ["response"] = token };
            if (!string.IsNullOrWhiteSpace(remoteIp)) form["remoteip"] = remoteIp;
            try
            {
                using var resp = await _http.PostAsync(SiteVerifyUrl, new FormUrlEncodedContent(form), ct);
                using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
                var ok = doc.RootElement.TryGetProperty("success", out var s) && s.GetBoolean();
                if (!ok)
                    _log.LogWarning("Turnstile rechazó el token: {Errors}",
                        doc.RootElement.TryGetProperty("error-codes", out var e) ? e.ToString() : "?");
                return ok;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Si Cloudflare no responde no dejamos a nadie afuera del login.
                _log.LogError(ex, "Turnstile siteverify falló; se deja pasar");
                return true;
            }
        }
    }
}
