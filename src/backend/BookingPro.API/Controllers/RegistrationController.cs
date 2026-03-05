using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using System.Text.RegularExpressions;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/registration")]
    public class RegistrationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly ILogger<RegistrationController> _logger;

        private readonly HashSet<string> _reservedSubdomains = new(StringComparer.OrdinalIgnoreCase)
        {
            "www", "api", "admin", "app", "mail", "email", "ftp", "blog", "shop", "store",
            "support", "help", "docs", "dev", "test", "staging", "prod", "production",
            "cdn", "static", "assets", "images", "media", "files", "download", "upload",
            "secure", "ssl", "vpn", "remote", "proxy", "gateway", "router", "firewall",
            "database", "db", "redis", "cache", "queue", "worker", "cron", "backup",
            "monitor", "stats", "analytics", "metrics", "health", "status", "ping"
        };

        public RegistrationController(
            ApplicationDbContext context,
            ITenantService tenantService,
            IAuthService authService,
            IEmailService emailService,
            ILogger<RegistrationController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _authService = authService;
            _emailService = emailService;
            _logger = logger;
        }

        /// <summary>
        /// Step 1: Start registration - receives email + password, creates PendingRegistration, "sends" confirmation email.
        /// </summary>
        [HttpPost("start")]
        public async Task<IActionResult> Start([FromBody] RegistrationStartDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            try
            {
                var emailLower = dto.Email.Trim().ToLowerInvariant();

                // Check email not already used by a User
                var emailExistsInUsers = await _context.Users
                    .IgnoreQueryFilters()
                    .AnyAsync(u => u.Email.ToLower() == emailLower);

                if (emailExistsInUsers)
                    return BadRequest(new { success = false, message = "Ya existe una cuenta con este email." });

                // Check for existing pending registration - if exists and not confirmed, update it
                var existingPending = await _context.PendingRegistrations
                    .FirstOrDefaultAsync(p => p.Email == emailLower);

                if (existingPending != null)
                {
                    if (existingPending.IsConfirmed)
                        return BadRequest(new { success = false, message = "Este email ya fue confirmado. Usa el link de confirmación para continuar el registro." });

                    // Update existing pending registration
                    existingPending.PasswordHash = Services.Security.PasswordHasher.Hash(dto.Password);
                    existingPending.RememberToken = Guid.NewGuid().ToString("N");
                    existingPending.ExpiresAt = DateTime.UtcNow.AddHours(24);
                    existingPending.CreatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new pending registration
                    var pending = new PendingRegistration
                    {
                        Email = emailLower,
                        PasswordHash = Services.Security.PasswordHasher.Hash(dto.Password),
                        RememberToken = Guid.NewGuid().ToString("N"),
                        ExpiresAt = DateTime.UtcNow.AddHours(24),
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.PendingRegistrations.Add(pending);
                    existingPending = pending;
                }

                await _context.SaveChangesAsync();

                // Build confirmation link
                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
                var baseUrl = isLocal
                    ? $"http://localhost:3001"
                    : "https://www.turnos-pro.com";
                var confirmUrl = $"{baseUrl}/register/confirm?token={existingPending.RememberToken}";

                // Send confirmation email
                try
                {
                    await _emailService.SendConfirmationEmailAsync(emailLower, confirmUrl);
                }
                catch (Exception emailEx)
                {
                    _logger.LogError(emailEx, "Failed to send confirmation email to {Email}", emailLower);
                    // Still log the link as fallback
                    _logger.LogInformation("=== REGISTRATION CONFIRMATION LINK (email failed) ===");
                    _logger.LogInformation("Link: {ConfirmUrl}", confirmUrl);
                    _logger.LogInformation("=====================================================");
                }

                return Ok(new
                {
                    success = true,
                    message = "Te enviamos un email de confirmación. Revisá tu bandeja de entrada.",
                    // In dev, also return the token for convenience
                    devToken = isLocal ? existingPending.RememberToken : null,
                    devConfirmUrl = isLocal ? confirmUrl : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting registration for {Email}", dto.Email);
                return StatusCode(500, new { success = false, message = "Error interno. Por favor intentá nuevamente." });
            }
        }

        /// <summary>
        /// Step 2: Verify token from confirmation email.
        /// </summary>
        [HttpGet("verify/{token}")]
        public async Task<IActionResult> Verify(string token)
        {
            try
            {
                var pending = await _context.PendingRegistrations
                    .FirstOrDefaultAsync(p => p.RememberToken == token);

                if (pending == null)
                    return BadRequest(new { success = false, message = "Token inválido o expirado." });

                if (pending.ExpiresAt < DateTime.UtcNow)
                    return BadRequest(new { success = false, message = "El link de confirmación ha expirado. Registrate nuevamente." });

                if (!pending.IsConfirmed)
                {
                    pending.IsConfirmed = true;
                    pending.ConfirmedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, email = pending.Email });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying token {Token}", token);
                return StatusCode(500, new { success = false, message = "Error interno." });
            }
        }

        /// <summary>
        /// Step 3: Complete registration - creates tenant and admin user.
        /// </summary>
        [HttpPost("complete")]
        public async Task<IActionResult> Complete([FromBody] RegistrationCompleteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            try
            {
                // Find and validate pending registration
                var pending = await _context.PendingRegistrations
                    .FirstOrDefaultAsync(p => p.RememberToken == dto.RememberToken);

                if (pending == null)
                    return BadRequest(new { success = false, message = "Token inválido." });

                if (!pending.IsConfirmed)
                    return BadRequest(new { success = false, message = "Email no confirmado. Revisá tu bandeja de entrada." });

                if (pending.ExpiresAt < DateTime.UtcNow)
                    return BadRequest(new { success = false, message = "El token ha expirado. Registrate nuevamente." });

                // Validate subdomain
                var subdomain = SanitizeSubdomain(dto.Subdomain);
                if (string.IsNullOrEmpty(subdomain) || subdomain.Length < 3)
                    return BadRequest(new { success = false, message = "El subdominio debe tener al menos 3 caracteres." });

                if (_reservedSubdomains.Contains(subdomain))
                    return BadRequest(new { success = false, message = "Este subdominio está reservado." });

                var subdomainExists = await _context.Tenants
                    .AnyAsync(t => t.Subdomain.ToLower() == subdomain.ToLower());

                if (subdomainExists)
                    return BadRequest(new { success = false, message = "Este subdominio ya está en uso." });

                // Create tenant WITHOUT vertical (will be chosen in template picker)
                var createDto = new CreateTenantDto
                {
                    VerticalCode = null, // No vertical yet - chosen in onboarding
                    Subdomain = subdomain,
                    BusinessName = dto.BusinessName,
                    BusinessAddress = dto.BusinessAddress,
                    AdminEmail = pending.Email,
                    AdminFirstName = dto.BusinessName, // Use business name as first name for now
                    AdminLastName = "",
                    AdminPhone = dto.Mobile,
                    AdminPassword = "temp", // Will be overridden below
                    TimeZone = "America/Argentina/Buenos_Aires",
                    Currency = "ARS",
                    Language = "es",
                    IsDemo = true,
                    DemoDays = 7,
                    PlanId = null
                };

                // Create tenant using existing service but we need to handle the password separately
                // since we already have the hashed password from PendingRegistration
                using var transaction = await _context.Database.BeginTransactionAsync();

                var tenantId = Guid.NewGuid();
                var tenant = new Tenant
                {
                    Id = tenantId,
                    VerticalId = null, // No vertical - chosen later in template picker
                    Subdomain = subdomain,
                    BusinessName = dto.BusinessName,
                    BusinessAddress = dto.BusinessAddress,
                    OwnerEmail = pending.Email,
                    OwnerPhone = dto.Mobile,
                    SchemaName = $"tenant_{subdomain.Replace("-", "_")}",
                    TimeZone = "America/Argentina/Buenos_Aires",
                    Currency = "ARS",
                    Language = "es",
                    Status = "trial",
                    IsDemo = true,
                    DemoDays = 7,
                    DemoExpiresAt = DateTime.UtcNow.AddDays(7),
                    TrialEndsAt = DateTime.UtcNow.AddDays(7),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // Create admin user with the password from PendingRegistration
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = pending.Email,
                    FirstName = dto.BusinessName,
                    LastName = "",
                    Phone = dto.Mobile,
                    PasswordHash = pending.PasswordHash, // Use the already-hashed password
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    LastLogin = DateTime.UtcNow
                };

                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                // Create trial subscription
                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = "demo",
                    MonthlyAmount = 0,
                    Status = "trial",
                    IsTrialPeriod = true,
                    TrialEndsAt = DateTime.UtcNow.AddDays(7),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // Generate JWT for auto-login
                var token = _authService.GenerateJwtToken(adminUser);

                // Build tenant URL
                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
                var tenantUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001"
                    : $"https://{subdomain}.turnos-pro.com";

                var redirectUrl = $"{tenantUrl}/dashboard?impersonationToken={token}";

                _logger.LogInformation("Registration completed for {Email}, tenant {TenantId}, subdomain {Subdomain}", pending.Email, tenant.Id, subdomain);

                return Ok(new
                {
                    success = true,
                    tenantId = tenant.Id,
                    tenantUrl,
                    token,
                    redirectUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing registration");
                return StatusCode(500, new { success = false, message = "Error interno. Por favor intentá nuevamente." });
            }
        }

        /// <summary>
        /// Check subdomain availability.
        /// </summary>
        [HttpGet("check-subdomain/{subdomain}")]
        public async Task<IActionResult> CheckSubdomain(string subdomain)
        {
            try
            {
                subdomain = SanitizeSubdomain(subdomain);

                if (string.IsNullOrEmpty(subdomain) || subdomain.Length < 3)
                    return Ok(new { available = false, message = "El subdominio debe tener al menos 3 caracteres" });

                if (_reservedSubdomains.Contains(subdomain))
                    return Ok(new { available = false, message = "Este subdominio está reservado" });

                var exists = await _context.Tenants
                    .AnyAsync(t => t.Subdomain.ToLower() == subdomain.ToLower());

                if (exists)
                    return Ok(new { available = false, message = "Este subdominio ya está en uso" });

                return Ok(new { available = true, message = "Subdominio disponible" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking subdomain {Subdomain}", subdomain);
                return Ok(new { available = false, message = "Error verificando disponibilidad" });
            }
        }

        private string SanitizeSubdomain(string subdomain)
        {
            if (string.IsNullOrEmpty(subdomain)) return string.Empty;
            return Regex.Replace(subdomain.ToLowerInvariant(), @"[^a-z0-9-]", "");
        }
    }

    // DTOs for the new registration flow
    public class RegistrationStartDto
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El email es requerido")]
        [System.ComponentModel.DataAnnotations.EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "La contraseña es requerida")]
        [System.ComponentModel.DataAnnotations.MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres")]
        public string Password { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Confirmá la contraseña")]
        [System.ComponentModel.DataAnnotations.Compare("Password", ErrorMessage = "Las contraseñas no coinciden")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class RegistrationCompleteDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string RememberToken { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El subdominio es requerido")]
        [System.ComponentModel.DataAnnotations.MinLength(3)]
        public string Subdomain { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El nombre del negocio es requerido")]
        public string BusinessName { get; set; } = string.Empty;

        public string? BusinessAddress { get; set; }
        public string? Phone { get; set; }
        public string? Website { get; set; }

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El celular es requerido")]
        public string Mobile { get; set; } = string.Empty;
    }
}
