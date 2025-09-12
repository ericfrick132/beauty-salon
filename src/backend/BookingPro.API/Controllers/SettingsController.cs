using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/settings")]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;

        public SettingsController(ApplicationDbContext context, ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
        }

        public class ServicesSettingsDto
        {
            public int? MinAdvanceMinutes { get; set; }
        }

        [HttpGet("services")]
        public async Task<IActionResult> GetServicesSettings()
        {
            var tenant = _tenantService.GetCurrentTenant();
            var t = await _context.Tenants.FirstOrDefaultAsync(x => x.Id == tenant.Id);
            if (t == null) return NotFound();

            var settings = ParseSettings(t.Settings);
            settings.TryGetValue("bookingMinAdvanceMinutes", out var valueObj);
            int minAdvance = 0;
            if (valueObj is JsonElement je && je.ValueKind == JsonValueKind.Number)
            {
                minAdvance = je.GetInt32();
            }
            else if (valueObj is int iv)
            {
                minAdvance = iv;
            }

            return Ok(new { minAdvanceMinutes = minAdvance });
        }

        [HttpPut("services")]
        public async Task<IActionResult> UpdateServicesSettings([FromBody] ServicesSettingsDto dto)
        {
            var tenant = _tenantService.GetCurrentTenant();
            var t = await _context.Tenants.FirstOrDefaultAsync(x => x.Id == tenant.Id);
            if (t == null) return NotFound();

            var settings = ParseSettings(t.Settings);
            if (dto.MinAdvanceMinutes.HasValue)
            {
                settings["bookingMinAdvanceMinutes"] = dto.MinAdvanceMinutes.Value;
            }

            t.Settings = JsonSerializer.Serialize(settings);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Settings updated" });
        }

        private static Dictionary<string, object> ParseSettings(string json)
        {
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                return dict ?? new Dictionary<string, object>();
            }
            catch
            {
                return new Dictionary<string, object>();
            }
        }
    }
}

