using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BookingPro.API.Services;
using BookingPro.API.Data;
using System.Text.Json;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantController : ControllerBase
    {
        private readonly ITenantService _tenantService;
        private readonly ITenantProvisioningService _provisioningService;
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public TenantController(ITenantService tenantService, ITenantProvisioningService provisioningService, ApplicationDbContext context, IMemoryCache cache)
        {
            _tenantService = tenantService;
            _provisioningService = provisioningService;
            _context = context;
            _cache = cache;
        }

        [HttpGet("config")]
        public async Task<IActionResult> GetTenantConfig()
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();

                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                // Pull onboarding marker + owner name/logo straight from DB — not cached in
                // TenantInfo, and the wizard redirect depends on this value being fresh.
                DateTime? onboardingCompletedAt = null;
                string? ownerName = null;
                string? logoUrl = null;
                try
                {
                    var row = await _context.Tenants
                        .AsNoTracking()
                        .Where(t => t.Id == tenant.Id)
                        .Select(t => new { t.OnboardingCompletedAt, t.OwnerName, t.LogoUrl })
                        .FirstOrDefaultAsync();
                    if (row != null)
                    {
                        onboardingCompletedAt = row.OnboardingCompletedAt;
                        ownerName = row.OwnerName;
                        logoUrl = row.LogoUrl;
                    }
                }
                catch { /* column may not exist pre-migration; stay graceful */ }

                var config = new
                {
                    tenantId = tenant.Id,
                    businessName = tenant.BusinessName,
                    vertical = tenant.VerticalCode,
                    timezone = tenant.TimeZone ?? "-3",
                    theme = tenant.Theme,
                    features = tenant.Features,
                    terminology = tenant.Terminology,
                    onboardingCompletedAt,
                    ownerName,
                    logoUrl,
                };

                return Ok(config);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("info")]
        public async Task<IActionResult> GetTenantInfo()
        {
            try
            {
                var tenantInfo = _tenantService.GetCurrentTenant();

                if (tenantInfo == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                var tenant = await _context.Tenants
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);

                if (tenant == null)
                {
                    return NotFound(new { message = "Tenant not found" });
                }

                var settings = ParseSettingsSafe(tenant.Settings);

                return Ok(new
                {
                    id = tenant.Id,
                    subdomain = tenant.Subdomain,
                    businessName = tenant.BusinessName,
                    vertical = tenantInfo.VerticalCode,
                    domain = tenantInfo.Domain,
                    address = tenant.BusinessAddress,
                    phone = tenant.OwnerPhone,
                    email = tenant.OwnerEmail,
                    timezone = tenant.TimeZone ?? "-3",
                    currency = tenant.Currency ?? "ARS",
                    language = tenant.Language ?? "es",
                    description = GetStringSetting(settings, "description"),
                    website = GetStringSetting(settings, "website"),
                    taxId = GetStringSetting(settings, "taxId")
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPut("settings")]
        public async Task<IActionResult> UpdateTenantSettings([FromBody] UpdateTenantSettingsRequest request)
        {
            try
            {
                var tenantInfo = _tenantService.GetCurrentTenant();
                if (tenantInfo == null)
                    return NotFound(new { message = "Tenant not found" });

                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);
                if (tenant == null)
                    return NotFound(new { message = "Tenant not found" });

                if (!string.IsNullOrWhiteSpace(request.BusinessName))
                    tenant.BusinessName = request.BusinessName.Trim();

                if (request.Address != null)
                    tenant.BusinessAddress = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

                if (request.Phone != null)
                    tenant.OwnerPhone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

                if (!string.IsNullOrWhiteSpace(request.Email))
                    tenant.OwnerEmail = request.Email.Trim();

                if (!string.IsNullOrWhiteSpace(request.Timezone))
                    tenant.TimeZone = request.Timezone.Trim();

                if (!string.IsNullOrWhiteSpace(request.Currency))
                    tenant.Currency = request.Currency.Trim();

                if (!string.IsNullOrWhiteSpace(request.Language))
                    tenant.Language = request.Language.Trim();

                var settings = ParseSettingsSafe(tenant.Settings);
                if (request.Description != null) settings["description"] = request.Description.Trim();
                if (request.Website != null) settings["website"] = request.Website.Trim();
                if (request.TaxId != null) settings["taxId"] = request.TaxId.Trim();
                tenant.Settings = JsonSerializer.Serialize(settings);

                tenant.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var host = HttpContext.Request.Host.Value;
                _cache.Remove($"tenant_header_{tenant.Subdomain}");
                _cache.Remove($"tenant_qs_{tenant.Subdomain}");
                _cache.Remove($"tenant_{host}");

                return Ok(new { message = "Configuración guardada correctamente" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private static Dictionary<string, object> ParseSettingsSafe(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, object>();
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, object>>(json)
                       ?? new Dictionary<string, object>();
            }
            catch
            {
                return new Dictionary<string, object>();
            }
        }

        private static string? GetStringSetting(Dictionary<string, object> settings, string key)
        {
            if (!settings.TryGetValue(key, out var value) || value == null) return null;
            if (value is JsonElement je)
            {
                return je.ValueKind == JsonValueKind.String ? je.GetString() : je.ToString();
            }
            return value.ToString();
        }

        [HttpPut("timezone")]
        public async Task<IActionResult> UpdateTimezone([FromBody] UpdateTimezoneRequest request)
        {
            try
            {
                var result = await _tenantService.UpdateTimezoneAsync(request.Timezone);
                
                if (!result)
                {
                    return BadRequest(new { message = "Failed to update timezone" });
                }

                return Ok(new { message = "Timezone updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        /// <summary>
        /// Check if the current tenant has a vertical assigned (for template picker detection).
        /// </summary>
        [HttpGet("has-vertical")]
        public async Task<IActionResult> HasVertical()
        {
            try
            {
                var tenantInfo = _tenantService.GetCurrentTenant();
                if (tenantInfo == null)
                    return NotFound(new { message = "Tenant not found" });

                // Query DB directly to avoid stale cache
                var tenant = await _context.Tenants
                    .Include(t => t.Vertical)
                    .FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);

                if (tenant == null)
                    return NotFound(new { message = "Tenant not found" });

                var hasVertical = tenant.VerticalId != null;
                return Ok(new { hasVertical, verticalCode = tenant.Vertical?.Code ?? "" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Apply a template (vertical) to the current tenant.
        /// Seeds services, categories, employees based on the chosen vertical.
        /// </summary>
        [Authorize]
        [HttpPost("apply-template")]
        public async Task<IActionResult> ApplyTemplate([FromBody] ApplyTemplateRequest request)
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant == null)
                    return NotFound(new { message = "Tenant not found" });

                var success = await _provisioningService.ApplyTemplateAsync(tenant.Id, request.VerticalCode);

                if (!success)
                    return BadRequest(new { success = false, message = "Error aplicando template. Verificá que el tipo de negocio sea válido." });

                // Invalidate tenant cache so the next request gets fresh data
                var host = HttpContext.Request.Host.Value;
                _cache.Remove($"tenant_header_{tenant.Subdomain}");
                _cache.Remove($"tenant_qs_{tenant.Subdomain}");
                _cache.Remove($"tenant_{host}");

                return Ok(new { success = true, message = "Template aplicado correctamente." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class ApplyTemplateRequest
    {
        public string VerticalCode { get; set; } = string.Empty;
    }

    public class UpdateTimezoneRequest
    {
        public string Timezone { get; set; } = string.Empty;
    }

    public class UpdateTenantSettingsRequest
    {
        public string? BusinessName { get; set; }
        public string? Description { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Timezone { get; set; }
        public string? Currency { get; set; }
        public string? Language { get; set; }
        public string? TaxId { get; set; }
    }
}