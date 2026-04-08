using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookingPro.API.Services;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace BookingPro.API.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "super_admin")]
    public class TenantManagementController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvisioningService _tenantProvisioning;
        private readonly IAuthService _authService;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public TenantManagementController(
            ApplicationDbContext context,
            ITenantProvisioningService tenantProvisioning,
            IAuthService authService,
            IConfiguration config,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _tenantProvisioning = tenantProvisioning;
            _authService = authService;
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("provision")]
        public async Task<IActionResult> ProvisionNewTenant([FromBody] ProvisionTenantDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // 1. Validar subdomain disponible
                var isAvailable = await CheckSubdomainAvailabilityAsync(dto.Subdomain, dto.VerticalCode);
                
                if (!isAvailable)
                {
                    return BadRequest(new { message = "Subdomain not available" });
                }

                // 2. Obtener vertical
                var vertical = await _context.Verticals
                    .FirstOrDefaultAsync(v => v.Code == dto.VerticalCode);
                
                if (vertical == null)
                {
                    return BadRequest(new { message = "Vertical not found" });
                }

                // 3. Crear tenant
                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    VerticalId = vertical.Id,
                    Subdomain = dto.Subdomain,
                    BusinessName = dto.BusinessName,
                    OwnerEmail = dto.OwnerEmail,
                    OwnerPhone = dto.OwnerPhone,
                    SchemaName = $"tenant_{Guid.NewGuid().ToString().Replace("-", "_")}",
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // 4. Crear schema en la base de datos
                var schemaName = $"{dto.VerticalCode}_{dto.Subdomain}_{tenant.Id.ToString().Substring(0, 8)}".ToLower();
                tenant.SchemaName = schemaName;
                await _context.SaveChangesAsync();
                await _tenantProvisioning.ProvisionNewTenantAsync(tenant.Id);

                // 5. Crear usuario admin para el tenant
                var tempPassword = GenerateTemporaryPassword();
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = dto.OwnerEmail,
                    PasswordHash = BookingPro.API.Services.Security.PasswordHasher.Hash(tempPassword),
                    FirstName = dto.AdminFirstName ?? "Admin",
                    LastName = dto.AdminLastName ?? tenant.BusinessName,
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    tenantId = tenant.Id,
                    accessUrl = $"https://{dto.Subdomain}.{vertical.Domain}",
                    schemaName = tenant.SchemaName,
                    message = "Tenant created successfully",
                    adminCredentials = new
                    {
                        email = dto.OwnerEmail,
                        password = tempPassword,
                        note = "Please change this password on first login"
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("check-subdomain")]
        public async Task<IActionResult> CheckSubdomainAvailability(
            [FromQuery] string subdomain, 
            [FromQuery] string verticalCode)
        {
            var isAvailable = await CheckSubdomainAvailabilityAsync(subdomain, verticalCode);
            return Ok(new { isAvailable });
        }

        [HttpGet("tenants")]
        public async Task<IActionResult> GetTenants(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.Tenants
                .Include(t => t.Vertical)
                .OrderByDescending(t => t.CreatedAt);

            var totalItems = await query.CountAsync();
            var tenants = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    id = t.Id,
                    subdomain = t.Subdomain,
                    businessName = t.BusinessName,
                    ownerEmail = t.OwnerEmail,
                    vertical = t.Vertical.Name,
                    status = t.Status,
                    createdAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                data = tenants,
                totalItems,
                totalPages = (int)Math.Ceiling((double)totalItems / pageSize),
                currentPage = page,
                pageSize
            });
        }

        private async Task<bool> CheckSubdomainAvailabilityAsync(string subdomain, string verticalCode)
        {
            return !await _context.Tenants
                .AnyAsync(t => t.Subdomain == subdomain && t.Vertical.Code == verticalCode);
        }

        private string GenerateTemporaryPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
            var random = new Random();
            var password = new string(Enumerable.Repeat(chars, 12)
                .Select(s => s[random.Next(s.Length)]).ToArray());
            
            // Asegurar que tenga al menos una mayúscula, una minúscula, un número y un símbolo
            if (!password.Any(char.IsUpper))
                password = "A" + password.Substring(1);
            if (!password.Any(char.IsLower))
                password = password.Substring(0, 1) + "a" + password.Substring(2);
            if (!password.Any(char.IsDigit))
                password = password.Substring(0, 2) + "2" + password.Substring(3);
            if (!password.Any(c => "!@#$".Contains(c)))
                password = password.Substring(0, 3) + "!" + password.Substring(4);
                
            return password;
        }

        // Password hashing centralized in Services.Security.PasswordHasher
    }

    public class ProvisionTenantDto
    {
        public string Subdomain { get; set; } = string.Empty;
        public string VerticalCode { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
        public string OwnerEmail { get; set; } = string.Empty;
        public string? OwnerPhone { get; set; }
        public string? AdminFirstName { get; set; }
        public string? AdminLastName { get; set; }
    }

    [ApiController]
    [Route("api/admin/tracking")]
    [Authorize(Roles = "super_admin")]
    public class TrackingStatsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TrackingStatsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetTrackingStats([FromQuery] int days = 30)
        {
            var since = DateTime.UtcNow.AddDays(-days);

            var events = await _context.TrackingEvents
                .Where(e => e.CreatedAt >= since)
                .ToListAsync();

            var dailyStats = events
                .GroupBy(e => e.CreatedAt.Date)
                .OrderByDescending(g => g.Key)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    pageViews = g.Count(e => e.EventType == "PageView"),
                    leads = g.Count(e => e.EventType == "Lead"),
                    checkouts = g.Count(e => e.EventType == "InitiateCheckout"),
                    registrations = g.Count(e => e.EventType == "CompleteRegistration")
                })
                .ToList();

            var byCampaign = events
                .Where(e => !string.IsNullOrEmpty(e.UtmCampaign))
                .GroupBy(e => e.UtmCampaign)
                .Select(g => new
                {
                    campaign = g.Key,
                    pageViews = g.Count(e => e.EventType == "PageView"),
                    leads = g.Count(e => e.EventType == "Lead"),
                    checkouts = g.Count(e => e.EventType == "InitiateCheckout"),
                    registrations = g.Count(e => e.EventType == "CompleteRegistration")
                })
                .OrderByDescending(x => x.registrations)
                .ToList();

            var bySource = events
                .Where(e => !string.IsNullOrEmpty(e.UtmSource))
                .GroupBy(e => e.UtmSource)
                .Select(g => new
                {
                    source = g.Key,
                    pageViews = g.Count(e => e.EventType == "PageView"),
                    registrations = g.Count(e => e.EventType == "CompleteRegistration")
                })
                .OrderByDescending(x => x.pageViews)
                .ToList();

            var totals = new
            {
                pageViews = events.Count(e => e.EventType == "PageView"),
                leads = events.Count(e => e.EventType == "Lead"),
                checkouts = events.Count(e => e.EventType == "InitiateCheckout"),
                registrations = events.Count(e => e.EventType == "CompleteRegistration")
            };

            var recentLeads = events
                .Where(e => e.EventType is "Lead" or "CompleteRegistration" or "InitiateCheckout")
                .OrderByDescending(e => e.CreatedAt)
                .Take(50)
                .Select(e => new
                {
                    id = e.Id,
                    eventType = e.EventType,
                    name = e.Name,
                    email = e.Email,
                    phone = e.Phone,
                    planName = e.PlanName,
                    campaign = e.UtmCampaign,
                    source = e.UtmSource,
                    device = e.Device,
                    createdAt = e.CreatedAt
                })
                .ToList();

            return Ok(new { totals, daily = dailyStats, byCampaign, bySource, recentLeads });
        }

        private static readonly string[] AllEventTypes = { "PageView", "OpenRegister", "Lead", "InitiateCheckout", "CompleteRegistration" };

        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotificationSettings()
        {
            var settings = await _context.NotificationSettings.ToListAsync();
            var result = AllEventTypes.Select(et =>
            {
                var s = settings.FirstOrDefault(x => x.EventType == et);
                return new
                {
                    eventType = et,
                    whatsAppEnabled = s?.WhatsAppEnabled ?? (et is "Lead" or "CompleteRegistration"),
                    followUpWhatsAppEnabled = s?.FollowUpWhatsAppEnabled ?? false,
                    followUpWhatsAppMessage = s?.FollowUpWhatsAppMessage,
                    followUpEmailEnabled = s?.FollowUpEmailEnabled ?? false,
                    followUpEmailTemplateKey = s?.FollowUpEmailTemplateKey,
                    followUpDelayMinutes = s?.FollowUpDelayMinutes ?? 0
                };
            });
            return Ok(result);
        }

        [HttpPost("notifications")]
        public async Task<IActionResult> UpdateNotificationSettings([FromBody] List<NotifSettingsDto> updates)
        {
            foreach (var u in updates)
            {
                var existing = await _context.NotificationSettings.FirstOrDefaultAsync(s => s.EventType == u.EventType);
                if (existing != null)
                {
                    existing.WhatsAppEnabled = u.WhatsAppEnabled;
                    existing.FollowUpWhatsAppEnabled = u.FollowUpWhatsAppEnabled;
                    existing.FollowUpWhatsAppMessage = u.FollowUpWhatsAppMessage;
                    existing.FollowUpEmailEnabled = u.FollowUpEmailEnabled;
                    existing.FollowUpEmailTemplateKey = u.FollowUpEmailTemplateKey;
                    existing.FollowUpDelayMinutes = u.FollowUpDelayMinutes;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.NotificationSettings.Add(new NotificationSettings
                    {
                        EventType = u.EventType,
                        WhatsAppEnabled = u.WhatsAppEnabled,
                        FollowUpWhatsAppEnabled = u.FollowUpWhatsAppEnabled,
                        FollowUpWhatsAppMessage = u.FollowUpWhatsAppMessage,
                        FollowUpEmailEnabled = u.FollowUpEmailEnabled,
                        FollowUpEmailTemplateKey = u.FollowUpEmailTemplateKey,
                        FollowUpDelayMinutes = u.FollowUpDelayMinutes
                    });
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ── SuperAdmin WhatsApp (Evolution API) ─────────────────────────

        private string EvolutionUrl => (_config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080").TrimEnd('/');
        private string? EvolutionKey => _config["EVOLUTION_API_KEY"];
        private string? EvolutionInstance => _config["EVOLUTION_API_INSTANCE"];

        [HttpGet("whatsapp/status")]
        public async Task<IActionResult> GetWhatsAppStatus()
        {
            if (string.IsNullOrEmpty(EvolutionKey) || string.IsNullOrEmpty(EvolutionInstance))
                return Ok(new { connected = false, message = "Evolution API not configured" });
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", EvolutionKey);
                var res = await client.GetAsync($"{EvolutionUrl}/instance/connectionState/{EvolutionInstance}");
                var body = await res.Content.ReadAsStringAsync();
                var json = System.Text.Json.JsonDocument.Parse(body);
                var state = json.RootElement.TryGetProperty("instance", out var inst)
                    ? inst.GetProperty("state").GetString()
                    : json.RootElement.GetProperty("state").GetString();
                return Ok(new { connected = state == "open", state, instance = EvolutionInstance });
            }
            catch (Exception ex)
            {
                return Ok(new { connected = false, message = ex.Message });
            }
        }

        [HttpPost("whatsapp/connect")]
        public async Task<IActionResult> ConnectWhatsApp()
        {
            if (string.IsNullOrEmpty(EvolutionKey) || string.IsNullOrEmpty(EvolutionInstance))
                return BadRequest(new { error = "Evolution API not configured" });
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", EvolutionKey);
                // Try to get QR code for existing instance
                var res = await client.GetAsync($"{EvolutionUrl}/instance/connect/{EvolutionInstance}");
                var body = await res.Content.ReadAsStringAsync();
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        public class NotifSettingsDto
        {
            public string EventType { get; set; } = string.Empty;
            public bool WhatsAppEnabled { get; set; }
            public bool FollowUpWhatsAppEnabled { get; set; }
            public string? FollowUpWhatsAppMessage { get; set; }
            public bool FollowUpEmailEnabled { get; set; }
            public string? FollowUpEmailTemplateKey { get; set; }
            public int FollowUpDelayMinutes { get; set; }
        }
    }
}
