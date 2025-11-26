using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Linq;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/settings")]
    public class SettingsController : ControllerBase
    {
        private readonly ITenantService _tenantService;
        private readonly ISettingsService _settingsService;

        public SettingsController(ITenantService tenantService, ISettingsService settingsService)
        {
            _tenantService = tenantService;
            _settingsService = settingsService;
        }

        public class ServicesSettingsDto
        {
            public int? MinAdvanceMinutes { get; set; }
        }

        public class BusinessHoursSettingsDto
        {
            public string? OpeningTime { get; set; }
            public string? ClosingTime { get; set; }
            public List<int>? ClosedDays { get; set; }
        }

        [HttpGet("services")]
        public async Task<IActionResult> GetServicesSettings()
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant == null) return NotFound(new { message = "Tenant not found" });

                var settings = await _settingsService.GetSettingsAsync(tenant.Id);
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
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Tenant not found" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("services")]
        public async Task<IActionResult> UpdateServicesSettings([FromBody] ServicesSettingsDto dto)
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant == null) return NotFound(new { message = "Tenant not found" });

                var settings = await _settingsService.GetSettingsAsync(tenant.Id);
                if (dto.MinAdvanceMinutes.HasValue)
                {
                    settings["bookingMinAdvanceMinutes"] = dto.MinAdvanceMinutes.Value;
                }

                await _settingsService.SaveSettingsAsync(tenant.Id, settings);

                return Ok(new { message = "Settings updated" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Tenant not found" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("business-hours")]
        public async Task<IActionResult> GetBusinessHoursSettings()
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant == null) return NotFound(new { message = "Tenant not found" });

                var settings = await _settingsService.GetSettingsAsync(tenant.Id);
                var opening = GetStringSetting(settings, "businessOpeningTime") ?? "09:00";
                var closing = GetStringSetting(settings, "businessClosingTime") ?? "22:00";
                var closedDays = GetClosedDays(settings);

                return Ok(new
                {
                    openingTime = opening,
                    closingTime = closing,
                    closedDays
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Tenant not found" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("business-hours")]
        public async Task<IActionResult> UpdateBusinessHoursSettings([FromBody] BusinessHoursSettingsDto dto)
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant == null) return NotFound(new { message = "Tenant not found" });

                var settings = await _settingsService.GetSettingsAsync(tenant.Id);

                if (!string.IsNullOrWhiteSpace(dto.OpeningTime) && !string.IsNullOrWhiteSpace(dto.ClosingTime))
                {
                    if (!TimeSpan.TryParse(dto.OpeningTime, out var opening) ||
                        !TimeSpan.TryParse(dto.ClosingTime, out var closing))
                    {
                        return BadRequest(new { message = "Formato de hora inválido. Usa HH:mm" });
                    }

                    if (opening >= closing)
                    {
                        return BadRequest(new { message = "La hora de apertura debe ser menor a la de cierre" });
                    }

                    settings["businessOpeningTime"] = opening.ToString(@"hh\:mm");
                    settings["businessClosingTime"] = closing.ToString(@"hh\:mm");
                }

                if (dto.ClosedDays != null)
                {
                    var invalidDays = dto.ClosedDays.Any(d => d < 0 || d > 6);
                    if (invalidDays)
                    {
                        return BadRequest(new { message = "Los días de cierre deben estar entre 0 (domingo) y 6 (sábado)" });
                    }
                    settings["businessClosedDays"] = dto.ClosedDays.Distinct().OrderBy(d => d).ToList();
                }

                await _settingsService.SaveSettingsAsync(tenant.Id, settings);

                return Ok(new { message = "Configuración de horarios actualizada" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Tenant not found" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private static string? GetStringSetting(Dictionary<string, object> settings, string key)
        {
            if (!settings.TryGetValue(key, out var value) || value == null) return null;

            if (value is JsonElement je && je.ValueKind == JsonValueKind.String)
            {
                return je.GetString();
            }

            return value.ToString();
        }

        private static List<int> GetClosedDays(Dictionary<string, object> settings)
        {
            try
            {
                if (!settings.TryGetValue("businessClosedDays", out var value) || value == null)
                {
                    return new List<int>();
                }

                if (value is JsonElement je && je.ValueKind == JsonValueKind.Array)
                {
                    var list = new List<int>();
                    foreach (var item in je.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var day))
                        {
                            list.Add(day);
                        }
                    }
                    return list;
                }

                if (value is IEnumerable<object> objList)
                {
                    return objList.Select(o => Convert.ToInt32(o)).ToList();
                }

                var parsed = JsonSerializer.Deserialize<List<int>>(value.ToString() ?? "[]");
                return parsed ?? new List<int>();
            }
            catch
            {
                return new List<int>();
            }
        }
    }
}
