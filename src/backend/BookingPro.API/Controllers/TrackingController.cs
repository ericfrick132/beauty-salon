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

        public TrackingController(ApplicationDbContext context)
        {
            _context = context;
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

            return Ok();
        }
    }
}
