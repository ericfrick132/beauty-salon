using System.Text;
using System.Text.Json;

namespace BookingPro.API.Services
{
    public enum WaSendResult { Sent, BadNumber, TransientFail, SkippedAllowlist }

    /// <summary>
    /// Línea de WhatsApp de PLATAFORMA (la que le escribe al dueño del negocio, no a sus clientes).
    /// Centraliza lo que comparten todos los servicios que mandan por esa línea (OTP follow-up,
    /// onboarding follow-up, trial reminders):
    ///
    ///   - Gauge humanizado ÚNICO por proceso: de a un mensaje, hueco aleatorio entre envíos,
    ///     tope por hora y sólo en horario activo AR. Como la línea es una sola, el presupuesto
    ///     es compartido: cualquier servicio que manda registra el envío acá.
    ///     Config: WhatsAppLine:* con fallback a OtpFollowup:* (keys legacy ya deployadas).
    ///
    ///   - Envío por Evolution (EVOLUTION_API_BASE_URL/_KEY/_INSTANCE), partiendo "[[next]]"
    ///     en mensajes separados con pausas (más humano que un bloque largo).
    ///
    ///   - Modo prueba por servicio: {sección}:DryRun (loguea el mensaje y NO manda; el estado
    ///     avanza igual que un envío real) y {sección}:TestPhoneAllowlist (si está seteada, SOLO
    ///     se manda a esos números; el resto devuelve SkippedAllowlist y el caller NO debe
    ///     avanzar estado). WhatsAppLine:DryRun/TestPhoneAllowlist aplican a todos los servicios.
    /// </summary>
    public static class WhatsAppLine
    {
        private static readonly object GaugeLock = new();
        private static DateTime _nextAllowedAt = DateTime.MinValue;
        private static readonly Queue<DateTime> _recentSends = new();

        private static int Cfg(IConfiguration c, string key, int def) =>
            c.GetValue<int?>($"WhatsAppLine:{key}") ?? c.GetValue($"OtpFollowup:{key}", def);

        public static bool WithinActiveHours(IConfiguration config)
        {
            var fromHour = Cfg(config, "ActiveFromHour", 10);
            var toHour = Cfg(config, "ActiveToHour", 20);
            var nowAr = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, ArTz());
            return nowAr.Hour >= fromHour && nowAr.Hour < toHour;
        }

        public static bool GaugeReady(IConfiguration config)
        {
            if (!WithinActiveHours(config)) return false;
            var maxPerHour = Cfg(config, "MaxPerHour", 20);
            lock (GaugeLock)
            {
                var now = DateTime.UtcNow;
                if (now < _nextAllowedAt) return false;
                while (_recentSends.Count > 0 && (now - _recentSends.Peek()).TotalMinutes >= 60) _recentSends.Dequeue();
                return _recentSends.Count < maxPerHour;
            }
        }

        public static void RecordSend(IConfiguration config)
        {
            var minGap = Cfg(config, "MinGapSeconds", 120);
            var maxGap = Cfg(config, "MaxGapSeconds", 240);
            lock (GaugeLock)
            {
                var now = DateTime.UtcNow;
                _recentSends.Enqueue(now);
                _nextAllowedAt = now.AddSeconds(Random.Shared.Next(minGap, Math.Max(minGap + 1, maxGap + 1)));
            }
        }

        public static TimeZoneInfo ArTz()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires"); }
            catch { return TimeZoneInfo.CreateCustomTimeZone("AR", TimeSpan.FromHours(-3), "AR", "AR"); }
        }

        /// <summary>
        /// Manda por la Evolution de plataforma respetando el modo prueba de la sección
        /// (p.ej. "OtpFollowup", "OnboardingFollowup", "TrialReminder"). NO consulta ni
        /// registra el gauge: eso queda en el caller (GaugeReady antes, RecordSend después).
        /// </summary>
        public static async Task<WaSendResult> SendAsync(
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            ILogger logger,
            string section,
            string phone,
            string text,
            CancellationToken ct)
        {
            var allowlist = config[$"{section}:TestPhoneAllowlist"] ?? config["WhatsAppLine:TestPhoneAllowlist"];
            if (!string.IsNullOrWhiteSpace(allowlist))
            {
                var phoneDigits = Digits(phone);
                var allowed = allowlist
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(Digits)
                    .Any(a => a.Length >= 6 && phoneDigits.EndsWith(a[^Math.Min(a.Length, 10)..]));
                if (!allowed)
                {
                    logger.LogInformation("{Section}: {Phone} fuera de TestPhoneAllowlist — salteado", section, phone);
                    return WaSendResult.SkippedAllowlist;
                }
            }

            if (config.GetValue($"{section}:DryRun", config.GetValue("WhatsAppLine:DryRun", false)))
            {
                logger.LogInformation("[DRYRUN {Section}] → {Phone}: {Text}", section, phone, text);
                return WaSendResult.Sent;
            }

            var url = config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
            var key = config["EVOLUTION_API_KEY"];
            var instance = config["EVOLUTION_API_INSTANCE"];
            if (string.IsNullOrEmpty(key) || string.IsNullOrEmpty(instance))
            {
                logger.LogWarning("{Section}: Evolution no configurado — no se puede mandar a {Phone}", section, phone);
                return WaSendResult.TransientFail;
            }

            // Cada "[[next]]" se manda como un mensaje SEPARADO, con un huequito entre medio.
            // Si una parte falla, cortamos la ráfaga.
            var parts = text.Split("[[next]]", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 0) return WaSendResult.Sent;
            try
            {
                var client = httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", key);
                var sendUrl = $"{url.TrimEnd('/')}/message/sendText/{Uri.EscapeDataString(instance)}";
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
                        logger.LogWarning("{Section}: send {Status} (número inválido) para {Phone}", section, resp.StatusCode, phone);
                        return WaSendResult.BadNumber;
                    }
                    logger.LogWarning("{Section}: send {Status} (transitorio) para {Phone}", section, resp.StatusCode, phone);
                    return WaSendResult.TransientFail;
                }
                return WaSendResult.Sent;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "{Section}: excepción mandando a {Phone}", section, phone);
                return WaSendResult.TransientFail;
            }
        }

        /// <summary>Elige una variante al azar si el texto trae alternativas "[[or]]" (anti-plantilla).</summary>
        public static string PickVariant(string body)
        {
            if (!body.Contains("[[or]]")) return body;
            var variants = body.Split("[[or]]", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            return variants.Length == 0 ? body : variants[Random.Shared.Next(variants.Length)];
        }

        private static string Digits(string s) => new(s.Where(char.IsDigit).ToArray());
    }
}
