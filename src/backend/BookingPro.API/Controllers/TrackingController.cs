using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrackingController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly ILogger<TrackingController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMetaCapiService _capi;

        public TrackingController(
            ApplicationDbContext context,
            IConfiguration config,
            ILogger<TrackingController> logger,
            IHttpClientFactory httpClientFactory,
            IMetaCapiService capi)
        {
            _context = context;
            _config = config;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _capi = capi;
        }

        public class TrackEventRequest
        {
            public string EventType { get; set; } = string.Empty;
            public string? Url { get; set; }
            public string? UtmSource { get; set; }
            public string? UtmMedium { get; set; }
            public string? UtmCampaign { get; set; }
            public string? Referrer { get; set; }
            public string? Device { get; set; }
            public string? Name { get; set; }
            public string? Email { get; set; }
            public string? Phone { get; set; }
            public string? PlanName { get; set; }
            public string? Fbclid { get; set; }
            public string? SessionId { get; set; }
            public string? ScreenResolution { get; set; }
            public string? Language { get; set; }
            public string? PageTitle { get; set; }
        }

        /// <summary>
        /// Maps internal event types to standard Meta event names.
        /// Returns null for events we DON'T want to mirror (internal-only).
        /// OpenRegister is intentionally NOT mirrored — frontend already fires "Lead" on form submit.
        /// </summary>
        private static string? MapToMetaEventName(string eventType) => eventType switch
        {
            "PageView" => "PageView",
            "Lead" => "Lead",
            "InitiateCheckout" => "InitiateCheckout",
            "CompleteRegistration" => "CompleteRegistration",
            _ => null
        };

        private static string ClassifyReferrer(string? referrer)
        {
            if (string.IsNullOrEmpty(referrer)) return "directo";
            var r = referrer.ToLowerInvariant();
            if (r.Contains("chatgpt.com") || r.Contains("chat.openai.com")) return "ChatGPT";
            if (r.Contains("perplexity.ai")) return "Perplexity";
            if (r.Contains("claude.ai")) return "Claude";
            if (r.Contains("gemini.google.com") || r.Contains("bard.google.com")) return "Gemini";
            if (r.Contains("copilot.microsoft.com")) return "Copilot";
            if (r.Contains("google.com") || r.Contains("google.com.ar")) return "Google";
            if (r.Contains("bing.com")) return "Bing";
            if (r.Contains("yahoo.com")) return "Yahoo";
            if (r.Contains("duckduckgo.com")) return "DuckDuckGo";
            if (r.Contains("facebook.com") || r.Contains("fb.com")) return "Facebook";
            if (r.Contains("instagram.com") || r.Contains("l.instagram.com")) return "Instagram";
            if (r.Contains("twitter.com") || r.Contains("x.com") || r.Contains("t.co")) return "X/Twitter";
            if (r.Contains("linkedin.com")) return "LinkedIn";
            if (r.Contains("tiktok.com")) return "TikTok";
            if (r.Contains("youtube.com")) return "YouTube";
            if (r.Contains("whatsapp.com") || r.Contains("wa.me")) return "WhatsApp";
            return referrer.Length > 40 ? referrer[..40] : referrer;
        }

        [HttpPost("event")]
        [AllowAnonymous]
        public async Task<IActionResult> TrackEvent([FromBody] TrackEventRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EventType))
                return BadRequest();

            var ev = new TrackingEvent
            {
                EventType = request.EventType.Length > 50 ? request.EventType[..50] : request.EventType,
                Url = request.Url?.Length > 500 ? request.Url[..500] : request.Url,
                UtmSource = request.UtmSource?.Length > 100 ? request.UtmSource[..100] : request.UtmSource,
                UtmMedium = request.UtmMedium?.Length > 100 ? request.UtmMedium[..100] : request.UtmMedium,
                UtmCampaign = request.UtmCampaign?.Length > 200 ? request.UtmCampaign[..200] : request.UtmCampaign,
                Referrer = request.Referrer?.Length > 100 ? request.Referrer[..100] : request.Referrer,
                Device = request.Device?.Length > 50 ? request.Device[..50] : request.Device,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString().Length > 500
                    ? Request.Headers.UserAgent.ToString()[..500]
                    : Request.Headers.UserAgent.ToString(),
                Name = request.Name?.Length > 200 ? request.Name[..200] : request.Name,
                Email = request.Email?.Length > 200 ? request.Email[..200] : request.Email,
                Phone = request.Phone?.Length > 50 ? request.Phone[..50] : request.Phone,
                PlanName = request.PlanName?.Length > 200 ? request.PlanName[..200] : request.PlanName,
                Fbclid = request.Fbclid?.Length > 200 ? request.Fbclid[..200] : request.Fbclid,
                SessionId = request.SessionId?.Length > 100 ? request.SessionId[..100] : request.SessionId,
                ScreenResolution = request.ScreenResolution?.Length > 50 ? request.ScreenResolution[..50] : request.ScreenResolution,
                Language = request.Language?.Length > 10 ? request.Language[..10] : request.Language,
                PageTitle = request.PageTitle?.Length > 200 ? request.PageTitle[..200] : request.PageTitle,
                CreatedAt = DateTime.UtcNow
            };

            _context.TrackingEvents.Add(ev);
            await _context.SaveChangesAsync();

            // Mirror conversion events to Meta Conversions API (server-side).
            // Browser pixel is suppressed by iOS/adblockers, so we send the same event from the
            // backend with hashed PII + fbclid. Fire-and-forget so the endpoint stays fast.
            var metaEventName = MapToMetaEventName(request.EventType);
            if (metaEventName != null)
            {
                var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
                var ua = Request.Headers.UserAgent.ToString();
                var capiEvent = new MetaCapiEvent
                {
                    EventName = metaEventName,
                    EventId = !string.IsNullOrEmpty(ev.SessionId) ? $"{ev.SessionId}-{ev.EventType}" : ev.Id.ToString(),
                    EventTime = ev.CreatedAt,
                    EventSourceUrl = ev.Url,
                    Email = ev.Email,
                    Phone = ev.Phone,
                    Fbclid = ev.Fbclid,
                    ClientIpAddress = clientIp,
                    ClientUserAgent = ua,
                };
                var capiSvc = _capi;
                _ = Task.Run(async () =>
                {
                    try { await capiSvc.SendEventAsync(capiEvent); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Background CAPI send failed for {Event}", request.EventType); }
                });
            }

            // SessionExit: send behavior summary to admin
            if (request.EventType == "SessionExit")
            {
                var adminPhone = _config["AdminNotificationPhone"];
                var summary = request.Name ?? "";
                var durationMatch = System.Text.RegularExpressions.Regex.Match(summary, @"^(\d+)s");
                var duration = durationMatch.Success ? int.Parse(durationMatch.Groups[1].Value) : 0;
                if (!string.IsNullOrEmpty(adminPhone) && duration >= 3)
                {
                    var evolutionUrl = _config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
                    var evolutionKey = _config["EVOLUTION_API_KEY"];
                    var evolutionInstance = _config["EVOLUTION_API_INSTANCE"];
                    if (!string.IsNullOrEmpty(evolutionKey) && !string.IsNullOrEmpty(evolutionInstance))
                    {
                        var origin = ClassifyReferrer(request.Referrer);
                        var campaign = request.UtmCampaign ?? "orgánico";
                        var msg = $"\ud83d\udcca *SESIÓN - TurnosPro*\n" +
                                  $"{summary}\n" +
                                  $"Campaña: {campaign}\n" +
                                  $"Origen: {origin}\n" +
                                  $"Dispositivo: {request.Device ?? "?"}\n" +
                                  $"Hora: {DateTime.UtcNow.AddHours(-3):HH:mm} hs";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var client = _httpClientFactory.CreateClient();
                                client.DefaultRequestHeaders.Add("apikey", evolutionKey);
                                var payload = JsonSerializer.Serialize(new { number = adminPhone, text = msg });
                                var content = new StringContent(payload, Encoding.UTF8, "application/json");
                                await client.PostAsync($"{evolutionUrl.TrimEnd('/')}/message/sendText/{evolutionInstance}", content);
                            }
                            catch (Exception ex) { _logger.LogWarning(ex, "Failed to send SessionExit WhatsApp"); }
                        });
                    }
                }
                return Ok();
            }

            // RegisterFlow: detailed registration attempt tracking
            if (request.EventType == "RegisterFlow")
            {
                var adminPhone = _config["AdminNotificationPhone"];
                var evolutionUrl2 = _config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
                var evolutionKey2 = _config["EVOLUTION_API_KEY"];
                var evolutionInstance2 = _config["EVOLUTION_API_INSTANCE"];
                if (!string.IsNullOrEmpty(adminPhone) && !string.IsNullOrEmpty(evolutionKey2) && !string.IsNullOrEmpty(evolutionInstance2))
                {
                    var summary = request.Name ?? "";
                    var isAbandoned = summary.StartsWith("[ABANDONED]");
                    var emoji = isAbandoned ? "\u274C" : "\u2705";
                    var label = isAbandoned ? "REGISTRO ABANDONADO" : "REGISTRO COMPLETADO";
                    var origin = ClassifyReferrer(request.Referrer);
                    var campaign = request.UtmCampaign ?? "orgánico";
                    var msg = $"{emoji} *{label} - TurnosPro*\n" +
                              $"{summary}\n" +
                              $"Campaña: {campaign} | Origen: {origin}\n" +
                              $"Dispositivo: {request.Device ?? "?"}\n" +
                              $"Hora: {DateTime.UtcNow.AddHours(-3):HH:mm} hs";
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            var client = _httpClientFactory.CreateClient();
                            client.DefaultRequestHeaders.Add("apikey", evolutionKey2);
                            var payload = JsonSerializer.Serialize(new { number = adminPhone, text = msg });
                            var content = new StringContent(payload, Encoding.UTF8, "application/json");
                            await client.PostAsync($"{evolutionUrl2.TrimEnd('/')}/message/sendText/{evolutionInstance2}", content);
                        }
                        catch (Exception ex) { _logger.LogWarning(ex, "Failed to send RegisterFlow WhatsApp"); }
                    });
                }
                return Ok();
            }

            // Check DB for notification preferences
            var notifSetting = await _context.NotificationSettings
                .FirstOrDefaultAsync(s => s.EventType == request.EventType);
            var shouldNotify = notifSetting?.WhatsAppEnabled ?? (request.EventType is "Lead" or "CompleteRegistration");
            if (shouldNotify)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var adminPhone = _config["AdminNotificationPhone"];
                        var evolutionUrl = _config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
                        var evolutionKey = _config["EVOLUTION_API_KEY"];
                        var evolutionInstance = _config["EVOLUTION_API_INSTANCE"];

                        if (string.IsNullOrEmpty(adminPhone) || string.IsNullOrEmpty(evolutionKey) || string.IsNullOrEmpty(evolutionInstance))
                            return;

                        var emoji = request.EventType == "CompleteRegistration" ? "\ud83c\udf89" : "\ud83d\udce5";
                        var label = request.EventType == "CompleteRegistration" ? "NUEVO REGISTRO" : "NUEVO LEAD";
                        var campaign = request.UtmCampaign ?? "org\u00e1nico";
                        var source = request.UtmSource ?? "directo";
                        var device = request.Device ?? "?";
                        var origin = ClassifyReferrer(request.Referrer);

                        var name = request.Name ?? "—";
                        var email = request.Email ?? "—";
                        var reqPhone = request.Phone ?? "—";

                        var msg = $"{emoji} *{label} - TurnosPro*\n\n" +
                                  $"Nombre: {name}\n" +
                                  $"Email: {email}\n" +
                                  $"Tel: {reqPhone}\n" +
                                  $"Campa\u00f1a: {campaign}\n" +
                                  $"Fuente: {source}\n" +
                                  $"Origen: {origin}\n" +
                                  $"Dispositivo: {device}\n" +
                                  $"Hora: {DateTime.UtcNow.AddHours(-3):HH:mm} hs";

                        var client = _httpClientFactory.CreateClient();
                        client.DefaultRequestHeaders.Add("apikey", evolutionKey);

                        var payload = JsonSerializer.Serialize(new { number = adminPhone, text = msg });
                        var content = new StringContent(payload, Encoding.UTF8, "application/json");
                        await client.PostAsync($"{evolutionUrl.TrimEnd('/')}/message/sendText/{evolutionInstance}", content);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send WhatsApp notification for tracking event");
                    }
                });
            }

            // Auto follow-up based on configurable settings
            if (notifSetting is { FollowUpWhatsAppEnabled: true } or { FollowUpEmailEnabled: true })
            {
                var delay = notifSetting?.FollowUpDelayMinutes ?? 0;
                var phone = request.Phone;
                var email = request.Email;
                var name = request.Name;
                var planName = request.PlanName;
                var waMessage = notifSetting?.FollowUpWhatsAppMessage;
                var waEnabled = notifSetting?.FollowUpWhatsAppEnabled ?? false;
                var emailEnabled = notifSetting?.FollowUpEmailEnabled ?? false;
                var evolutionUrl = _config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
                var evolutionKey = _config["EVOLUTION_API_KEY"];
                var evolutionInstance = _config["EVOLUTION_API_INSTANCE"];

                _ = Task.Run(async () =>
                {
                    try
                    {
                        if (delay > 0)
                            await Task.Delay(TimeSpan.FromMinutes(delay));

                        // WhatsApp follow-up to the lead
                        if (waEnabled && !string.IsNullOrEmpty(phone) && !string.IsNullOrEmpty(waMessage)
                            && !string.IsNullOrEmpty(evolutionKey) && !string.IsNullOrEmpty(evolutionInstance))
                        {
                            var msg = waMessage
                                .Replace("{{name}}", name ?? "")
                                .Replace("{{email}}", email ?? "")
                                .Replace("{{phone}}", phone ?? "")
                                .Replace("{{plan}}", planName ?? "");

                            var client = _httpClientFactory.CreateClient();
                            client.DefaultRequestHeaders.Add("apikey", evolutionKey);
                            var payload = JsonSerializer.Serialize(new { number = phone, text = msg });
                            var content = new StringContent(payload, Encoding.UTF8, "application/json");
                            var resp = await client.PostAsync($"{evolutionUrl.TrimEnd('/')}/message/sendText/{evolutionInstance}", content);
                            if (resp.IsSuccessStatusCode)
                                _logger.LogInformation("Follow-up WhatsApp sent to {Phone}", phone);
                            else
                                _logger.LogWarning("Follow-up WhatsApp failed for {Phone}: {Status}", phone, resp.StatusCode);
                        }

                        // Email follow-up to the lead (simple HTML for now, no template engine in TurnosPro)
                        if (emailEnabled && !string.IsNullOrEmpty(email))
                        {
                            // TODO: implement email service in TurnosPro
                            _logger.LogInformation("Follow-up email would be sent to {Email} (not yet implemented)", email);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send follow-up for {EventType}", request.EventType);
                    }
                });
            }

            return Ok();
        }
    }
}
