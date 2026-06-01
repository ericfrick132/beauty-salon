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
        private readonly IGoogleAuthService _googleAuthService;
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
            IGoogleAuthService googleAuthService,
            IEmailService emailService,
            ILogger<RegistrationController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _authService = authService;
            _googleAuthService = googleAuthService;
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

                // Resolve chosen plan (if any). Default to trial demo otherwise.
                var chosenPlan = !string.IsNullOrWhiteSpace(dto.PlanCode)
                    ? await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == dto.PlanCode && p.IsActive)
                    : null;

                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = chosenPlan?.Code ?? "demo",
                    MonthlyAmount = chosenPlan?.Price ?? 0,
                    Status = "trial",
                    IsTrialPeriod = true,
                    TrialEndsAt = DateTime.UtcNow.AddDays(chosenPlan?.TrialDays > 0 ? chosenPlan.TrialDays : 7),
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
        /// One-step registration: creates Tenant + admin User + trial Subscription in a single
        /// transaction, returns a JWT for auto-login. Confirmation email is sent ASYNC after the
        /// fact and is purely informational — it does NOT gate dashboard access.
        ///
        /// This is the GymHero-style funnel: low friction, instant access. The legacy
        /// /start → /verify → /complete endpoints are kept for backward compatibility with
        /// users that already received an email link from the old flow.
        /// </summary>
        [HttpPost("quick")]
        public async Task<IActionResult> Quick([FromBody] RegistrationQuickDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            try
            {
                var emailLower = dto.Email.Trim().ToLowerInvariant();

                // Email uniqueness — must not collide with any existing user.
                var emailExists = await _context.Users
                    .IgnoreQueryFilters()
                    .AnyAsync(u => u.Email.ToLower() == emailLower);
                if (emailExists)
                    return BadRequest(new { success = false, message = "Ya existe una cuenta con este email." });

                // Auto-generate subdomain from business name. Sanitize and ensure uniqueness
                // by appending an incrementing suffix when taken (max 100 attempts to be safe).
                var baseSubdomain = SanitizeSubdomain(dto.BusinessName);
                if (string.IsNullOrEmpty(baseSubdomain) || baseSubdomain.Length < 3)
                    return BadRequest(new { success = false, message = "El nombre del negocio no es válido para generar un subdominio." });

                var subdomain = baseSubdomain;
                if (_reservedSubdomains.Contains(subdomain))
                    subdomain = baseSubdomain + "1";

                var attempt = 1;
                while (await _context.Tenants.AnyAsync(t => t.Subdomain.ToLower() == subdomain.ToLower()))
                {
                    attempt++;
                    if (attempt > 100)
                        return StatusCode(500, new { success = false, message = "No pudimos generar un subdominio único. Probá con otro nombre." });
                    subdomain = baseSubdomain + attempt;
                }

                using var transaction = await _context.Database.BeginTransactionAsync();

                var tenantId = Guid.NewGuid();
                var tenant = new Tenant
                {
                    Id = tenantId,
                    VerticalId = null, // Vertical chosen later in onboarding/template picker
                    Subdomain = subdomain,
                    BusinessName = dto.BusinessName.Trim(),
                    OwnerEmail = emailLower,
                    OwnerPhone = dto.Mobile,
                    OwnerName = string.IsNullOrWhiteSpace(dto.FullName) ? null : dto.FullName.Trim(),
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

                // Split fullName into FirstName/LastName so the post-signup
                // onboarding wizard can prefill "Tu nombre" instead of asking
                // for it again. Fallback to BusinessName preserves the previous
                // behavior for older clients that don't send fullName.
                string firstName;
                string lastName;
                var fullName = dto.FullName?.Trim();
                if (!string.IsNullOrWhiteSpace(fullName))
                {
                    var parts = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    firstName = parts[0];
                    lastName = parts.Length > 1 ? parts[1] : "";
                }
                else
                {
                    firstName = dto.BusinessName.Trim();
                    lastName = "";
                }

                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = emailLower,
                    FirstName = firstName,
                    LastName = lastName,
                    Phone = dto.Mobile,
                    PasswordHash = Services.Security.PasswordHasher.Hash(dto.Password),
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    LastLogin = DateTime.UtcNow
                };
                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                var chosenPlan = !string.IsNullOrWhiteSpace(dto.PlanCode)
                    ? await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == dto.PlanCode && p.IsActive)
                    : null;

                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = chosenPlan?.Code ?? "demo",
                    MonthlyAmount = chosenPlan?.Price ?? 0,
                    Status = "trial",
                    IsTrialPeriod = true,
                    TrialEndsAt = DateTime.UtcNow.AddDays(chosenPlan?.TrialDays > 0 ? chosenPlan.TrialDays : 7),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                var token = _authService.GenerateJwtToken(adminUser);
                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
                var tenantUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001"
                    : $"https://{subdomain}.turnos-pro.com";
                var redirectUrl = $"{tenantUrl}/dashboard?impersonationToken={token}";

                // Fire-and-forget welcome email. Reuses SendConfirmationEmailAsync but points
                // to the auto-login dashboard URL instead of a gating confirmation page.
                // If sending fails the registration still succeeds — email is informational only.
                var emailSvc = _emailService;
                var welcomeUrl = redirectUrl;
                _ = Task.Run(async () =>
                {
                    try { await emailSvc.SendConfirmationEmailAsync(emailLower, welcomeUrl); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Failed to send welcome email to {Email}", emailLower); }
                });

                _logger.LogInformation("Quick registration completed for {Email}, tenant {TenantId}, subdomain {Subdomain}", emailLower, tenant.Id, subdomain);

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
                _logger.LogError(ex, "Error in quick registration for {Email}", dto.Email);
                return StatusCode(500, new { success = false, message = "Error interno. Por favor intentá nuevamente." });
            }
        }

        /// <summary>
        /// Registro SIN contraseña (magic link), paso 1. Recibe los datos del
        /// negocio y envía un email con un enlace que crea la cuenta y deja a la
        /// persona logueada. No pedimos contraseña porque inventar/tipear una en
        /// el navegador in-app de Instagram (sin gestor de contraseñas ni
        /// autocompletado) es el mayor punto de abandono del registro.
        /// </summary>
        [HttpPost("passwordless/start")]
        public async Task<IActionResult> PasswordlessStart([FromBody] PasswordlessStartDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            try
            {
                var emailLower = dto.Email.Trim().ToLowerInvariant();

                var emailExists = await _context.Users
                    .IgnoreQueryFilters()
                    .AnyAsync(u => u.Email.ToLower() == emailLower);
                if (emailExists)
                    return BadRequest(new { success = false, message = "Ya existe una cuenta con este email. Iniciá sesión." });

                // Validamos temprano que el nombre del negocio sirva como subdominio,
                // así no enviamos un email que después no se va a poder completar.
                var baseSubdomain = SanitizeSubdomain(dto.BusinessName);
                if (string.IsNullOrEmpty(baseSubdomain) || baseSubdomain.Length < 3)
                    return BadRequest(new { success = false, message = "El nombre del negocio no es válido para generar tu link." });

                var existingPending = await _context.PendingRegistrations
                    .FirstOrDefaultAsync(p => p.Email == emailLower);
                if (existingPending != null && existingPending.IsConfirmed)
                    return BadRequest(new { success = false, message = "Este email ya fue confirmado. Revisá el enlace que te enviamos." });

                var token = Guid.NewGuid().ToString("N");
                if (existingPending != null)
                {
                    existingPending.PasswordHash = string.Empty;
                    existingPending.IsPasswordless = true;
                    existingPending.BusinessName = dto.BusinessName.Trim();
                    existingPending.FullName = string.IsNullOrWhiteSpace(dto.FullName) ? null : dto.FullName.Trim();
                    existingPending.Mobile = dto.Mobile.Trim();
                    existingPending.RememberToken = token;
                    existingPending.ExpiresAt = DateTime.UtcNow.AddHours(24);
                    existingPending.CreatedAt = DateTime.UtcNow;
                }
                else
                {
                    existingPending = new PendingRegistration
                    {
                        Email = emailLower,
                        PasswordHash = string.Empty,
                        IsPasswordless = true,
                        BusinessName = dto.BusinessName.Trim(),
                        FullName = string.IsNullOrWhiteSpace(dto.FullName) ? null : dto.FullName.Trim(),
                        Mobile = dto.Mobile.Trim(),
                        RememberToken = token,
                        ExpiresAt = DateTime.UtcNow.AddHours(24),
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.PendingRegistrations.Add(existingPending);
                }
                await _context.SaveChangesAsync();

                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
                // El enlace apunta al backend: al abrirlo crea la cuenta y redirige ya logueado.
                var apiBase = $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";
                var magicUrl = $"{apiBase}/api/registration/passwordless/complete?token={token}";

                try
                {
                    await _emailService.SendConfirmationEmailAsync(emailLower, magicUrl);
                }
                catch (Exception emailEx)
                {
                    _logger.LogError(emailEx, "Failed to send passwordless magic link to {Email}", emailLower);
                    _logger.LogInformation("=== MAGIC LINK (email failed) === {MagicUrl}", magicUrl);
                }

                return Ok(new
                {
                    success = true,
                    message = "Te enviamos un email con un enlace para activar tu cuenta. Revisá tu casilla.",
                    devMagicUrl = isLocal ? magicUrl : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in passwordless start for {Email}", dto.Email);
                return StatusCode(500, new { success = false, message = "Error interno. Por favor intentá nuevamente." });
            }
        }

        /// <summary>
        /// Registro SIN contraseña (magic link), paso 2. La persona abre el enlace
        /// del email: creamos tenant + usuario (contraseña aleatoria,
        /// MustSetPassword=true) y la redirigimos al dashboard ya logueada.
        /// Idempotente: si el enlace ya se usó, simplemente reloguea al usuario.
        /// </summary>
        [HttpGet("passwordless/complete")]
        public async Task<IActionResult> PasswordlessComplete([FromQuery] string token)
        {
            var host = HttpContext.Request.Host.Host;
            var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
            string LoginFallback(string error) => (isLocal ? "http://localhost:3001" : "https://www.turnos-pro.com") + $"/login?error={error}";

            if (string.IsNullOrWhiteSpace(token))
                return Redirect(LoginFallback("invalid_link"));

            try
            {
                var pending = await _context.PendingRegistrations
                    .FirstOrDefaultAsync(p => p.RememberToken == token && p.IsPasswordless);
                if (pending == null)
                    return Redirect(LoginFallback("invalid_link"));

                var emailLower = pending.Email.Trim().ToLowerInvariant();

                // Idempotencia: si el usuario ya existe (enlace abierto dos veces),
                // reemitimos el token y lo mandamos a su dashboard.
                var existingUser = await _context.Users
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
                if (existingUser != null)
                {
                    var existingTenant = await _context.Tenants.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(t => t.Id == existingUser.TenantId);
                    var existingSub = existingTenant?.Subdomain ?? "";
                    var existingUrl = isLocal ? $"http://{existingSub}.localhost:3001" : $"https://{existingSub}.turnos-pro.com";
                    var existingJwt = _authService.GenerateJwtToken(existingUser);
                    return Redirect($"{existingUrl}/dashboard?impersonationToken={existingJwt}");
                }

                if (pending.ExpiresAt < DateTime.UtcNow)
                    return Redirect(LoginFallback("expired_link"));

                var baseSubdomain = SanitizeSubdomain(pending.BusinessName ?? "");
                if (string.IsNullOrEmpty(baseSubdomain) || baseSubdomain.Length < 3)
                    return Redirect(LoginFallback("invalid_business"));

                var subdomain = baseSubdomain;
                if (_reservedSubdomains.Contains(subdomain))
                    subdomain = baseSubdomain + "1";
                var attempt = 1;
                while (await _context.Tenants.AnyAsync(t => t.Subdomain.ToLower() == subdomain.ToLower()))
                {
                    attempt++;
                    if (attempt > 100)
                        return Redirect(LoginFallback("subdomain"));
                    subdomain = baseSubdomain + attempt;
                }

                using var transaction = await _context.Database.BeginTransactionAsync();

                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    VerticalId = null,
                    Subdomain = subdomain,
                    BusinessName = (pending.BusinessName ?? "").Trim(),
                    OwnerEmail = emailLower,
                    OwnerPhone = pending.Mobile,
                    OwnerName = string.IsNullOrWhiteSpace(pending.FullName) ? null : pending.FullName!.Trim(),
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

                string firstName;
                string lastName;
                var fullName = pending.FullName?.Trim();
                if (!string.IsNullOrWhiteSpace(fullName))
                {
                    var parts = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    firstName = parts[0];
                    lastName = parts.Length > 1 ? parts[1] : "";
                }
                else
                {
                    firstName = (pending.BusinessName ?? "").Trim();
                    lastName = "";
                }

                // Contraseña aleatoria inutilizable: la persona define la suya en
                // el primer ingreso (gracias a MustSetPassword).
                var randomPassword = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = emailLower,
                    FirstName = firstName,
                    LastName = lastName,
                    Phone = pending.Mobile,
                    PasswordHash = Services.Security.PasswordHasher.Hash(randomPassword),
                    Role = "admin",
                    IsActive = true,
                    MustSetPassword = true,
                    CreatedAt = DateTime.UtcNow,
                    LastLogin = DateTime.UtcNow
                };
                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

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

                pending.IsConfirmed = true;
                pending.ConfirmedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                var jwt = _authService.GenerateJwtToken(adminUser);
                var tenantUrl = isLocal ? $"http://{subdomain}.localhost:3001" : $"https://{subdomain}.turnos-pro.com";

                _logger.LogInformation("Passwordless registration completed for {Email}, tenant {TenantId}, subdomain {Subdomain}", emailLower, tenant.Id, subdomain);

                return Redirect($"{tenantUrl}/dashboard?impersonationToken={jwt}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing passwordless registration");
                return Redirect(LoginFallback("server"));
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

        /// <summary>
        /// Signup con Google: verifica el ID token, crea tenant + admin user + trial subscription
        /// en una sola transacción. Retorna JWT para auto-login.
        /// </summary>
        [HttpPost("google-register")]
        public async Task<IActionResult> GoogleRegister([FromBody] GoogleRegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            var googleUser = await _googleAuthService.VerifyIdTokenAsync(dto.IdToken);
            if (googleUser == null || string.IsNullOrEmpty(googleUser.Email) || !googleUser.EmailVerified)
                return BadRequest(new { success = false, message = "Token de Google inválido o email no verificado" });

            var email = googleUser.Email.ToLowerInvariant();

            // Reject if the email already has an account anywhere.
            var existingUser = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);
            if (existingUser != null)
            {
                return Conflict(new
                {
                    success = false,
                    code = "EMAIL_EXISTS",
                    message = "Ya existe una cuenta con este email. Inicia sesión con Google.",
                });
            }

            // Subdomain checks
            var subdomain = SanitizeSubdomain(dto.Subdomain);
            if (string.IsNullOrEmpty(subdomain) || subdomain.Length < 3)
                return BadRequest(new { success = false, message = "El subdominio debe tener al menos 3 caracteres." });
            if (_reservedSubdomains.Contains(subdomain))
                return BadRequest(new { success = false, message = "Este subdominio está reservado." });
            var subdomainExists = await _context.Tenants.AnyAsync(t => t.Subdomain.ToLower() == subdomain.ToLower());
            if (subdomainExists)
                return BadRequest(new { success = false, message = "Este subdominio ya está en uso." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var tenantId = Guid.NewGuid();
                var tenant = new Tenant
                {
                    Id = tenantId,
                    VerticalId = null,
                    Subdomain = subdomain,
                    BusinessName = dto.BusinessName,
                    BusinessAddress = dto.BusinessAddress,
                    OwnerEmail = email,
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

                // Random unusable password — Google-only login
                var randomPassword = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = email,
                    FirstName = string.IsNullOrWhiteSpace(googleUser.GivenName) ? dto.BusinessName : googleUser.GivenName,
                    LastName = googleUser.FamilyName ?? string.Empty,
                    Phone = dto.Mobile,
                    PasswordHash = BookingPro.API.Services.Security.PasswordHasher.Hash(randomPassword),
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    LastLogin = DateTime.UtcNow
                };
                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                var chosenPlan = !string.IsNullOrWhiteSpace(dto.PlanCode)
                    ? await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == dto.PlanCode && p.IsActive)
                    : null;

                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = chosenPlan?.Code ?? "demo",
                    MonthlyAmount = chosenPlan?.Price ?? 0,
                    Status = "trial",
                    IsTrialPeriod = true,
                    TrialEndsAt = DateTime.UtcNow.AddDays(chosenPlan?.TrialDays > 0 ? chosenPlan.TrialDays : 7),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                var token = _authService.GenerateJwtToken(adminUser);
                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
                var tenantUrl = isLocal ? $"http://{subdomain}.localhost:3001" : $"https://{subdomain}.turnos-pro.com";
                var redirectUrl = $"{tenantUrl}/dashboard?impersonationToken={token}";

                _logger.LogInformation("Google registration completed for {Email}, tenant {TenantId}, subdomain {Subdomain}", email, tenant.Id, subdomain);

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
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error during google-register for {Email}", email);
                return StatusCode(500, new { success = false, message = "Error interno. Por favor intentá nuevamente." });
            }
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

    public class RegistrationQuickDto
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El email es requerido")]
        [System.ComponentModel.DataAnnotations.EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "La contraseña es requerida")]
        [System.ComponentModel.DataAnnotations.MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres")]
        public string Password { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El nombre del negocio es requerido")]
        [System.ComponentModel.DataAnnotations.MinLength(2, ErrorMessage = "El nombre del negocio es muy corto")]
        public string BusinessName { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El celular es requerido")]
        public string Mobile { get; set; } = string.Empty;

        public string? PlanCode { get; set; }

        public string? FullName { get; set; }
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

        // Plan elegido por el usuario en el signup flow. Si es null, se usa "demo" con 7 días trial.
        public string? PlanCode { get; set; }
    }

    public class PasswordlessStartDto
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El nombre del negocio es requerido")]
        [System.ComponentModel.DataAnnotations.MinLength(2, ErrorMessage = "El nombre del negocio es muy corto")]
        public string BusinessName { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El email es requerido")]
        [System.ComponentModel.DataAnnotations.EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El celular es requerido")]
        public string Mobile { get; set; } = string.Empty;

        public string? FullName { get; set; }
    }
}
