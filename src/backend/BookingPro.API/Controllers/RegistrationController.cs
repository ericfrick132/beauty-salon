using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using System.Globalization;
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
        private readonly IAppleAuthService _appleAuthService;
        private readonly IEmailService _emailService;
        private readonly ICouponService _couponService;
        private readonly ILogger<RegistrationController> _logger;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMetaAttributionEnricher _attributionEnricher;

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
            IAppleAuthService appleAuthService,
            IEmailService emailService,
            ICouponService couponService,
            ILogger<RegistrationController> logger,
            IConfiguration config,
            IHttpClientFactory httpClientFactory,
            IMetaAttributionEnricher attributionEnricher)
        {
            _attributionEnricher = attributionEnricher;
            _context = context;
            _tenantService = tenantService;
            _authService = authService;
            _googleAuthService = googleAuthService;
            _appleAuthService = appleAuthService;
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
                // utm_* / fbclid / utm_content ({{ad.id}}) que el frontend capturó al aterrizar desde el anuncio.
                MetaAttribution.Apply(tenant, dto, "web");

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
                // Sin id de anuncio en el alta → sales-hub puede tenerlo (CTWA / form de leads con este teléfono).
                if (!MetaAttribution.HasAdAttribution(tenant)) _attributionEnricher.Enqueue(tenant.Id);

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
                // utm_* / fbclid / utm_content ({{ad.id}}) que el frontend capturó al aterrizar desde el anuncio.
                MetaAttribution.Apply(tenant, dto, "web");
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
                // Sin id de anuncio en el alta → sales-hub puede tenerlo (CTWA / form de leads con este teléfono).
                if (!MetaAttribution.HasAdAttribution(tenant)) _attributionEnricher.Enqueue(tenant.Id);

                var token = _authService.GenerateJwtToken(adminUser);
                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
                var tenantUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001"
                    : $"https://{subdomain}.turnos-pro.com";
                // Cuenta nueva: la prueba gratis arranca dejando la tarjeta en Mercado Pago (free_trial),
                // así que el primer destino es /empezar; de ahí sigue al onboarding.
                var redirectUrl = $"{tenantUrl}/empezar?nuevo=1&impersonationToken={token}";

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

                // Si ya existe una cuenta con este email, devolver un link de ACCESO REAL (no es error).
                // OJO: antes devolvía /login?email=... pelado — pero el lead del bot nunca eligió
                // contraseña, así que quedaba con una cuenta a la que no podía entrar. Ahora esta
                // rama también emite el auto-login con impersonationToken, igual que la cuenta nueva.
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

                    // El lead del bot nunca eligió contraseña, así que no podemos mandarle una que
                    // sirva sin resetearla. Generamos una fresca y la ponemos en el link — mismo
                    // patrón que GymHero. Al ser una cuenta creada por el bot no rompemos nada.
                    var freshPassword = GenerateBotPassword();
                    existingUser.PasswordHash = Services.Security.PasswordHasher.Hash(freshPassword);
                    await _context.SaveChangesAsync();

                    var existingBase = isLocal
                        ? $"http://{existingTenant.Subdomain}.localhost:3001"
                        : $"https://{existingTenant.Subdomain}.turnos-pro.com";
                    var loginUrl = $"{existingBase}/login?email={Uri.EscapeDataString(emailLower)}&password={Uri.EscapeDataString(freshPassword)}";

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

                // Password aleatoria: el dueño no la elige; le llega prellenada en el link de /login.
                var generatedPassword = GenerateBotPassword();

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
                    UtmSource = dto.UtmSource ?? "whatsapp-bot",
                    UtmMedium = dto.UtmMedium ?? "whatsapp",
                    UtmCampaign = dto.UtmCampaign ?? "chatbot-turnospro",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                // sales-hub manda el id del anuncio / ctwa_clid del lead (CTWA o form de leads) → columnas del tenant.
                MetaAttribution.Apply(tenant, dto,
                    dto.AttributionSource ?? (dto.CtwaClid != null ? "ctwa" : dto.MetaAdId != null ? "leadgen" : "hub"));
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
                // utm_* / fbclid / utm_content ({{ad.id}}) que el frontend capturó al aterrizar desde el anuncio.
                MetaAttribution.Apply(tenant, dto, "web");
                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                // Sin id de anuncio en el alta → sales-hub puede tenerlo (CTWA / form de leads con este teléfono).
                if (!MetaAttribution.HasAdAttribution(tenant)) _attributionEnricher.Enqueue(tenant.Id);

                // Link de acceso directo con email + contraseña en la query: la página /login
                // los prefila y el dueño solo toca "entrar". Es una cuenta privada creada por el
                // bot (la contraseña la generamos nosotros), así que mandarla en el link es
                // aceptable — mismo patrón que GymHero. El impersonationToken quedó deprecado
                // (no lo consumía App.tsx de forma confiable → el lead no podía entrar).
                var tenantUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001"
                    : $"https://{subdomain}.turnos-pro.com";
                var accessUrl = $"{tenantUrl}/login?email={Uri.EscapeDataString(emailLower)}&password={Uri.EscapeDataString(generatedPassword)}";

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
        /// Contraseña aleatoria para cuentas creadas por el bot: el dueño no la elige, le llega
        /// prellenada en el link de /login. 12 chars alfanuméricos (sin +/= para que viaje limpia
        /// en la query string).
        /// </summary>
        private static string GenerateBotPassword()
            => Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                .Replace("+", "").Replace("/", "").Replace("=", "").Substring(0, 12);

        /// <summary>
        /// Saludos/respuestas basura que el bot a veces pasa como nombre de negocio
        /// ("hola", "ok", "test"...). Si el nombre limpio cae acá, usamos el fallback.
        /// </summary>
        private static readonly HashSet<string> _junkBusinessNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "hola", "holis", "hello", "hey", "ola", "buenas", "buenass", "buen dia",
            "buenos dias", "buenas tardes", "buenas noches", "que tal", "si", "sí", "no",
            "ok", "dale", "gracias", "test", "prueba", "asd", "asdasd", "jaja", "jeje",
            "xd", "na", "n/a", "no se", "no sé", "ninguno", "ninguna", "nada"
        };

        /// <summary>
        /// True si el candidato a nombre es un saludo/basura de la lista (match exacto,
        /// case-insensitive) o si tiene menos de 3 letras reales.
        /// </summary>
        private static bool IsJunkBusinessName(string name)
        {
            if (_junkBusinessNames.Contains(name.Trim())) return true;
            return name.Count(char.IsLetter) < 3;
        }

        /// <summary>
        /// Extrae un nombre de negocio limpio de una frase libre del bot
        /// (ej. "es un salon se llama Glow" -> "Glow"). Si queda vacío, usa el texto original.
        /// Si el resultado es un saludo/basura, cae al fallback "Mi negocio".
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
            if (s.Length < 2)
            {
                var fallback = raw.Trim();
                return IsJunkBusinessName(fallback) ? "Mi negocio" : fallback;
            }
            if (IsJunkBusinessName(s)) return "Mi negocio";

            // Title-case simple.
            var words = s.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(w => char.ToUpperInvariant(w[0]) + (w.Length > 1 ? w.Substring(1) : ""));
            s = string.Join(' ', words);
            return s.Length > 60 ? s.Substring(0, 60).Trim() : s;
        }

        /// <summary>
        /// Passwordless por EMAIL, paso 1: manda un código de 6 dígitos por mail. El MISMO flujo sirve
        /// para alta y login: si el email ya tiene cuenta el código la loguea, si no, se crea la cuenta al
        /// verificar. Acá no se crea nada. Se llama de dos formas:
        ///  - con { email, businessName?, phone?, atribución } desde el formulario (landing o /register);
        ///  - con { state } desde la página del código para reenviar: la fila se resuelve por el token.
        /// Devuelve `state`, el token opaco de la transacción que viaja en /register?s=... y en el link
        /// del mail (el email no va en la URL).
        /// </summary>
        [HttpPost("email/start")]
        public async Task<IActionResult> EmailStart([FromBody] EmailStartDto dto)
        {
            var now = DateTime.UtcNow;
            var stateParam = (dto.State ?? string.Empty).Trim();
            EmailVerification? existing;
            string email;
            if (stateParam.Length > 0)
            {
                existing = await _context.EmailVerifications.FirstOrDefaultAsync(v => v.StateToken == stateParam);
                if (existing == null || existing.ConsumedAt != null)
                    return NotFound(new { success = false, message = "Este link ya no es válido. Pedí un código nuevo." });
                email = existing.Email;
            }
            else
            {
                email = NormalizeEmail(dto.Email);
                if (!IsValidEmail(email))
                    return BadRequest(new { success = false, message = "Email inválido." });
                existing = await _context.EmailVerifications.FirstOrDefaultAsync(v => v.Email == email);
            }

            var isExisting = await FindExistingUserByEmailAsync(email) != null;

            // Nombre del negocio, WhatsApp y atribución del formulario: viajan en la fila de verificación
            // para que el tenant se cree ya con ellos al verificar (y el onboarding no los vuelva a
            // pedir). Un reenvío sin estos campos no pisa lo que ya había.
            var businessName = CleanOptionalBusinessName(dto.BusinessName);
            var phone = NormalizePhone(dto.Phone);
            var attributionJson = SerializeAttribution(dto);

            // Anti-spam: tope de reenvíos dentro de la ventana activa (no vencida).
            var windowActive = existing != null && existing.ExpiresAt > now && existing.ConsumedAt == null;
            if (windowActive && existing!.SendCount >= 5)
                return StatusCode(429, new { success = false, message = "Demasiados intentos. Esperá unos minutos e intentá de nuevo." });

            // El token se conserva mientras la ventana siga activa (el link del mail anterior sigue
            // valiendo); si la ventana venció o es una fila nueva, se genera uno nuevo.
            var stateToken = windowActive && !string.IsNullOrEmpty(existing!.StateToken)
                ? existing.StateToken!
                : GenerateStateToken();

            var code = GenerateOtp();
            var codeHash = Services.Security.PasswordHasher.Hash(code);

            var host = HttpContext.Request.Host;
            var isLocal = host.Host.Contains("localhost") || host.Host.StartsWith("127.") || host.Host.StartsWith("0.0.0.0");
            // /register?s=<state> abre la página del código en la app con la transacción resuelta.
            var loginUrl = (isLocal ? $"http://{host.Value}" : "https://turnos-pro.com") + "/register?s=" + Uri.EscapeDataString(stateToken);

            // El envío va ANTES de pisar la fila: si guardáramos el hash nuevo y el mail fallara,
            // el código anterior (el único que la persona tiene en su casilla) quedaría muerto.
            try
            {
                await _emailService.SendLoginCodeAsync(email, code, loginUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo enviar el código de acceso por email a {Email}", email);
                return StatusCode(502, new { success = false, message = "No pudimos enviar el código por email. Revisá la dirección e intentá de nuevo." });
            }

            if (existing == null)
            {
                _context.EmailVerifications.Add(new EmailVerification
                {
                    Email = email,
                    CodeHash = codeHash,
                    ExpiresAt = now.AddMinutes(10),
                    Attempts = 0,
                    SendCount = 1,
                    BusinessName = businessName,
                    Phone = phone,
                    StateToken = stateToken,
                    AttributionJson = attributionJson,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
            else
            {
                // Reinicia la ventana si venció/se consumió; si no, cuenta el reenvío.
                existing.CodeHash = codeHash;
                existing.ExpiresAt = now.AddMinutes(10);
                existing.Attempts = 0;
                existing.ConsumedAt = null;
                existing.SendCount = windowActive ? existing.SendCount + 1 : 1;
                existing.StateToken = stateToken;
                if (businessName != null) existing.BusinessName = businessName;
                if (phone != null) existing.Phone = phone;
                if (attributionJson != null) existing.AttributionJson = attributionJson;
                existing.UpdatedAt = now;
            }
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Te enviamos un código a tu email.",
                // Para que la UI diga "Bienvenido de nuevo" vs "Creá tu cuenta".
                isExisting,
                state = stateToken,
                email,
                // Solo en local, para probar sin casilla real.
                devCode = isLocal ? code : null
            });
        }

        /// <summary>
        /// Resuelve una transacción de alta por su token (/register?s=...): email para mostrar, si la
        /// cuenta ya existía y el nombre del negocio cargado. 404 si el token no existe o ya se consumió.
        /// </summary>
        [HttpGet("email/state/{state}")]
        public async Task<IActionResult> EmailState(string state)
        {
            var token = (state ?? string.Empty).Trim();
            if (token.Length < 16)
                return NotFound(new { success = false, message = "Este link ya no es válido. Pedí un código nuevo." });

            var verification = await _context.EmailVerifications.FirstOrDefaultAsync(v => v.StateToken == token);
            if (verification == null || verification.ConsumedAt != null)
                return NotFound(new { success = false, message = "Este link ya no es válido. Pedí un código nuevo." });

            var isExisting = await FindExistingUserByEmailAsync(verification.Email) != null;
            return Ok(new
            {
                success = true,
                email = verification.Email,
                isExisting,
                businessName = verification.BusinessName,
                expired = verification.ExpiresAt < DateTime.UtcNow
            });
        }

        /// <summary>
        /// Passwordless por EMAIL, paso 2: verifica el código. Si el email ya tiene cuenta la
        /// loguea; si no, provisiona una cuenta nueva (tenant + admin + trial) con ese email más el
        /// nombre del negocio y el WhatsApp que el formulario mandó en email/start (si vinieron: el
        /// subdominio sale del nombre; si no, de la parte local del email y el nombre queda como
        /// placeholder). El rubro se elige después en el onboarding (el Dashboard muestra el selector
        /// de template mientras VerticalId es null). En ambos casos devuelve una URL de auto-login.
        /// </summary>
        [HttpPost("email/verify")]
        public async Task<IActionResult> EmailVerify([FromBody] EmailVerifyDto dto)
        {
            var code = (dto.Code ?? "").Trim();
            var stateParam = (dto.State ?? string.Empty).Trim();
            var email = NormalizeEmail(dto.Email);
            if (code.Length < 4 || (stateParam.Length == 0 && !IsValidEmail(email)))
                return BadRequest(new { success = false, message = "Datos inválidos." });

            var now = DateTime.UtcNow;
            // Por state (página /register?s=...) o, como fallback de mails viejos, por email.
            var verification = stateParam.Length > 0
                ? await _context.EmailVerifications.FirstOrDefaultAsync(v => v.StateToken == stateParam)
                : await _context.EmailVerifications.FirstOrDefaultAsync(v => v.Email == email);
            if (verification == null || verification.ConsumedAt != null)
                return BadRequest(new { success = false, message = "Pedí un código nuevo." });
            email = verification.Email;

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

            // --- LOGIN: el email ya tiene cuenta → solo emitimos el token. ---
            var existingUser = await FindExistingUserByEmailAsync(email);
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
                // Directo al onboarding si nunca eligió rubro; si no, al dashboard.
                var needsOnboarding = existingTenant.VerticalId == null;
                var loginRedirect = $"{loginTenantUrl}/dashboard?impersonationToken={loginToken}" + (needsOnboarding ? "&onboarding=1" : "");

                _logger.LogInformation("Email code login for {Email}, tenant {TenantId}", email, existingTenant.Id);
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

            // --- ALTA: cuenta nueva. ---
            // Subdominio derivado del nombre del negocio (si el formulario lo mandó) o, si no, de la
            // parte local del email; el usuario puede cambiarlo en el onboarding. Si queda corto o es
            // reservado, va uno genérico con sufijo aleatorio.
            var signupBusinessName = verification.BusinessName;
            var signupPhone = verification.Phone;
            var baseSubdomain = SanitizeSubdomain(signupBusinessName ?? string.Empty);
            if (baseSubdomain.Length < 3) baseSubdomain = SanitizeSubdomain(email.Split('@')[0]);
            if (baseSubdomain.Length < 3 || _reservedSubdomains.Contains(baseSubdomain))
                baseSubdomain = "negocio" + RandomNumberGenerator.GetInt32(1000, 10000);
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
                    VerticalId = null, // se elige en el onboarding / selector de template
                    Subdomain = subdomain,
                    BusinessName = signupBusinessName ?? "Mi negocio", // placeholder si el form no lo trajo; se completa en el onboarding
                    OwnerEmail = email,
                    OwnerPhone = signupPhone, // null si el form no lo trajo → el onboarding lo pide
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
                // Atribución: la del body si trae algo; si no, la que email/start guardó en la
                // transacción (la página del código puede no tener el sessionStorage de la landing).
                IMetaAttributionSource attribution = HasAnyAttribution(dto)
                    ? dto
                    : (IMetaAttributionSource?)DeserializeAttribution(verification.AttributionJson) ?? dto;
                MetaAttribution.Apply(tenant, attribution, "web");
                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // Cuenta passwordless: contraseña aleatoria inutilizable. Puede definir una después.
                var randomPassword = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = email,
                    FirstName = "",
                    LastName = "",
                    Phone = signupPhone,
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
                // Sin id de anuncio en el alta → sales-hub puede tenerlo (form de leads con este email).
                if (!MetaAttribution.HasAdAttribution(tenant)) _attributionEnricher.Enqueue(tenant.Id);

                var token = _authService.GenerateJwtToken(adminUser);
                var tenantUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001"
                    : $"https://{subdomain}.turnos-pro.com";
                // Cuenta nueva: primero /empezar (tarjeta día 0 con free_trial de MP), después el
                // onboarding (/completar-perfil) y recién ahí el panel.
                var redirectUrl = $"{tenantUrl}/empezar?nuevo=1&impersonationToken={token}";

                _logger.LogInformation("Email code registration completed for {Email}, tenant {TenantId}, subdomain {Subdomain}, businessName {BusinessName}, phone {HasPhone}",
                    email, tenant.Id, subdomain, tenant.BusinessName, signupPhone != null);

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
                _logger.LogError(ex, "Error completing email code registration for {Email}", email);
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

        /// <summary>
        /// Slugifica el nombre para usarlo de subdominio: baja acentos a ASCII ("Peña" -> "pena")
        /// en vez de borrarlos, y convierte espacios/símbolos en guiones ("Glow Studio" ->
        /// "glow-studio") en vez de pegar las palabras. Tope de 40 caracteres.
        /// </summary>
        private string SanitizeSubdomain(string subdomain)
        {
            if (string.IsNullOrWhiteSpace(subdomain)) return string.Empty;

            // Descomponer (FormD) y descartar las marcas diacríticas para quedarnos con la base ASCII.
            var decomposed = subdomain.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(decomposed.Length);
            foreach (var c in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            var s = sb.ToString().Normalize(NormalizationForm.FormC);

            // Cada corrida de caracteres no alfanuméricos se vuelve un guion; sin guiones dobles ni en los bordes.
            s = Regex.Replace(s, @"[^a-z0-9]+", "-");
            s = Regex.Replace(s, @"-{2,}", "-").Trim('-');
            if (s.Length > 40) s = s.Substring(0, 40).Trim('-');
            return s;
        }

        /// <summary>
        /// Nombre del negocio opcional del formulario de alta: limpio y truncado con CleanBusinessName;
        /// null si no vino o si era basura (CleanBusinessName lo reemplaza por el placeholder).
        /// </summary>
        private static string? CleanOptionalBusinessName(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var cleaned = CleanBusinessName(raw);
            return cleaned == "Mi negocio" ? null : cleaned;
        }

        /// <summary>
        /// WhatsApp del formulario de alta a formato "+&lt;país&gt;&lt;número&gt;" (solo dígitos tras el +).
        /// Si viene con prefijo internacional ("+54 11 ..."), se respeta el país; si viene sin "+", se
        /// asume Argentina. Para Argentina se inserta el 9 de móvil si falta (54 11... → 549 11...),
        /// que es como WhatsApp identifica el número. Devuelve null si no parece un teléfono.
        /// </summary>
        private static string? NormalizePhone(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var international = raw.TrimStart().StartsWith("+");
            var digits = Regex.Replace(raw, "[^0-9]", "");
            if (!international)
            {
                digits = digits.TrimStart('0'); // "011 2345 6789" → "1123456789"
                if (digits.Length < 8) return null;
                digits = "54" + digits;
            }
            if (digits.StartsWith("54") && !digits.StartsWith("549") && digits.Length >= 12)
                digits = "549" + digits.Substring(2);
            if (digits.Length < 9 || digits.Length > 16) return null;
            return "+" + digits;
        }

        /// <summary>Token opaco de transacción: 32 bytes aleatorios en base64url (43 chars, sin padding).</summary>
        private static string GenerateStateToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        private static bool HasAnyAttribution(IMetaAttributionSource s) =>
            !string.IsNullOrWhiteSpace(s.UtmSource) || !string.IsNullOrWhiteSpace(s.UtmMedium)
            || !string.IsNullOrWhiteSpace(s.UtmCampaign) || !string.IsNullOrWhiteSpace(s.UtmContent)
            || !string.IsNullOrWhiteSpace(s.Fbclid) || !string.IsNullOrWhiteSpace(s.Fbp)
            || !string.IsNullOrWhiteSpace(s.CtwaClid) || !string.IsNullOrWhiteSpace(s.MetaAdId)
            || !string.IsNullOrWhiteSpace(s.MetaAdsetId) || !string.IsNullOrWhiteSpace(s.MetaCampaignId);

        /// <summary>Atribución del start serializada para la fila de verificación; null si no trajo nada.</summary>
        private static string? SerializeAttribution(IMetaAttributionSource s)
        {
            if (!HasAnyAttribution(s)) return null;
            return JsonSerializer.Serialize(new MetaAttributionDto
            {
                UtmSource = s.UtmSource, UtmMedium = s.UtmMedium, UtmCampaign = s.UtmCampaign, UtmContent = s.UtmContent,
                Fbclid = s.Fbclid, Fbp = s.Fbp, CtwaClid = s.CtwaClid,
                MetaAdId = s.MetaAdId, MetaAdsetId = s.MetaAdsetId, MetaCampaignId = s.MetaCampaignId,
                Source = "web"
            });
        }

        private static MetaAttributionDto? DeserializeAttribution(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try { return JsonSerializer.Deserialize<MetaAttributionDto>(json); }
            catch { return null; }
        }

        /// <summary>Email normalizado: trim + minúsculas (es la clave de la verificación y del login).</summary>
        private static string NormalizeEmail(string? email)
            => (email ?? string.Empty).Trim().ToLowerInvariant();

        private static bool IsValidEmail(string email)
            => email.Length >= 5 && email.Length <= 254 && Regex.IsMatch(email, @"^\S+@\S+\.\S+$");

        /// <summary>
        /// Busca la cuenta existente dueña de este email, sin filtro de tenant. El índice único es
        /// (Email, TenantId), así que el mismo email puede vivir en más de un tenant: priorizamos el
        /// admin y, entre varios, el que entró más recientemente.
        /// </summary>
        private async Task<User?> FindExistingUserByEmailAsync(string email)
            => await _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.IsActive && u.Email.ToLower() == email)
                .OrderByDescending(u => u.Role == "admin")
                .ThenByDescending(u => u.LastLogin ?? DateTime.MinValue)
                .FirstOrDefaultAsync();

        /// <summary>Cryptographically-random 6-digit code (000000–999999).</summary>
        private static string GenerateOtp()
            => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

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

            return await SocialRegisterAsync(dto, googleUser.Email, googleUser.GivenName, googleUser.FamilyName, "google");
        }

        /// <summary>
        /// Signup con Sign in with Apple (apps iOS). Mismo alta que google-register:
        /// tenant + admin user + trial en una transacción. Apple manda el nombre una
        /// sola vez y fuera del token, por eso viene en el DTO.
        /// </summary>
        [HttpPost("apple-register")]
        public async Task<IActionResult> AppleRegister([FromBody] AppleRegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            var appleUser = await _appleAuthService.VerifyIdentityTokenAsync(dto.IdentityToken);
            if (appleUser == null || string.IsNullOrEmpty(appleUser.Email))
                return BadRequest(new { success = false, message = "Token de Apple inválido" });

            return await SocialRegisterAsync(dto, appleUser.Email, dto.FirstName, dto.LastName, "apple", appleUser.Subject);
        }

        /// <summary>
        /// Alta compartida por los signups sociales: valida email/subdominio y crea
        /// tenant + admin + suscripción trial. El proveedor ya verificó la identidad.
        /// </summary>
        private async Task<IActionResult> SocialRegisterAsync(SocialRegisterDto dto, string verifiedEmail,
            string? givenName, string? familyName, string provider, string? appleUserId = null)
        {
            var email = verifiedEmail.ToLowerInvariant();

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
                    message = $"Ya existe una cuenta con este email. Inicia sesión con {(provider == "apple" ? "Apple" : "Google")}.",
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
                // utm_* / fbclid / utm_content ({{ad.id}}) que el frontend capturó al aterrizar desde el anuncio.
                MetaAttribution.Apply(tenant, dto, "web");
                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // Random unusable password — la cuenta entra solo por el proveedor social
                var randomPassword = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = email,
                    FirstName = string.IsNullOrWhiteSpace(givenName) ? dto.BusinessName : givenName,
                    LastName = familyName ?? string.Empty,
                    AppleUserId = appleUserId,
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
                // Sin id de anuncio en el alta → sales-hub puede tenerlo (CTWA / form de leads con este teléfono).
                if (!MetaAttribution.HasAdAttribution(tenant)) _attributionEnricher.Enqueue(tenant.Id);

                var token = _authService.GenerateJwtToken(adminUser);
                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.") || host.StartsWith("0.0.0.0");
                var tenantUrl = isLocal ? $"http://{subdomain}.localhost:3001" : $"https://{subdomain}.turnos-pro.com";
                var redirectUrl = $"{tenantUrl}/dashboard?impersonationToken={token}";

                // Redeem coupon after the subscription is created (mirrors GymHero).
                if (appliedCouponCode != null)
                    await _couponService.RedeemCouponAsync(appliedCouponCode);

                _logger.LogInformation("{Provider} registration completed for {Email}, tenant {TenantId}, subdomain {Subdomain}", provider, email, tenant.Id, subdomain);

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
                _logger.LogError(ex, "Error during {Provider}-register for {Email}", provider, email);
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

    public class RegistrationQuickDto : MetaAttributionFieldsDto
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
    public class BotRegisterDto : MetaAttributionFieldsDto
    {
        // El bot manda como "nombre" lo que el lead responde a "cómo se llama tu negocio?",
        // que a veces es una frase larga (ej. "Te comento estoy por abrir el lugar de estética…").
        // NO rechazamos por largo: CleanBusinessName lo limpia/trunca a ≤60 antes de guardarlo.
        // El tope alto es solo un techo de sanidad (sales-hub ya trunca a 160 al enviar).
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El nombre del negocio es requerido")]
        [System.ComponentModel.DataAnnotations.StringLength(300, ErrorMessage = "El nombre no puede exceder 300 caracteres")]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El email es requerido")]
        [System.ComponentModel.DataAnnotations.EmailAddress(ErrorMessage = "Formato de email inválido")]
        [System.ComponentModel.DataAnnotations.StringLength(255, ErrorMessage = "El email no puede exceder 255 caracteres")]
        public string Email { get; set; } = string.Empty;

        /// <summary>Nombre de contacto (ej: pushName de WhatsApp). Se parte en nombre/apellido.</summary>
        [System.ComponentModel.DataAnnotations.StringLength(150)]
        public string? ContactName { get; set; }
        // utm*/fbclid/ctwaClid/metaAdId vienen de MetaAttributionFieldsDto (sales-hub los manda del lead).
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

    /// <summary>Paso 1 del alta/login por código de email. Trae el email (formulario) o el state (reenvío
    /// desde /register?s=...), más los datos del negocio y la atribución del anuncio.</summary>
    public class EmailStartDto : MetaAttributionFieldsDto
    {
        /// <summary>Email de la persona. Obligatorio salvo que venga State.</summary>
        public string? Email { get; set; }

        /// <summary>Token opaco de una transacción ya iniciada: reenvía el código a su email.</summary>
        public string? State { get; set; }

        /// <summary>Nombre del negocio (formulario de alta). Opcional: el login por código manda solo el email.</summary>
        public string? BusinessName { get; set; }

        /// <summary>WhatsApp del dueño, con prefijo internacional ("+54 11 2345 6789"). Opcional.</summary>
        public string? Phone { get; set; }
    }

    /// <summary>Paso 2 del alta/login por código de email. Trae la atribución (utm_content = {{ad.id}}, fbclid, _fbp)
    /// que el modal guardó en sessionStorage al aterrizar desde el anuncio.</summary>
    public class EmailVerifyDto : MetaAttributionFieldsDto
    {
        /// <summary>Token opaco de la transacción (/register?s=...). Si viene, manda sobre Email.</summary>
        public string? State { get; set; }

        /// <summary>Fallback para mails viejos que traían el email en la URL.</summary>
        public string? Email { get; set; }

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "El código es requerido")]
        public string Code { get; set; } = string.Empty;
    }

    public class RegistrationCompleteDto : MetaAttributionFieldsDto
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
