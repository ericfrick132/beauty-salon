using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using System.Text.Json;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ThemeConfigurationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<ThemeConfigurationController> _logger;

        public ThemeConfigurationController(
            ApplicationDbContext context,
            ITenantProvider tenantProvider,
            ILogger<ThemeConfigurationController> logger)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetThemeConfiguration()
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return BadRequest(new { message = "Tenant not found" });
                }

                var tenant = await _context.Tenants
                    .FirstOrDefaultAsync(t => t.Id == tenantId);

                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                var themeConfig = string.IsNullOrEmpty(tenant.ThemeOverrides) 
                    ? new ThemeConfigurationDto() 
                    : JsonSerializer.Deserialize<ThemeConfigurationDto>(tenant.ThemeOverrides) ?? new ThemeConfigurationDto();

                return Ok(new { data = themeConfig });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting theme configuration");
                return StatusCode(500, new { message = "Error getting theme configuration" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateThemeConfiguration([FromBody] ThemeConfigurationDto themeConfig)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return BadRequest(new { message = "Tenant not found" });
                }

                var tenant = await _context.Tenants
                    .FirstOrDefaultAsync(t => t.Id == tenantId);

                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                // Validate colors are in hex format
                if (!IsValidHexColor(themeConfig.PrimaryColor) ||
                    !IsValidHexColor(themeConfig.SecondaryColor) ||
                    !IsValidHexColor(themeConfig.AccentColor) ||
                    !IsValidHexColor(themeConfig.BackgroundColor) ||
                    !IsValidHexColor(themeConfig.SurfaceColor) ||
                    !IsValidHexColor(themeConfig.ErrorColor) ||
                    !IsValidHexColor(themeConfig.WarningColor) ||
                    !IsValidHexColor(themeConfig.InfoColor) ||
                    !IsValidHexColor(themeConfig.SuccessColor))
                {
                    return BadRequest(new { message = "Invalid color format. Colors must be in hex format (#RRGGBB)" });
                }

                tenant.ThemeOverrides = JsonSerializer.Serialize(themeConfig);
                tenant.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Theme configuration updated successfully",
                    data = themeConfig 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating theme configuration");
                return StatusCode(500, new { message = "Error updating theme configuration" });
            }
        }

        [HttpPost("reset")]
        public async Task<IActionResult> ResetThemeConfiguration()
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return BadRequest(new { message = "Tenant not found" });
                }

                var tenant = await _context.Tenants
                    .Include(t => t.Vertical)
                    .FirstOrDefaultAsync(t => t.Id == tenantId);

                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                // Reset to vertical defaults
                tenant.ThemeOverrides = null;
                tenant.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Return default theme
                var defaultTheme = new ThemeConfigurationDto();
                if (!string.IsNullOrEmpty(tenant.Vertical.DefaultTheme))
                {
                    defaultTheme = JsonSerializer.Deserialize<ThemeConfigurationDto>(tenant.Vertical.DefaultTheme) ?? new ThemeConfigurationDto();
                }

                return Ok(new { 
                    message = "Theme configuration reset to defaults",
                    data = defaultTheme
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting theme configuration");
                return StatusCode(500, new { message = "Error resetting theme configuration" });
            }
        }

        private bool IsValidHexColor(string color)
        {
            if (string.IsNullOrEmpty(color)) return false;
            
            // Check if it starts with # and has 6 or 3 characters after
            if (!color.StartsWith("#")) return false;
            
            var hex = color.Substring(1);
            return hex.Length == 6 || hex.Length == 3;
        }
    }
}