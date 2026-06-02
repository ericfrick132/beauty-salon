using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BookingPro.API.Data;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Endpoints for the post-register onboarding wizard (/completar-perfil).
    /// Separate from legacy TenantController (`/api/tenant/*`) so the wizard has
    /// its own dedicated PATCH/POST surface under `/api/tenants/current/*`.
    /// </summary>
    [ApiController]
    [Route("api/tenants")]
    public class TenantsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;
        private readonly ITenantProvisioningService _provisioningService;
        private readonly IMemoryCache _cache;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<TenantsController> _logger;

        public TenantsController(
            ApplicationDbContext context,
            ITenantService tenantService,
            ITenantProvisioningService provisioningService,
            IMemoryCache cache,
            IWebHostEnvironment env,
            ILogger<TenantsController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _provisioningService = provisioningService;
            _cache = cache;
            _env = env;
            _logger = logger;
        }

        // Wizard "BusinessKind" values come from src/frontend/src/config/onboardingConfig.ts.
        // Mapping them to vertical codes (matching VerticalSeeders) lets the
        // /completar-perfil flow seed services automatically — so the user
        // never has to answer the same "elegí un template" question twice.
        private static readonly Dictionary<string, string> BusinessKindToVerticalCode =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["barberia"] = "barbershop",
                ["salon_belleza"] = "peluqueria",
                ["estetica"] = "aesthetics",
                ["spa"] = "aesthetics",
                ["manicuria"] = "nailsalon",
                // peluqueria_canina, otro → no auto-seed; user can pick later.
            };

        [Authorize]
        [HttpPatch("current/onboarding")]
        public async Task<IActionResult> UpdateOnboarding([FromBody] OnboardingUpdateDto dto)
        {
            var tenantInfo = _tenantService.GetCurrentTenant();
            if (tenantInfo == null)
                return NotFound(new { message = "Tenant no encontrado" });

            var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);
            if (tenant == null)
                return NotFound(new { message = "Tenant no encontrado" });

            if (!string.IsNullOrWhiteSpace(dto.OwnerName)) tenant.OwnerName = dto.OwnerName.Trim();

            if (!string.IsNullOrWhiteSpace(dto.OwnerBirthday))
            {
                if (DateTime.TryParse(dto.OwnerBirthday, out var bday))
                {
                    tenant.OwnerBirthday = DateTime.SpecifyKind(bday, DateTimeKind.Utc);
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.OwnerPhone)) tenant.OwnerPhone = dto.OwnerPhone.Trim();
            if (dto.OwnerInstagram != null) tenant.OwnerInstagram = string.IsNullOrWhiteSpace(dto.OwnerInstagram) ? null : dto.OwnerInstagram.Trim();
            if (dto.OwnerWeb != null) tenant.OwnerWeb = string.IsNullOrWhiteSpace(dto.OwnerWeb) ? null : dto.OwnerWeb.Trim();

            if (!string.IsNullOrWhiteSpace(dto.BusinessKind)) tenant.BusinessKind = dto.BusinessKind.Trim();
            if (!string.IsNullOrWhiteSpace(dto.BusinessVolume)) tenant.BusinessVolume = dto.BusinessVolume.Trim();
            if (!string.IsNullOrWhiteSpace(dto.BusinessWorkMode)) tenant.BusinessWorkMode = dto.BusinessWorkMode.Trim();

            if (!string.IsNullOrWhiteSpace(dto.ThemeCode)) tenant.ThemeCode = dto.ThemeCode.Trim();
            if (!string.IsNullOrWhiteSpace(dto.PrimaryColor)) tenant.PrimaryColor = dto.PrimaryColor.Trim();
            if (!string.IsNullOrWhiteSpace(dto.SecondaryColor)) tenant.SecondaryColor = dto.SecondaryColor.Trim();
            if (!string.IsNullOrWhiteSpace(dto.LogoUrl)) tenant.LogoUrl = dto.LogoUrl.Trim();

            // Optional web-login credentials. WhatsApp-only accounts start with an empty
            // email + random password; here the user can opt in to email + password so they
            // can also log in from the web. Both must be present to apply.
            if (!string.IsNullOrWhiteSpace(dto.Email) && !string.IsNullOrWhiteSpace(dto.Password))
            {
                var email = dto.Email.Trim().ToLowerInvariant();
                if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^\S+@\S+\.\S+$"))
                    return BadRequest(new { success = false, message = "Email inválido." });
                if (dto.Password.Length < 8)
                    return BadRequest(new { success = false, message = "La contraseña debe tener al menos 8 caracteres." });

                // Email must be globally unique (it's the web-login identity). Allow the
                // current tenant's own admin to keep/update its email.
                var emailTaken = await _context.Users
                    .IgnoreQueryFilters()
                    .AnyAsync(u => u.Email.ToLower() == email && u.TenantId != tenant.Id);
                if (emailTaken)
                    return Conflict(new { success = false, message = "Ya existe una cuenta con este email." });

                var adminUser = await _context.Users
                    .IgnoreQueryFilters()
                    .Where(u => u.TenantId == tenant.Id && u.Role == "admin")
                    .OrderBy(u => u.CreatedAt)
                    .FirstOrDefaultAsync();
                if (adminUser != null)
                {
                    adminUser.Email = email;
                    adminUser.PasswordHash = Services.Security.PasswordHasher.Hash(dto.Password);
                    tenant.OwnerEmail = email;
                }
            }

            tenant.OnboardingCompletedAt = DateTime.UtcNow;
            tenant.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Auto-seed the vertical (services, categories, sample employees) when
            // the chosen BusinessKind maps cleanly to a known vertical. Without this
            // the Dashboard would re-prompt the user with the "Elegí un template"
            // modal even though they just told us in step 2 of the wizard.
            if (tenant.VerticalId == null
                && !string.IsNullOrWhiteSpace(tenant.BusinessKind)
                && BusinessKindToVerticalCode.TryGetValue(tenant.BusinessKind!, out var verticalCode))
            {
                try
                {
                    await _provisioningService.ApplyTemplateAsync(tenant.Id, verticalCode);
                }
                catch (Exception ex)
                {
                    // Seeding is best-effort: if it fails the Dashboard will fall
                    // back to the manual template picker, which is the prior
                    // behaviour. Don't block the wizard's success response.
                    _logger.LogError(ex, "Auto-seeding vertical {VerticalCode} failed for tenant {TenantId}", verticalCode, tenant.Id);
                }
            }

            // Invalidate tenant caches so the next /api/tenant/config read is fresh.
            var host = HttpContext.Request.Host.Value;
            _cache.Remove($"tenant_header_{tenant.Subdomain}");
            _cache.Remove($"tenant_qs_{tenant.Subdomain}");
            _cache.Remove($"tenant_{host}");

            _logger.LogInformation("Onboarding completed for tenant {TenantId}", tenant.Id);

            return Ok(new
            {
                success = true,
                onboardingCompletedAt = tenant.OnboardingCompletedAt,
                logoUrl = tenant.LogoUrl,
            });
        }

        [Authorize]
        [HttpPost("current/logo")]
        [RequestSizeLimit(3 * 1024 * 1024)] // 3 MB safety cap; UI enforces 2 MB.
        public async Task<IActionResult> UploadLogo([FromForm] IFormFile? file)
        {
            var tenantInfo = _tenantService.GetCurrentTenant();
            if (tenantInfo == null)
                return NotFound(new { message = "Tenant no encontrado" });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Archivo vacío" });

            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "image/jpeg", "image/png", "image/webp"
            };
            if (!allowed.Contains(file.ContentType))
                return BadRequest(new { message = "Formato no permitido. Usá JPG, PNG o WEBP." });

            if (file.Length > 2 * 1024 * 1024)
                return BadRequest(new { message = "El logo supera 2 MB." });

            // wwwroot/uploads/tenant-logos/{tenantId}-{timestamp}.ext
            var wwwroot = _env.WebRootPath;
            if (string.IsNullOrEmpty(wwwroot))
            {
                wwwroot = Path.Combine(_env.ContentRootPath, "wwwroot");
            }

            var uploadsDir = Path.Combine(wwwroot, "uploads", "tenant-logos");
            Directory.CreateDirectory(uploadsDir);

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext))
            {
                ext = file.ContentType switch
                {
                    "image/jpeg" => ".jpg",
                    "image/png" => ".png",
                    "image/webp" => ".webp",
                    _ => ".img",
                };
            }

            var fileName = $"{tenantInfo.Id}-{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            await using (var stream = System.IO.File.Create(filePath))
            {
                await file.CopyToAsync(stream);
            }

            var publicUrl = $"/uploads/tenant-logos/{fileName}";

            // Persist to tenant row as well so that subsequent logins pick it up.
            var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);
            if (tenant != null)
            {
                tenant.LogoUrl = publicUrl;
                tenant.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { url = publicUrl });
        }
    }

    public class OnboardingUpdateDto
    {
        public string? OwnerName { get; set; }
        public string? OwnerBirthday { get; set; }  // yyyy-mm-dd
        public string? OwnerPhone { get; set; }
        public string? OwnerInstagram { get; set; }
        public string? OwnerWeb { get; set; }
        public string? BusinessKind { get; set; }
        public string? BusinessVolume { get; set; }
        public string? BusinessWorkMode { get; set; }
        public string? ThemeCode { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SecondaryColor { get; set; }
        public string? LogoUrl { get; set; }
        // Optional web-login credentials captured in onboarding.
        public string? Email { get; set; }
        public string? Password { get; set; }
    }
}
