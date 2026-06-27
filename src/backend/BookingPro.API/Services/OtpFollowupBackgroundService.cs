using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Ejecutor del follow-up de OTP abandonado (contrato unificado SalesHub):
    ///   1. Baja la config central (GET /api/hub/followup-config) y la PERSISTE local (pull-and-persist).
    ///   2. Ejecuta los pasos sobre los PhoneVerification no consumidos, por el MISMO Evolution del OTP.
    ///   3. Reporta a SalesHub: triggered / step_sent / converted / gave_up.
    ///
    /// Envío HUMANIZADO con un "gauge" por línea (el número que manda): de a uno, con hueco
    /// aleatorio entre envíos, tope por hora y sólo en horario activo. Vale para el flujo en vivo
    /// Y para el backlog de viejos (drena despacio).
    ///
    /// Backlog: si OtpFollowup:BacklogMaxAgeDays &gt; 0, incluye abandonos más viejos que la ventana
    /// normal y les manda UN toque suave (OtpFollowup:BacklogMessage), no el blast de 3 pasos.
    ///
    /// Gate local de rollout: OtpFollowup:Enabled (default false).
    /// </summary>
    public class OtpFollowupBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<OtpFollowupBackgroundService> _logger;
        private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(1);
        private const string ProductName = "TurnosPro";

        // --- Gauge humanizado por línea (en memoria; una línea OTP por proceso) ---
        private static readonly object GaugeLock = new();
        private static DateTime _nextAllowedAt = DateTime.MinValue;
        private static readonly Queue<DateTime> _recentSends = new();

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
            var backlogMaxAgeDays = config.GetValue("OtpFollowup:BacklogMaxAgeDays", 0);

            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var hub = scope.ServiceProvider.GetRequiredService<ISalesHubHubClient>();

            await SyncConfigAsync(db, hub, trigger, ct);

            var local = await db.FollowupSequencesLocal.AsNoTracking().FirstOrDefaultAsync(x => x.Trigger == trigger, ct);
            var steps = ParseSteps(local?.StepsJson);

            await ReportOutcomesAsync(db, hub, trigger, steps.Count, ct);
            if (steps.Count == 0) { await db.SaveChangesAsync(ct); return; }

            // El gauge manda como mucho UNO por tick — si no es momento, ni buscamos candidatos.
            if (!GaugeReady(config)) return;

            var now = DateTime.UtcNow;
            var liveWindowStart = now.AddMinutes(-(steps.Max(s => s.DelayMinutes) + 30));
            var backlogWindowStart = backlogMaxAgeDays > 0 ? now.AddDays(-backlogMaxAgeDays) : liveWindowStart;

            var candidates = await db.PhoneVerifications
                .Where(p => p.ConsumedAt == null && !p.FollowupDone
                         && p.CreatedAt >= backlogWindowStart && p.FollowupCount < steps.Count)
                // En vivo primero; backlog del MÁS NUEVO al más viejo (los tibios recientes primero,
                // los rancios al final → si el número bloquea, bajás BacklogMaxAgeDays y no blasteás los viejos).
                .OrderBy(p => p.CreatedAt >= liveWindowStart ? 0 : 1).ThenByDescending(p => p.CreatedAt)
                .ToListAsync(ct);

            var failsThisTick = 0;
            foreach (var v in candidates)
            {
                if (ct.IsCancellationRequested) break;
                var isBacklog = v.CreatedAt < liveWindowStart;
                var idx = v.FollowupCount;

                if (!isBacklog)
                {
                    if (idx >= steps.Count) continue;
                    if ((now - v.CreatedAt).TotalMinutes < steps[idx].DelayMinutes) continue;
                    if (v.LastFollowupAt != null && (now - v.LastFollowupAt.Value).TotalMinutes < minSpacing) continue;
                }
                else if (idx != 0) { continue; }

                if (excludeExisting && await db.Users.IgnoreQueryFilters().AnyAsync(u => u.Phone == v.Phone, ct))
                {
                    v.FollowupDone = true; v.UpdatedAt = now;
                    continue;
                }

                string text;
                if (isBacklog)
                {
                    // Cuanto MÁS VIEJO, más tono de reactivación. Tibio (≤ ColdAfterDays): ofrece código.
                    // Reactivación (> ColdAfterDays): sin código, foco en el valor. Overridable por env.
                    var ageDays = (now - v.CreatedAt).TotalDays;
                    var coldAfterDays = config.GetValue("OtpFollowup:ColdAfterDays", 14);
                    text = ageDays > coldAfterDays
                        ? (config["OtpFollowup:ColdMessage"]
                            ?? "buenas! soy de turnospro 👋 hace un tiempo arrancaste a armar tu agenda y quedó a medias. ¿seguís con la idea?[[next]]te tiro la posta de lo que más le cambia a la gente: los clientes reservan solos y dejás de coordinar todo por mensaje. los recordatorios por whatsapp bajan un montón las ausencias, y cobrás la seña por mercadopago.[[next]]ah, también tenemos app para iphone! https://apps.apple.com/app/id6775843253[[next]]si te copa lo retomamos cuando quieras, sin apuro 🙌")
                        : (config["OtpFollowup:WarmMessage"]
                            ?? "buenas! ¿pudiste entrar a turnospro? te quedó la cuenta a medio crear 🙂[[next]]te dejo un código nuevo para activarla: {code} (vence en 10 min)[[next]]che, te tiro la posta: lo que más le sirve a la gente es que los clientes reservan solos y los recordatorios por whatsapp bajan las ausencias un montón. y cobrás la seña por mercadopago.[[next]]ah, también tenemos app para iphone! https://apps.apple.com/app/id6775843253[[next]]cualquier cosa respondé por acá, te damos una mano!");
                    text = RenderBody(text, v, now);
                }
                else
                {
                    text = RenderBody(steps[idx].Body, v, now);
                }

                if (steps[Math.Min(idx, steps.Count - 1)].Channel.ToLowerInvariant() is var ch && ch != "whatsapp" && ch != "both" && !isBacklog)
                {
                    v.FollowupCount++; v.LastFollowupAt = now; v.UpdatedAt = now;
                    continue;
                }

                var result = await SendWhatsAppAsync(config, v.Phone, text, ct);
                if (result == SendResult.BadNumber)
                {
                    // Número inválido (Evolution lo rechaza con 4xx) — típico en el backlog viejo.
                    // Lo damos por perdido y SEGUIMOS con el próximo, así un número malo no traba la cola.
                    v.FollowupDone = true; v.UpdatedAt = now;
                    await hub.ReportFollowupEventAsync(trigger, v.Phone, "gave_up", -1, null, "bad_number", ct);
                    if (++failsThisTick >= 5) break;
                    continue;
                }
                if (result == SendResult.TransientFail)
                {
                    v.LastFollowupAt = now; v.UpdatedAt = now; // transitorio: reintenta más tarde
                    break;
                }

                if (idx == 0)
                    await hub.ReportFollowupEventAsync(trigger, v.Phone, "triggered", -1, isBacklog ? "backlog" : null, null, ct);
                await hub.ReportFollowupEventAsync(trigger, v.Phone, "step_sent", idx, "whatsapp", isBacklog ? "backlog" : null, ct);

                v.LastFollowupAt = now; v.UpdatedAt = now;
                if (isBacklog) v.FollowupDone = true;
                else v.FollowupCount++;

                RecordGaugeSend(config);
                break; // UNO por tick (el gauge define el ritmo)
            }

            await db.SaveChangesAsync(ct);
        }

        // ---------- Gauge humanizado ----------

        private static bool GaugeReady(IConfiguration config)
        {
            var maxPerHour = config.GetValue("OtpFollowup:MaxPerHour", 20);
            var fromHour = config.GetValue("OtpFollowup:ActiveFromHour", 10);
            var toHour = config.GetValue("OtpFollowup:ActiveToHour", 20);

            var nowAr = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, ArTz());
            if (nowAr.Hour < fromHour || nowAr.Hour >= toHour) return false;

            lock (GaugeLock)
            {
                var now = DateTime.UtcNow;
                if (now < _nextAllowedAt) return false;
                while (_recentSends.Count > 0 && (now - _recentSends.Peek()).TotalMinutes >= 60) _recentSends.Dequeue();
                return _recentSends.Count < maxPerHour;
            }
        }

        private static void RecordGaugeSend(IConfiguration config)
        {
            var minGap = config.GetValue("OtpFollowup:MinGapSeconds", 120);
            var maxGap = config.GetValue("OtpFollowup:MaxGapSeconds", 240);
            lock (GaugeLock)
            {
                var now = DateTime.UtcNow;
                _recentSends.Enqueue(now);
                _nextAllowedAt = now.AddSeconds(Random.Shared.Next(minGap, Math.Max(minGap + 1, maxGap + 1)));
            }
        }

        private static TimeZoneInfo ArTz()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires"); }
            catch { return TimeZoneInfo.CreateCustomTimeZone("AR", TimeSpan.FromHours(-3), "AR", "AR"); }
        }

        // ---------- Resto ----------

        private async Task SyncConfigAsync(ApplicationDbContext db, ISalesHubHubClient hub, string trigger, CancellationToken ct)
        {
            var raw = await hub.GetFollowupConfigRawAsync(ct);
            if (raw == null) return;
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
                else if (local != null) { db.FollowupSequencesLocal.Remove(local); }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "OtpFollowup sync parse falló"); }
        }

        private async Task ReportOutcomesAsync(ApplicationDbContext db, ISalesHubHubClient hub, string trigger, int stepCount, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var converted = await db.PhoneVerifications
                .Where(p => p.ConsumedAt != null && p.FollowupCount > 0 && !p.FollowupDone)
                .ToListAsync(ct);
            foreach (var v in converted)
            {
                await hub.ReportFollowupEventAsync(trigger, v.Phone, "converted", -1, null, null, ct);
                v.FollowupDone = true; v.UpdatedAt = now;
            }
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

        /// <summary>Si el body trae {code}, regenera un OTP válido y lo sustituye.</summary>
        private static string RenderBody(string body, PhoneVerification v, DateTime now)
        {
            if (string.IsNullOrWhiteSpace(body))
                body = "buenas! ¿pudiste entrar a turnospro? si necesitás una mano respondé este mensaje, te ayudamos 🙌";
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

        private enum SendResult { Sent, BadNumber, TransientFail }

        private async Task<SendResult> SendWhatsAppAsync(IConfiguration config, string phone, string text, CancellationToken ct)
        {
            var url = config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
            var key = config["EVOLUTION_API_KEY"];
            var instance = config["EVOLUTION_API_INSTANCE"];
            if (string.IsNullOrEmpty(key) || string.IsNullOrEmpty(instance))
            {
                _logger.LogWarning("Evolution no configurado — no se puede mandar follow-up a {Phone}", phone);
                return SendResult.TransientFail;
            }
            // Cada "[[next]]" se manda como un mensaje SEPARADO, con un huequito entre medio
            // (más humano que un bloque largo). Si una parte falla, cortamos la ráfaga.
            var parts = text.Split("[[next]]", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 0) return SendResult.Sent;
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", key);
                var sendUrl = $"{url.TrimEnd('/')}/message/sendText/{instance}";
                for (int i = 0; i < parts.Length; i++)
                {
                    if (i > 0)
                    {
                        try { await Task.Delay(TimeSpan.FromSeconds(Random.Shared.Next(2, 5)), ct); }
                        catch (TaskCanceledException) { break; }
                    }
                    var payload = JsonSerializer.Serialize(new { number = phone, text = parts[i] });
                    var content = new StringContent(payload, Encoding.UTF8, "application/json");
                    var resp = await client.PostAsync(sendUrl, content, ct);
                    if (resp.IsSuccessStatusCode) continue;
                    if ((int)resp.StatusCode >= 400 && (int)resp.StatusCode < 500)
                    {
                        _logger.LogWarning("OTP follow-up send {Status} (número inválido) para {Phone}", resp.StatusCode, phone);
                        return SendResult.BadNumber;
                    }
                    _logger.LogWarning("OTP follow-up send {Status} (transitorio) para {Phone}", resp.StatusCode, phone);
                    return SendResult.TransientFail;
                }
                return SendResult.Sent;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Excepción mandando OTP follow-up a {Phone}", phone);
                return SendResult.TransientFail;
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
