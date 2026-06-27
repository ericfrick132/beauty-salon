using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Ejecutor del follow-up de OTP abandonado, implementando el CONTRATO unificado:
    ///   1. Baja la config central de SalesHub (GET /api/hub/followup-config) y la PERSISTE local
    ///      (followup_sequences_local) — pull-and-persist: sigue andando si SalesHub está caído.
    ///   2. Ejecuta los pasos de la secuencia del trigger (default "otp_abandoned") sobre los
    ///      PhoneVerification no consumidos, mandando por el MISMO Evolution que envió el código.
    ///      Si el body trae {code}, regenera un OTP válido y lo sustituye.
    ///   3. Reporta a SalesHub: triggered / step_sent / converted / gave_up (telemetría, por app).
    ///
    /// Gate local de rollout: OtpFollowup:Enabled (default false). El resto (tiempos, mensaje,
    /// canal) lo manda la config central. Para OTP el canal real es WhatsApp (no tenemos email).
    /// </summary>
    public class OtpFollowupBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<OtpFollowupBackgroundService> _logger;
        private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(1);
        private const string ProductName = "TurnosPro";

        public OtpFollowupBackgroundService(
            IServiceProvider serviceProvider,
            IHttpClientFactory httpClientFactory,
            ILogger<OtpFollowupBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        private sealed class StepDto
        {
            public int Order { get; set; }
            public int DelayMinutes { get; set; }
            public string Channel { get; set; } = "";
            public string? Subject { get; set; }
            public string Body { get; set; } = "";
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OtpFollowupBackgroundService started (tick={Sec}s)", TickInterval.TotalSeconds);
            try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); }
            catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try { await RunTickAsync(stoppingToken); }
                catch (Exception ex) { _logger.LogError(ex, "OtpFollowup tick failed"); }

                try { await Task.Delay(TickInterval, stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private async Task RunTickAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            if (!config.GetValue("OtpFollowup:Enabled", false)) return;

            var trigger = config["OtpFollowup:Trigger"] ?? "otp_abandoned";
            var minSpacing = config.GetValue("OtpFollowup:MinSpacingMinutes", 4);
            var excludeExisting = config.GetValue("OtpFollowup:ExcludeExistingUsers", true);

            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var hub = scope.ServiceProvider.GetRequiredService<ISalesHubHubClient>();

            // 1) SYNC: bajar config central y persistir local (pull-and-persist).
            await SyncConfigAsync(db, hub, trigger, ct);

            // 2) Cargar los pasos de la copia local.
            var local = await db.FollowupSequencesLocal.AsNoTracking().FirstOrDefaultAsync(x => x.Trigger == trigger, ct);
            var steps = ParseSteps(local?.StepsJson);

            // 3) Reportar desenlaces (converted / gave_up) y ejecutar pasos pendientes.
            await ReportOutcomesAsync(db, hub, trigger, steps.Count, ct);

            if (steps.Count == 0) { await db.SaveChangesAsync(ct); return; }

            var now = DateTime.UtcNow;
            var windowStart = now.AddMinutes(-(steps.Max(s => s.DelayMinutes) + 30));
            var candidates = await db.PhoneVerifications
                .Where(p => p.ConsumedAt == null && !p.FollowupDone
                         && p.CreatedAt >= windowStart && p.FollowupCount < steps.Count)
                .ToListAsync(ct);

            foreach (var v in candidates)
            {
                if (ct.IsCancellationRequested) break;
                var idx = v.FollowupCount;
                if (idx >= steps.Count) continue;
                var step = steps[idx];

                if ((now - v.CreatedAt).TotalMinutes < step.DelayMinutes) continue;
                if (v.LastFollowupAt != null && (now - v.LastFollowupAt.Value).TotalMinutes < minSpacing) continue;

                if (excludeExisting && await db.Users.IgnoreQueryFilters().AnyAsync(u => u.Phone == v.Phone, ct))
                {
                    v.FollowupDone = true; v.UpdatedAt = now; // no molestar logins de cuentas existentes
                    continue;
                }

                // Para OTP el canal real es WhatsApp (no tenemos email del que pidió el código).
                var channel = step.Channel.ToLowerInvariant();
                if (channel != "whatsapp" && channel != "both")
                {
                    // paso de otro canal no aplicable acá → lo damos por “enviado” para avanzar la secuencia.
                    v.FollowupCount++; v.LastFollowupAt = now; v.UpdatedAt = now;
                    continue;
                }

                var text = RenderBody(step.Body, v, now);
                var sent = await SendWhatsAppAsync(config, v.Phone, text, ct);
                if (!sent) continue;

                if (idx == 0)
                    await hub.ReportFollowupEventAsync(trigger, v.Phone, "triggered", -1, null, null, ct);
                await hub.ReportFollowupEventAsync(trigger, v.Phone, "step_sent", idx, "whatsapp", null, ct);

                v.FollowupCount++; v.LastFollowupAt = now; v.UpdatedAt = now;
            }

            await db.SaveChangesAsync(ct);
        }

        private async Task SyncConfigAsync(ApplicationDbContext db, ISalesHubHubClient hub, string trigger, CancellationToken ct)
        {
            var raw = await hub.GetFollowupConfigRawAsync(ct);
            if (raw == null) return; // sin red/config: nos quedamos con la copia local previa.
            try
            {
                string? stepsJson = null;
                using (var doc = JsonDocument.Parse(raw))
                {
                    if (doc.RootElement.TryGetProperty("sequences", out var seqs) && seqs.ValueKind == JsonValueKind.Array)
                        foreach (var s in seqs.EnumerateArray())
                            if (s.TryGetProperty("trigger", out var t) && t.GetString() == trigger)
                            {
                                if (s.TryGetProperty("steps", out var st)) stepsJson = st.GetRawText();
                                break;
                            }
                }

                var local = await db.FollowupSequencesLocal.FirstOrDefaultAsync(x => x.Trigger == trigger, ct);
                if (stepsJson != null)
                {
                    if (local == null) { local = new FollowupSequenceLocal { Trigger = trigger }; db.FollowupSequencesLocal.Add(local); }
                    local.StepsJson = stepsJson;
                    local.SyncedAt = DateTime.UtcNow;
                }
                else if (local != null)
                {
                    db.FollowupSequencesLocal.Remove(local); // desactivada/ausente central
                }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "OtpFollowup sync parse falló"); }
        }

        private async Task ReportOutcomesAsync(ApplicationDbContext db, ISalesHubHubClient hub, string trigger, int stepCount, CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            // Convirtieron (entraron) después de que los seguimos.
            var converted = await db.PhoneVerifications
                .Where(p => p.ConsumedAt != null && p.FollowupCount > 0 && !p.FollowupDone)
                .ToListAsync(ct);
            foreach (var v in converted)
            {
                await hub.ReportFollowupEventAsync(trigger, v.Phone, "converted", -1, null, null, ct);
                v.FollowupDone = true; v.UpdatedAt = now;
            }

            // Agotaron la secuencia sin entrar.
            if (stepCount > 0)
            {
                var gaveUp = await db.PhoneVerifications
                    .Where(p => p.ConsumedAt == null && !p.FollowupDone && p.FollowupCount >= stepCount)
                    .ToListAsync(ct);
                foreach (var v in gaveUp)
                {
                    await hub.ReportFollowupEventAsync(trigger, v.Phone, "gave_up", -1, null, null, ct);
                    v.FollowupDone = true; v.UpdatedAt = now;
                }
            }
        }

        /// <summary>Renderiza el body. Si trae {code}, regenera un OTP válido y lo sustituye.</summary>
        private static string RenderBody(string body, PhoneVerification v, DateTime now)
        {
            if (string.IsNullOrWhiteSpace(body))
                body = $"*{ProductName}* — ¿pudiste entrar? Si necesitás una mano, respondé este mensaje 🙌";

            if (body.Contains("{code}"))
            {
                var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
                v.CodeHash = Services.Security.PasswordHasher.Hash(code);
                v.ExpiresAt = now.AddMinutes(10);
                v.Attempts = 0;
                v.SendCount += 1;
                body = body.Replace("{code}", code);
            }
            return body;
        }

        private async Task<bool> SendWhatsAppAsync(IConfiguration config, string phone, string text, CancellationToken ct)
        {
            var url = config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
            var key = config["EVOLUTION_API_KEY"];
            var instance = config["EVOLUTION_API_INSTANCE"];
            if (string.IsNullOrEmpty(key) || string.IsNullOrEmpty(instance))
            {
                _logger.LogWarning("Evolution no configurado — no se puede mandar follow-up a {Phone}", phone);
                return false;
            }
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", key);
                var payload = JsonSerializer.Serialize(new { number = phone, text });
                var content = new StringContent(payload, Encoding.UTF8, "application/json");
                var resp = await client.PostAsync($"{url.TrimEnd('/')}/message/sendText/{instance}", content, ct);
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("OTP follow-up send {Status} para {Phone}", resp.StatusCode, phone);
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Excepción mandando OTP follow-up a {Phone}", phone);
                return false;
            }
        }

        private static List<StepDto> ParseSteps(string? json)
        {
            if (string.IsNullOrWhiteSpace(json) || !json.TrimStart().StartsWith('[')) return new();
            try
            {
                var steps = JsonSerializer.Deserialize<List<StepDto>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                return steps.OrderBy(s => s.Order).ToList();
            }
            catch { return new(); }
        }
    }
}
