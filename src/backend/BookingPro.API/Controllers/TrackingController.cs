using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        public TrackingController(
            ApplicationDbContext context,
            IConfiguration config,
            ILogger<TrackingController> logger,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _config = config;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
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
                CreatedAt = DateTime.UtcNow
            };

            _context.TrackingEvents.Add(ev);
            await _context.SaveChangesAsync();

            // Notify via WhatsApp on new leads and registrations
            if (request.EventType is "Lead" or "CompleteRegistration")
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

                        var msg = $"{emoji} *{label} - TurnosPro*\n\n" +
                                  $"Campa\u00f1a: {campaign}\n" +
                                  $"Fuente: {source}\n" +
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

            return Ok();
        }
    }
}
