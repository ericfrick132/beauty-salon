using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using System.Text.Json;

namespace BookingPro.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Policy = "SuperAdminOnly")]
    public class TenantThemeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TenantThemeController> _logger;

        public TenantThemeController(
            ApplicationDbContext context,
            ILogger<TenantThemeController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("{tenantId}")]
        public async Task<IActionResult> GetTenantTheme(Guid tenantId)
        {
            try
            {
                var tenant = await _context.Tenants
                    .Include(t => t.Vertical)
                    .FirstOrDefaultAsync(t => t.Id == tenantId);

                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                ThemeConfigurationDto themeConfig;
                
                // First check tenant overrides
                if (!string.IsNullOrEmpty(tenant.ThemeOverrides))
                {
                    themeConfig = JsonSerializer.Deserialize<ThemeConfigurationDto>(tenant.ThemeOverrides) ?? new ThemeConfigurationDto();
                }
                // Then check vertical defaults
                else if (!string.IsNullOrEmpty(tenant.Vertical.DefaultTheme))
                {
                    themeConfig = JsonSerializer.Deserialize<ThemeConfigurationDto>(tenant.Vertical.DefaultTheme) ?? new ThemeConfigurationDto();
                }
                // Finally use system defaults
                else
                {
                    themeConfig = new ThemeConfigurationDto();
                }

                return Ok(new { 
                    data = themeConfig,
                    tenantName = tenant.BusinessName,
                    vertical = tenant.Vertical.Name
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tenant theme for tenant {TenantId}", tenantId);
                return StatusCode(500, new { message = "Error getting tenant theme" });
            }
        }

        [HttpPost("{tenantId}")]
        public async Task<IActionResult> UpdateTenantTheme(Guid tenantId, [FromBody] ThemeConfigurationDto themeConfig)
        {
            try
            {
                var tenant = await _context.Tenants
                    .FirstOrDefaultAsync(t => t.Id == tenantId);

                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                // Validate colors
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

                _logger.LogInformation("Super admin updated theme for tenant {TenantId}", tenantId);

                return Ok(new { 
                    message = "Theme configuration updated successfully",
                    data = themeConfig 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating tenant theme for tenant {TenantId}", tenantId);
                return StatusCode(500, new { message = "Error updating tenant theme" });
            }
        }

        [HttpPost("{tenantId}/reset")]
        public async Task<IActionResult> ResetTenantTheme(Guid tenantId)
        {
            try
            {
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

                _logger.LogInformation("Super admin reset theme for tenant {TenantId}", tenantId);

                return Ok(new { 
                    message = "Theme configuration reset to defaults",
                    data = defaultTheme
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting tenant theme for tenant {TenantId}", tenantId);
                return StatusCode(500, new { message = "Error resetting tenant theme" });
            }
        }

        [HttpGet("verticals/{verticalCode}/default")]
        public async Task<IActionResult> GetVerticalDefaultTheme(string verticalCode)
        {
            try
            {
                var vertical = await _context.Verticals
                    .FirstOrDefaultAsync(v => v.Code == verticalCode);

                if (vertical == null)
                {
                    return NotFound(new { message = "Vertical not found" });
                }

                var defaultTheme = new ThemeConfigurationDto();
                if (!string.IsNullOrEmpty(vertical.DefaultTheme))
                {
                    defaultTheme = JsonSerializer.Deserialize<ThemeConfigurationDto>(vertical.DefaultTheme) ?? new ThemeConfigurationDto();
                }
                else
                {
                    // Set specific defaults based on vertical
                    switch (verticalCode)
                    {
                        case "beautysalon":
                            defaultTheme.PrimaryColor = "#C8A2C8";
                            defaultTheme.SecondaryColor = "#FFF8F0";
                            defaultTheme.AccentColor = "#E6C9A8";
                            break;
                        case "aesthetics":
                            defaultTheme.PrimaryColor = "#9370DB";
                            defaultTheme.SecondaryColor = "#F5F5DC";
                            defaultTheme.AccentColor = "#40E0D0";
                            break;
                        default: // barbershop
                            defaultTheme.PrimaryColor = "#1976d2";
                            defaultTheme.SecondaryColor = "#ffffff";
                            defaultTheme.AccentColor = "#ffc107";
                            break;
                    }
                }

                return Ok(new { data = defaultTheme });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vertical default theme for {VerticalCode}", verticalCode);
                return StatusCode(500, new { message = "Error getting vertical default theme" });
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