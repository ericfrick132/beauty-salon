using System.Text.Json;
using System.Text.RegularExpressions;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Follow-up de ONBOARDING INCOMPLETO (trigger onboarding_incomplete, contrato SalesHub):
    /// persigue tenants en trial que se registraron pero dejaron el setup a medias.
    ///
    /// Milestone-aware: el mensaje se arma AL MOMENTO DEL ENVÍO con el primer paso pendiente
    /// que devuelve IOnboardingMilestoneResolver ({paso} + {link} directo a esa pantalla).
    /// Si el tenant avanzó entre nudges, el próximo apunta solo al nuevo pendiente.
    ///
    /// Los pasos de la secuencia central son nudges EN EL TIEMPO (DelayMinutes desde el alta),
    /// con copy milestone-agnóstico; soporta variantes [[or]] y multi-mensaje [[next]].
    /// Placeholders: {name} {paso} {link} {avance}. Nunca se manda un placeholder sin resolver.
    ///
    /// Telemetría a SalesHub: triggered / step_sent / converted / gave_up. Antes del primer ping
    /// pushea el lead al hub (leadType "setup") y espeja cada envío a /api/hub/outbound-log para
    /// que el cerebro de soporte tenga el contexto de qué le mandamos.
    ///
    /// Gate de rollout: OnboardingFollowup:Enabled (default false) + DryRun/TestPhoneAllowlist.
    /// Envío humanizado por el gauge compartido de la línea (WhatsAppLine).
    /// </summary>
    public class OnboardingFollowupBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<OnboardingFollowupBackgroundService> _logger;
        private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(1);
        private const string Trigger = "onboarding_incomplete";
        private const string Section = "OnboardingFollowup";
        private static readonly Regex UnresolvedPlaceholder = new(@"\{[a-z_]+\}", RegexOptions.Compiled);

        public OnboardingFollowupBackgroundService(
            IServiceProvider serviceProvider,
            IHttpClientFactory httpClientFactory,
            ILogger<OnboardingFollowupBackgroundService> logger)
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
            _logger.LogInformation("OnboardingFollowupBackgroundService started (tick={Sec}s)", TickInterval.TotalSeconds);
            try { await Task.Delay(TimeSpan.FromSeconds(90), stoppingToken); }
            catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try { await RunTickAsync(stoppingToken); }
                catch (Exception ex) { _logger.LogError(ex, "OnboardingFollowup tick failed"); }

                try { await Task.Delay(TickInterval, stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private async Task RunTickAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            if (!config.GetValue("OnboardingFollowup:Enabled", false)) return;

            var minSpacing = config.GetValue("OnboardingFollowup:MinSpacingMinutes", 240);
            var windowDays = config.GetValue("OnboardingFollowup:WindowDays", 30);

            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var hub = scope.ServiceProvider.GetRequiredService<ISalesHubHubClient>();
            var resolver = scope.ServiceProvider.GetRequiredService<IOnboardingMilestoneResolver>();

            await SyncConfigAsync(db, hub, ct);

            var local = await db.FollowupSequencesLocal.AsNoTracking().FirstOrDefaultAsync(x => x.Trigger == Trigger, ct);
            var steps = ParseSteps(local?.StepsJson);

            await ReportOutcomesAsync(db, hub, resolver, config, steps.Count, ct);
            if (steps.Count == 0) { await db.SaveChangesAsync(ct); return; }

            // El gauge manda como mucho UNO por tick — si no es momento, ni buscamos candidatos.
            if (!WhatsAppLine.GaugeReady(config)) { await db.SaveChangesAsync(ct); return; }

            var now = DateTime.UtcNow;
            var windowStart = now.AddDays(-windowDays);

            var candidates = await db.Tenants
                .Where(t => t.Status == "trial" && !t.OnboardingFollowupDone
                         && t.OnboardingFollowupCount < steps.Count
                         && t.CreatedAt >= windowStart
                         && t.OwnerPhone != null && t.OwnerPhone != "")
                .OrderByDescending(t => t.CreatedAt) // los más frescos primero
                .ToListAsync(ct);

            foreach (var t in candidates)
            {
                if (ct.IsCancellationRequested) break;
                var idx = t.OnboardingFollowupCount;
                if (idx >= steps.Count) continue;
                if ((now - t.CreatedAt).TotalMinutes < steps[idx].DelayMinutes) continue;
                if (t.OnboardingLastFollowupAt != null && (now - t.OnboardingLastFollowupAt.Value).TotalMinutes < minSpacing) continue;

                // Canal opaco del contrato: esta app sólo ejecuta whatsapp (y "both" cuenta como whatsapp).
                var ch = steps[idx].Channel.ToLowerInvariant();
                if (ch != "whatsapp" && ch != "both" && ch != "")
                {
                    t.OnboardingFollowupCount++; t.OnboardingLastFollowupAt = now; t.UpdatedAt = now;
                    continue;
                }

                var milestone = await resolver.ResolveAsync(t.Id, ct);
                if (milestone == null) continue; // activado: lo cierra ReportOutcomes como converted

                var text = RenderBody(steps[idx].Body, t, milestone, config);
                if (text == null)
                {
                    _logger.LogWarning("OnboardingFollowup: body con placeholder sin resolver para tenant {Tenant} (step {Idx}) — salteado", t.Id, idx);
                    continue;
                }

                var result = await WhatsAppLine.SendAsync(_httpClientFactory, config, _logger, Section, t.OwnerPhone!, text, ct);
                if (result == WaSendResult.SkippedAllowlist) continue; // modo prueba: no avanza estado
                if (result == WaSendResult.BadNumber)
                {
                    t.OnboardingFollowupDone = true; t.UpdatedAt = now;
                    await hub.ReportFollowupEventAsync(Trigger, t.Id.ToString(), "gave_up", -1, null, "bad_number", ct);
                    continue;
                }
                if (result == WaSendResult.TransientFail) break;

                if (idx == 0)
                {
                    // El cerebro necesita un Lead en el hub para enganchar la conversación.
                    await hub.PushLeadAsync(t.Id.ToString(), t.OwnerName, t.BusinessName, t.OwnerPhone, t.OwnerEmail, "setup", ct);
                    await hub.ReportFollowupEventAsync(Trigger, t.Id.ToString(), "triggered", -1, null, milestone.Key, ct);
                }
                await hub.ReportFollowupEventAsync(Trigger, t.Id.ToString(), "step_sent", idx, "whatsapp", milestone.Key, ct);
                await hub.LogOutboundAsync(t.OwnerPhone!, text, ct); // espejo: el bot sabe qué le mandamos

                t.OnboardingFollowupCount++; t.OnboardingLastFollowupAt = now; t.UpdatedAt = now;
                WhatsAppLine.RecordSend(config);
                break; // UNO por tick (el gauge define el ritmo)
            }

            await db.SaveChangesAsync(ct);
        }

        private async Task ReportOutcomesAsync(
            ApplicationDbContext db, ISalesHubHubClient hub, IOnboardingMilestoneResolver resolver,
            IConfiguration config, int stepCount, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var touched = await db.Tenants
                .Where(t => t.OnboardingFollowupCount > 0 && !t.OnboardingFollowupDone)
                .ToListAsync(ct);
            if (touched.Count == 0) return;

            var gaveUpCutoff = now.AddHours(-config.GetValue("OnboardingFollowup:GaveUpAfterHours", 48));
            foreach (var t in touched)
            {
                if (ct.IsCancellationRequested) break;
                if (t.Status == "active")
                {
                    await hub.ReportFollowupEventAsync(Trigger, t.Id.ToString(), "converted", -1, null, "paid", ct);
                    t.OnboardingFollowupDone = true; t.UpdatedAt = now;
                    continue;
                }
                if (t.Status == "cancelled" || t.Status == "suspended")
                {
                    await hub.ReportFollowupEventAsync(Trigger, t.Id.ToString(), "gave_up", -1, null, t.Status, ct);
                    t.OnboardingFollowupDone = true; t.UpdatedAt = now;
                    continue;
                }
                if (await resolver.ResolveAsync(t.Id, ct) == null)
                {
                    await hub.ReportFollowupEventAsync(Trigger, t.Id.ToString(), "converted", -1, null, "activated", ct);
                    t.OnboardingFollowupDone = true; t.UpdatedAt = now;
                    continue;
                }
                if (stepCount > 0 && t.OnboardingFollowupCount >= stepCount
                    && t.OnboardingLastFollowupAt != null && t.OnboardingLastFollowupAt < gaveUpCutoff)
                {
                    await hub.ReportFollowupEventAsync(Trigger, t.Id.ToString(), "gave_up", -1, null, null, ct);
                    t.OnboardingFollowupDone = true; t.UpdatedAt = now;
                }
            }
        }

        /// <summary>Render al momento del envío. Devuelve null si queda un placeholder sin resolver.</summary>
        private static string? RenderBody(string body, Tenant t, PendingMilestone milestone, IConfiguration config)
        {
            if (string.IsNullOrWhiteSpace(body)) return null;
            body = WhatsAppLine.PickVariant(body);

            var name = FirstName(t.OwnerName) ?? t.BusinessName;
            var domain = config["OnboardingFollowup:AppDomain"] ?? "turnos-pro.com";
            var link = string.IsNullOrWhiteSpace(t.Subdomain)
                ? $"https://{domain}{milestone.Path}"
                : $"https://{t.Subdomain}.{domain}{milestone.Path}";

            body = body
                .Replace("{name}", name)
                .Replace("{paso}", milestone.Label)
                .Replace("{link}", link)
                .Replace("{avance}", milestone.DoneSummary ?? "");

            body = body.Replace("  ", " ").Trim();
            return UnresolvedPlaceholder.IsMatch(body) ? null : body;
        }

        private static string? FirstName(string? full)
        {
            if (string.IsNullOrWhiteSpace(full)) return null;
            var first = full.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)[0];
            return first.Length > 1 ? first : null;
        }

        private async Task SyncConfigAsync(ApplicationDbContext db, ISalesHubHubClient hub, CancellationToken ct)
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
                            if (s.TryGetProperty("trigger", out var t) && t.GetString() == Trigger)
                            {
                                if (s.TryGetProperty("steps", out var st)) stepsJson = st.GetRawText();
                                break;
                            }
                }

                var local = await db.FollowupSequencesLocal.FirstOrDefaultAsync(x => x.Trigger == Trigger, ct);
                if (stepsJson != null)
                {
                    if (local == null) { local = new FollowupSequenceLocal { Trigger = Trigger }; db.FollowupSequencesLocal.Add(local); }
                    local.StepsJson = stepsJson;
                    local.SyncedAt = DateTime.UtcNow;
                }
                else if (local != null) { db.FollowupSequencesLocal.Remove(local); }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "OnboardingFollowup sync parse falló"); }
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
