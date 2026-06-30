using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Cryptography;

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
        private readonly ICouponService _couponService;
        private readonly ILogger<RegistrationController> _logger;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

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
            ICouponService couponService,
            ILogger<RegistrationController> logger,
            IConfiguration config,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _tenantService = tenantService;
            _authService = authService;
            _googleAuthService = googleAuthService;
            _emailService = emailService;
            _couponService = couponService;
            _logger = logger;
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        /// <summary>
        /// Validate a coupon/promo code for a given plan (public — called from the checkout/registration page).
        /// Mirrors GymHero's CheckoutController.ValidateCoupon.
        /// </summary>
        [HttpGet("validate-coupon")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> ValidateCoupon([FromQuery] string code, [FromQuery] string planCode)
        {
            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(planCode))
                return BadRequest(new { isValid = false, message = "Código y plan son requeridos" });

            var result = await _couponService.ValidateCouponAsync(code, planCode);
            return Ok(result);
        }

        /// <summary>
        /// Returns the monthly amount to charge after applying a promo/coupon code (if valid for the
        /// chosen plan). Mirrors GymHero's CheckoutController register flow: a valid coupon replaces
        /// the price with FinalPrice and records the original price + coupon code on the subscription.
        /// Returns the plan price unchanged when there's no plan or no valid code.
        /// </summary>
        private async Task<(decimal monthlyAmount, decimal? originalMonthlyPrice, string? appliedCouponCode)>
            ResolveCouponAsync(SubscriptionPlan? chosenPlan, string? promoCode)
        {
            var monthlyAmount = chosenPlan?.Price ?? 0;
            decimal? originalMonthlyPrice = null;
            string? appliedCouponCode = null;

            if (chosenPlan != null && !string.IsNullOrWhiteSpace(promoCode))
            {
                var couponResult = await _couponService.ValidateCouponAsync(promoCode, chosenPlan.Code);
                if (couponResult.IsValid)
                {
                    originalMonthlyPrice = chosenPlan.Price;
                    monthlyAmount = couponResult.FinalPrice;
                    appliedCouponCode = couponResult.CouponCode;
                }
            }

            return (monthlyAmount, originalMonthlyPrice, appliedCouponCode);
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

                // Apply promo/coupon discount if a valid code was provided for the chosen plan.
                var (couponMonthlyAmount, couponOriginalPrice, appliedCouponCode) =
                    await ResolveCouponAsync(chosenPlan, dto.PromoCode);

                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = chosenPlan?.Code ?? "demo",
                    MonthlyAmount = couponMonthlyAmount,
                    OriginalMonthlyPrice = couponOriginalPrice,
                    AppliedCouponCode = appliedCouponCode,
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

                // Redeem coupon after the subscription is created (mirrors GymHero).
                if (appliedCouponCode != null)
                    await _couponService.RedeemCouponAsync(appliedCouponCode);

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

                // Apply promo/coupon discount if a valid code was provided for the chosen plan.
                var (couponMonthlyAmount, couponOriginalPrice, appliedCouponCode) =
                    await ResolveCouponAsync(chosenPlan, dto.PromoCode);

                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = chosenPlan?.Code ?? "demo",
                    MonthlyAmount = couponMonthlyAmount,
                    OriginalMonthlyPrice = couponOriginalPrice,
                    AppliedCouponCode = appliedCouponCode,
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

                // Redeem coupon after the subscription is created (mirrors GymHero).
                if (appliedCouponCode != null)
                    await _couponService.RedeemCouponAsync(appliedCouponCode);

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
        /// Registro directo desde el bot de WhatsApp: crea la cuenta COMPLETA con {name, email, contactName}.
        /// Genera una password automática y devuelve un link de acceso directo (auto-login con impersonationToken).
        /// El lead nunca completa un formulario: el bot le manda el link y entra al dashboard.
        /// Si el email ya existe, devuelve el link de login (no es error).
        /// Espeja el bot-register de GymHero, adaptado a la arquitectura de TurnosPro (Guid + JWT auto-login).
        /// </summary>
        [HttpPost("bot-register")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> BotRegister([FromBody] BotRegisterDto dto)
        {
            // FAIL-CLOSED: secreto compartido obligatorio. El endpoint es público ([AllowAnonymous]),
            // así que sin esto cualquiera con la URL podría crear tenants infinitos. Si la key de
            // config no está seteada O el header X-Bot-Key no coincide EXACTAMENTE → 401 y no se crea nada.
            var expectedBotKey = _config["BotRegister:Key"];
            var providedBotKey = Request.Headers["X-Bot-Key"].ToString();
            if (string.IsNullOrEmpty(expectedBotKey) || !string.Equals(providedBotKey, expectedBotKey, StringComparison.Ordinal))
            {
                _logger.LogWarning("bot-register: intento rechazado (X-Bot-Key inválida o BotRegister:Key no configurada)");
                return Unauthorized();
            }

            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            try
            {
                var emailLower = dto.Email.Trim().ToLowerInvariant();

                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");

                // Si ya existe una cuenta con este email, devolver el link de login (no es error).
                var existingUser = await _context.Users
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);
                if (existingUser != null)
                {
                    var existingTenant = await _context.Tenants
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(t => t.Id == existingUser.TenantId);
                    if (existingTenant == null)
                        return StatusCode(500, new { success = false, message = "No encontramos tu negocio. Contactanos." });

                    var loginUrl = isLocal
                        ? $"http://{existingTenant.Subdomain}.localhost:3001/login?email={Uri.EscapeDataString(emailLower)}"
                        : $"https://{existingTenant.Subdomain}.turnos-pro.com/login?email={Uri.EscapeDataString(emailLower)}";

                    return Ok(new
                    {
                        success = true,
                        message = "La cuenta ya existía",
                        data = new BotRegisterResponseDto
                        {
                            Success = true,
                            AlreadyExisted = true,
                            Subdomain = existingTenant.Subdomain,
                            BusinessName = existingTenant.BusinessName,
                            AccessUrl = loginUrl
                        }
                    });
                }

                // El bot a veces manda la frase entera (ej "es un salon se llama Glow") como nombre.
                var cleanName = CleanBusinessName(dto.Name);

                // Subdominio a partir del nombre del negocio; de-duplicamos con sufijo numérico si está tomado.
                var baseSubdomain = SanitizeSubdomain(cleanName);
                if (string.IsNullOrEmpty(baseSubdomain) || baseSubdomain.Length < 3)
                    baseSubdomain = "negocio";
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

                // Partir el nombre de contacto (pushName de WhatsApp) en nombre/apellido.
                string firstName;
                string lastName;
                var contact = (dto.ContactName ?? string.Empty).Trim();
                if (!string.IsNullOrWhiteSpace(contact))
                {
                    var parts = contact.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    firstName = parts[0];
                    lastName = parts.Length > 1 ? parts[1] : "";
                }
                else
                {
                    firstName = cleanName;
                    lastName = "";
                }

                // Password aleatoria: el dueño nunca la tipea, entra por el link de auto-login (impersonationToken).
                var generatedPassword = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                    .Replace("+", "").Replace("/", "").Replace("=", "").Substring(0, 12);

                using var transaction = await _context.Database.BeginTransactionAsync();

                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    VerticalId = null, // El vertical se elige luego en onboarding/template picker
                    Subdomain = subdomain,
                    BusinessName = cleanName,
                    OwnerEmail = emailLower,
                    OwnerName = string.IsNullOrWhiteSpace(contact) ? null : contact,
                    SchemaName = $"tenant_{subdomain.Replace("-", "_")}",
                    TimeZone = "America/Argentina/Buenos_Aires",
                    Currency = "ARS",
                    Language = "es",
                    Status = "trial",
                    IsDemo = true,
                    DemoDays = 7,
                    DemoExpiresAt = DateTime.UtcNow.AddDays(7),
                    TrialEndsAt = DateTime.UtcNow.AddDays(7),
                    // NOTA: el entity Tenant de TurnosPro no tiene columnas UTM (a diferencia de GymHero).
                    // El bot puede mandar utmSource/Medium/Campaign, pero sólo se loguean (ver más abajo).
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = emailLower,
                    FirstName = firstName,
                    LastName = lastName,
                    PasswordHash = Services.Security.PasswordHasher.Hash(generatedPassword),
                    Role = "admin",
                    IsActive = true,
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
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // Link de acceso directo: auto-login con impersonationToken (lo consume App.tsx).
                var token = _authService.GenerateJwtToken(adminUser);
                var tenantUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001"
                    : $"https://{subdomain}.turnos-pro.com";
                var accessUrl = $"{tenantUrl}/dashboard?impersonationToken={token}&onboarding=1";

                _logger.LogInformation("bot-register: cuenta creada para {BusinessName} ({Subdomain}) email {Email} — utm {Source}/{Medium}/{Campaign}",
                    cleanName, subdomain, emailLower,
                    dto.UtmSource ?? "whatsapp-bot", dto.UtmMedium ?? "whatsapp", dto.UtmCampaign ?? "chatbot-turnospro");

                return Ok(new
                {
                    success = true,
                    message = "Cuenta creada",
                    data = new BotRegisterResponseDto
                    {
                        Success = true,
                        AlreadyExisted = false,
                        AccessUrl = accessUrl,
                        Subdomain = subdomain,
                        BusinessName = cleanName
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en bot-register para {Name}", dto.Name);
                return StatusCode(500, new { success = false, message = "Error interno. Intentá de nuevo." });
            }
        }

        /// <summary>
        /// Extrae un nombre de negocio limpio de una frase libre del bot
        /// (ej. "es un salon se llama Glow" -> "Glow"). Si queda vacío, usa el texto original.
        /// </summary>
        private static string CleanBusinessName(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "Mi negocio";
            var s = Regex.Replace(raw.Trim(), @"\s+", " ");

            // Si hay un conector "se llama / llamado / se denomina", el nombre es lo que sigue.
            var m = Regex.Match(
                s, @"(?:se\s+llaman?|ll?amad[oa]|se\s+denomina|se\s+dice)\s+(.+)$",
                RegexOptions.IgnoreCase);
            if (m.Success)
            {
                s = m.Groups[1].Value.Trim();
            }
            else
            {
                // Saca un arranque tipo "es un salon ", "mi peluqueria es ", "tengo un estudio ".
                s = Regex.Replace(
                    s, @"^(?:hola[,\s]+)?(?:es|soy|somos|tengo|tenemos|mi|el|la|un|una)\b.*?\b(?:salon|sal[oó]n|peluquer[ií]a|barber[ií]a|estudio|centro|spa|consultorio|negocio|local|clinica|cl[ií]nica)\b\s*(?:es|:|que\s+se\s+llama|se\s+llama)?\s*",
                    "", RegexOptions.IgnoreCase).Trim();
            }

            s = s.Trim(' ', '.', ',', ';', ':', '!', '¡', '?', '¿', '"', '\'', '*');
            if (s.Length < 2) return raw.Trim();

            // Title-case simple.
            var words = s.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(w => char.ToUpperInvariant(w[0]) + (w.Length > 1 ? w.Substring(1) : ""));
            s = string.Join(' ', words);
            return s.Length > 60 ? s.Substring(0, 60).Trim() : s;
        }

        /// <summary>
        /// WhatsApp passwordless step 1: receives only a WhatsApp number and sends a 6-digit OTP
        /// via the platform Evolution instance. The SAME flow serves both signup and login — if
        /// the number already has an account the code logs them in, otherwise it creates one on
        /// verify. No account is created here.
        /// </summary>
        [HttpPost("phone/start")]
        public async Task<IActionResult> PhoneStart([FromBody] PhoneStartDto dto)
        {
            var phone = NormalizePhone(dto.Phone);
            if (phone.Length < 8)
                return BadRequest(new { success = false, message = "Número de WhatsApp inválido." });

            var isExisting = await _context.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Phone == phone);

            var now = DateTime.UtcNow;
            var existing = await _context.PhoneVerifications.FirstOrDefaultAsync(p => p.Phone == phone);

            // Anti-spam: cap resends within the active (non-expired) window.
            if (existing != null && existing.ExpiresAt > now && existing.ConsumedAt == null)
            {
                if (existing.SendCount >= 5)
                    return StatusCode(429, new { success = false, message = "Demasiados intentos. Esperá unos minutos e intentá de nuevo." });
            }

            var code = GenerateOtp();
            var codeHash = Services.Security.PasswordHasher.Hash(code);

            if (existing == null)
            {
                _context.PhoneVerifications.Add(new PhoneVerification
                {
                    Phone = phone,
                    CodeHash = codeHash,
                    ExpiresAt = now.AddMinutes(10),
                    Attempts = 0,
                    SendCount = 1,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            else
            {
                // Reset the window when expired/consumed, otherwise count the resend.
                var windowActive = existing.ExpiresAt > now && existing.ConsumedAt == null;
                existing.CodeHash = codeHash;
                existing.ExpiresAt = now.AddMinutes(10);
                existing.Attempts = 0;
                existing.ConsumedAt = null;
                existing.SendCount = windowActive ? existing.SendCount + 1 : 1;
                existing.UpdatedAt = now;
            }
            await _context.SaveChangesAsync();

            var sent = await SendWhatsAppOtpAsync(phone, code);
            if (!sent)
                return StatusCode(502, new { success = false, message = "No pudimos enviar el código por WhatsApp. Intentá de nuevo." });

            var host = HttpContext.Request.Host.Host;
            var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
            return Ok(new
            {
                success = true,
                message = "Te enviamos un código por WhatsApp.",
                // Lets the UI say "Bienvenido de nuevo" vs "Creá tu cuenta".
                isExisting,
                // Dev-only convenience so we can test without a real WhatsApp.
                devCode = isLocal ? code : null
            });
        }

        /// <summary>
        /// WhatsApp passwordless step 2: verifies the OTP. If the phone already has an account it
        /// logs the user in; otherwise it provisions a new account (tenant + admin user + trial
        /// subscription) with NO email and a temporary subdomain — business name / vertical /
        /// optional email are captured later in onboarding (Dashboard shows the template picker
        /// while VerticalId is null). Either way returns an auto-login redirect URL.
        /// </summary>
        [HttpPost("phone/verify")]
        public async Task<IActionResult> PhoneVerify([FromBody] PhoneVerifyDto dto)
        {
            var phone = NormalizePhone(dto.Phone);
            var code = (dto.Code ?? "").Trim();
            if (phone.Length < 8 || code.Length < 4)
                return BadRequest(new { success = false, message = "Datos inválidos." });

            var now = DateTime.UtcNow;
            var verification = await _context.PhoneVerifications.FirstOrDefaultAsync(p => p.Phone == phone);
            if (verification == null || verification.ConsumedAt != null)
                return BadRequest(new { success = false, message = "Pedí un código nuevo." });

            if (verification.ExpiresAt < now)
                return BadRequest(new { success = false, message = "El código expiró. Pedí uno nuevo." });

            if (verification.Attempts >= 5)
                return BadRequest(new { success = false, message = "Demasiados intentos. Pedí un código nuevo." });

            var (valid, _) = Services.Security.PasswordHasher.Verify(code, verification.CodeHash);
            if (!valid)
            {
                verification.Attempts++;
                verification.UpdatedAt = now;
                await _context.SaveChangesAsync();
                return BadRequest(new { success = false, message = "Código incorrecto." });
            }

            var host = HttpContext.Request.Host.Host;
            var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");

            // --- LOGIN path: the phone already has an account → just issue a token. ---
            var existingUser = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Phone == phone);
            if (existingUser != null)
            {
                var existingTenant = await _context.Tenants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == existingUser.TenantId);
                if (existingTenant == null)
                    return StatusCode(500, new { success = false, message = "No encontramos tu negocio. Contactanos." });

                existingUser.LastLogin = now;
                verification.ConsumedAt = now;
                verification.UpdatedAt = now;
                await _context.SaveChangesAsync();

                var loginToken = _authService.GenerateJwtToken(existingUser);
                var loginTenantUrl = isLocal
                    ? $"http://{existingTenant.Subdomain}.localhost:3001"
                    : $"https://{existingTenant.Subdomain}.turnos-pro.com";
                // Send straight to onboarding if they never picked a vertical, else the dashboard.
                var needsOnboarding = existingTenant.VerticalId == null;
                var loginRedirect = $"{loginTenantUrl}/dashboard?impersonationToken={loginToken}" + (needsOnboarding ? "&onboarding=1" : "");

                _logger.LogInformation("Phone login for {Phone}, tenant {TenantId}", phone, existingTenant.Id);
                return Ok(new
                {
                    success = true,
                    isExisting = true,
                    tenantId = existingTenant.Id,
                    tenantUrl = loginTenantUrl,
                    token = loginToken,
                    redirectUrl = loginRedirect
                });
            }

            // --- SIGNUP path: create a brand-new account. ---
            // No fabricated email: the (Email, TenantId) unique index treats "" as unique per
            // tenant, so an empty email is valid and we never store junk. The real email is
            // optionally captured later in onboarding.
            const string emptyEmail = "";

            // Temporary subdomain derived from the phone; the user picks a real one in onboarding.
            var baseSubdomain = "n" + phone;
            baseSubdomain = SanitizeSubdomain(baseSubdomain);
            if (baseSubdomain.Length < 3) baseSubdomain = "negocio" + phone;
            var subdomain = baseSubdomain;
            var attempt = 1;
            while (await _context.Tenants.AnyAsync(t => t.Subdomain.ToLower() == subdomain.ToLower()))
            {
                attempt++;
                if (attempt > 100)
                    return StatusCode(500, new { success = false, message = "No pudimos generar un subdominio. Intentá de nuevo." });
                subdomain = baseSubdomain + attempt;
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    VerticalId = null, // chosen in onboarding/template picker
                    Subdomain = subdomain,
                    BusinessName = "Mi negocio", // placeholder, set in onboarding
                    OwnerEmail = emptyEmail,
                    OwnerPhone = phone,
                    SchemaName = $"tenant_{subdomain.Replace("-", "_")}",
                    TimeZone = "America/Argentina/Buenos_Aires",
                    Currency = "ARS",
                    Language = "es",
                    Status = "trial",
                    IsDemo = true,
                    DemoDays = 7,
                    DemoExpiresAt = now.AddDays(7),
                    TrialEndsAt = now.AddDays(7),
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // Passwordless account: random unusable password. User can set one later.
                var randomPassword = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = emptyEmail,
                    FirstName = "",
                    LastName = "",
                    Phone = phone,
                    PasswordHash = Services.Security.PasswordHasher.Hash(randomPassword),
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = now,
                    LastLogin = now
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
                    TrialEndsAt = now.AddDays(7),
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.Subscriptions.Add(subscription);

                verification.ConsumedAt = now;
                verification.UpdatedAt = now;
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                var token = _authService.GenerateJwtToken(adminUser);
                var tenantUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001"
                    : $"https://{subdomain}.turnos-pro.com";
                var redirectUrl = $"{tenantUrl}/dashboard?impersonationToken={token}&onboarding=1";

                _logger.LogInformation("Phone registration completed for {Phone}, tenant {TenantId}, subdomain {Subdomain}", phone, tenant.Id, subdomain);

                return Ok(new
                {
                    success = true,
                    isExisting = false,
                    tenantId = tenant.Id,
                    tenantUrl,
                    token,
                    redirectUrl
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error completing phone registration for {Phone}", phone);
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

        /// <summary>
        /// Normalizes an Argentine phone to Evolution API format (549 + area + number), the same
        /// way GymHero's working integration does. We store and send this canonical form so the
        /// uniqueness lookup and the WhatsApp delivery always use the exact same number.
        /// Already-formatted international numbers (starting with 549) are preserved.
        /// </summary>
        private static string NormalizePhone(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
            var digits = Regex.Replace(phone, @"[^0-9]", "");
            if (digits.Length == 0) return digits;
            if (digits.StartsWith("549")) return digits;                 // already 549<area><number>
            if (digits.StartsWith("54") && digits.Length >= 11) return "549" + digits.Substring(2); // 54 sin el 9 móvil
            return "549" + digits;                                       // local (ej 1168078814)
        }

        /// <summary>Cryptographically-random 6-digit code (000000–999999).</summary>
        private static string GenerateOtp()
            => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        /// <summary>
        /// Sends the OTP through the platform-level Evolution (WhatsApp) instance — the same
        /// one TrackingController uses for admin notifications. Returns false on any failure.
        /// </summary>
        private async Task<bool> SendWhatsAppOtpAsync(string phone, string code)
        {
            var evolutionUrl = _config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080";
            var evolutionKey = _config["EVOLUTION_API_KEY"];
            var evolutionInstance = _config["EVOLUTION_API_INSTANCE"];
            if (string.IsNullOrEmpty(evolutionKey) || string.IsNullOrEmpty(evolutionInstance))
            {
                _logger.LogWarning("Evolution API not configured — cannot send OTP to {Phone}", phone);
                return false;
            }

            var msg = $"*TurnosPro* — tu código para entrar es *{code}*.\n\nVence en 10 minutos. No lo compartas con nadie.\n\n👉 entrá en turnos-pro.com y poné tu WhatsApp para usarlo";
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("apikey", evolutionKey);
                var payload = JsonSerializer.Serialize(new { number = phone, text = msg });
                var content = new StringContent(payload, Encoding.UTF8, "application/json");
                var resp = await client.PostAsync($"{evolutionUrl.TrimEnd('/')}/message/sendText/{evolutionInstance}", content);
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Evolution OTP send failed for {Phone}: {Status}", phone, resp.StatusCode);
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Exception sending OTP WhatsApp to {Phone}", phone);
                return false;
            }
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

                // Apply promo/coupon discount if a valid code was provided for the chosen plan.
                var (couponMonthlyAmount, couponOriginalPrice, appliedCouponCode) =
                    await ResolveCouponAsync(chosenPlan, dto.PromoCode);

                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    PlanType = chosenPlan?.Code ?? "demo",
                    MonthlyAmount = couponMonthlyAmount,
                    OriginalMonthlyPrice = couponOriginalPrice,
                    AppliedCouponCode = appliedCouponCode,
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

                // Redeem coupon after the subscription is created (mirrors GymHero).
                if (appliedCouponCode != null)
                    await _couponService.RedeemCouponAsync(appliedCouponCode);

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

        /// <summary>Código promocional opcional. Si es válido para el plan elegido, descuenta el precio.</summary>
        public string? PromoCode { get; set; }
    }

    /// <summary>Payload del bot de WhatsApp para crear una cuenta de tenant automáticamente.</summary>
    public class BotRegisterDto
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El nombre del negocio es requerido")]
        [System.ComponentModel.DataAnnotations.StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El email es requerido")]
        [System.ComponentModel.DataAnnotations.EmailAddress(ErrorMessage = "Formato de email inválido")]
        [System.ComponentModel.DataAnnotations.StringLength(255, ErrorMessage = "El email no puede exceder 255 caracteres")]
        public string Email { get; set; } = string.Empty;

        /// <summary>Nombre de contacto (ej: pushName de WhatsApp). Se parte en nombre/apellido.</summary>
        [System.ComponentModel.DataAnnotations.StringLength(150)]
        public string? ContactName { get; set; }

        [System.ComponentModel.DataAnnotations.StringLength(100)]
        public string? UtmSource { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(100)]
        public string? UtmMedium { get; set; }
        [System.ComponentModel.DataAnnotations.StringLength(200)]
        public string? UtmCampaign { get; set; }
    }

    /// <summary>Respuesta de bot-register: cuenta creada + link de acceso directo (auto-login).</summary>
    public class BotRegisterResponseDto
    {
        public bool Success { get; set; }
        public bool AlreadyExisted { get; set; }
        public string AccessUrl { get; set; } = string.Empty;
        public string Subdomain { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
    }

    public class PhoneStartDto
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El WhatsApp es requerido")]
        public string Phone { get; set; } = string.Empty;
    }

    public class PhoneVerifyDto
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El WhatsApp es requerido")]
        public string Phone { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El código es requerido")]
        public string Code { get; set; } = string.Empty;
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

        /// <summary>Código promocional opcional. Si es válido para el plan elegido, descuenta el precio.</summary>
        public string? PromoCode { get; set; }
    }
}
