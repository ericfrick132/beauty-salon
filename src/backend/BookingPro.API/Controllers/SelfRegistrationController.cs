using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using System.Text.RegularExpressions;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/self-registration")]
    public class SelfRegistrationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;
        private readonly ILogger<SelfRegistrationController> _logger;

        // Reserved subdomains that cannot be used
        private readonly HashSet<string> _reservedSubdomains = new(StringComparer.OrdinalIgnoreCase)
        {
            "www", "api", "admin", "app", "mail", "email", "ftp", "blog", "shop", "store",
            "support", "help", "docs", "dev", "test", "staging", "prod", "production",
            "cdn", "static", "assets", "images", "media", "files", "download", "upload",
            "secure", "ssl", "vpn", "remote", "proxy", "gateway", "router", "firewall",
            "database", "db", "redis", "cache", "queue", "worker", "cron", "backup",
            "monitor", "stats", "analytics", "metrics", "health", "status", "ping"
        };

        public SelfRegistrationController(
            ApplicationDbContext context,
            ITenantService tenantService,
            ILogger<SelfRegistrationController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _logger = logger;
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            _logger.LogInformation("[SelfRegistration] Test endpoint called");
            return Ok(new { message = "SelfRegistration controller is working", timestamp = DateTime.UtcNow });
        }

        [HttpPost]
        public async Task<IActionResult> CreateTenant([FromBody] SelfRegistrationDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { 
                    success = false, 
                    message = "Datos inválidos",
                    errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                });
            }

            try
            {
                // Additional validations
                var validationResult = await ValidateRegistrationData(dto);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new { 
                        success = false, 
                        message = validationResult.Message 
                    });
                }

                // Convert to CreateTenantDto
                var createTenantDto = new CreateTenantDto
                {
                    VerticalCode = dto.VerticalCode,
                    Subdomain = dto.Subdomain,
                    BusinessName = dto.BusinessName,
                    BusinessAddress = dto.BusinessAddress,
                    AdminEmail = dto.AdminEmail,
                    AdminFirstName = dto.AdminFirstName,
                    AdminLastName = dto.AdminLastName,
                    AdminPhone = dto.AdminPhone,
                    AdminPassword = dto.AdminPassword,
                    TimeZone = dto.TimeZone ?? "America/Argentina/Buenos_Aires",
                    Currency = dto.Currency ?? "ARS",
                    Language = dto.Language ?? "es",
                    IsDemo = true,
                    DemoDays = 7,
                    PlanId = null // Demo doesn't need a specific plan
                };

                // Create the tenant
                var result = await _tenantService.CreateSelfRegisteredTenantAsync(createTenantDto);

                if (!result.Success)
                {
                    _logger.LogError("Failed to create self-registered tenant: {Message}", result.Message);
                    return BadRequest(new { 
                        success = false, 
                        message = result.Message ?? "Error creating tenant" 
                    });
                }

                _logger.LogInformation("Self-registered tenant created successfully: {Subdomain}", dto.Subdomain);

                // Return success response
                var response = new SelfRegistrationResponseDto
                {
                    TenantId = result.Data!.Id,
                    TenantUrl = result.Data.TenantUrl,
                    Subdomain = result.Data.Subdomain,
                    BusinessName = result.Data.BusinessName,
                    IsDemo = true,
                    DemoDays = 7,
                    DemoExpiresAt = DateTime.UtcNow.AddDays(7)
                };

                return Ok(new { 
                    success = true, 
                    data = response,
                    message = "¡Cuenta creada exitosamente! Bienvenido a Turnos Pro."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating self-registered tenant for subdomain {Subdomain}", dto.Subdomain);
                return StatusCode(500, new { 
                    success = false, 
                    message = "Error interno del servidor. Por favor intenta nuevamente." 
                });
            }
        }

        [HttpGet("check-subdomain/{subdomain}")]
        public async Task<IActionResult> CheckSubdomainAvailability(string subdomain)
        {
            _logger.LogInformation($"[SelfRegistration] CheckSubdomainAvailability called with subdomain: {subdomain}");
            try
            {
                // Sanitize subdomain
                subdomain = SanitizeSubdomain(subdomain);

                if (string.IsNullOrEmpty(subdomain) || subdomain.Length < 3)
                {
                    return Ok(new CheckSubdomainDto
                    {
                        Available = false,
                        Message = "El subdominio debe tener al menos 3 caracteres"
                    });
                }

                // Check if reserved
                if (_reservedSubdomains.Contains(subdomain))
                {
                    return Ok(new CheckSubdomainDto
                    {
                        Available = false,
                        Message = "Este subdominio está reservado",
                        Suggestions = GenerateSubdomainSuggestions(subdomain)
                    });
                }

                // Check if exists in database
                var exists = await _context.Tenants
                    .AnyAsync(t => t.Subdomain.ToLower() == subdomain.ToLower());

                if (exists)
                {
                    return Ok(new CheckSubdomainDto
                    {
                        Available = false,
                        Message = "Este subdominio ya está en uso",
                        Suggestions = GenerateSubdomainSuggestions(subdomain)
                    });
                }

                return Ok(new CheckSubdomainDto
                {
                    Available = true,
                    Message = "Subdominio disponible"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking subdomain availability for {Subdomain}", subdomain);
                return Ok(new CheckSubdomainDto
                {
                    Available = false,
                    Message = "Error verificando disponibilidad"
                });
            }
        }

        private async Task<ValidationResult> ValidateRegistrationData(SelfRegistrationDto dto)
        {
            // Sanitize subdomain
            dto.Subdomain = SanitizeSubdomain(dto.Subdomain);

            // Check vertical exists
            var verticalExists = await _context.Verticals
                .AnyAsync(v => v.Code == dto.VerticalCode);
            
            if (!verticalExists)
            {
                return new ValidationResult { IsValid = false, Message = "Tipo de negocio no válido" };
            }

            // Check subdomain is not reserved
            if (_reservedSubdomains.Contains(dto.Subdomain))
            {
                return new ValidationResult { IsValid = false, Message = "El subdominio seleccionado está reservado" };
            }

            // Check subdomain is unique
            var subdomainExists = await _context.Tenants
                .AnyAsync(t => t.Subdomain.ToLower() == dto.Subdomain.ToLower());
            
            if (subdomainExists)
            {
                return new ValidationResult { IsValid = false, Message = "El subdominio ya está en uso" };
            }

            // Check email is unique
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email.ToLower() == dto.AdminEmail.ToLower());
            
            if (emailExists)
            {
                return new ValidationResult { IsValid = false, Message = "Ya existe una cuenta con este email" };
            }

            // Validate password strength (additional check)
            if (!IsPasswordStrong(dto.AdminPassword))
            {
                return new ValidationResult { 
                    IsValid = false, 
                    Message = "La contraseña debe contener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos" 
                };
            }

            return new ValidationResult { IsValid = true };
        }

        private string SanitizeSubdomain(string subdomain)
        {
            if (string.IsNullOrEmpty(subdomain))
                return string.Empty;

            // Convert to lowercase and remove invalid characters
            return Regex.Replace(subdomain.ToLowerInvariant(), @"[^a-z0-9-]", "");
        }

        private bool IsPasswordStrong(string password)
        {
            if (string.IsNullOrEmpty(password) || password.Length < 8)
                return false;

            return Regex.IsMatch(password, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$");
        }

        private string[] GenerateSubdomainSuggestions(string subdomain)
        {
            var suggestions = new List<string>();
            
            // Add random numbers
            for (int i = 1; i <= 3; i++)
            {
                var random = new Random();
                var number = random.Next(10, 999);
                suggestions.Add($"{subdomain}{number}");
            }

            // Add year
            suggestions.Add($"{subdomain}{DateTime.Now.Year}");

            // Add common suffixes
            var suffixes = new[] { "pro", "plus", "oficial", "online" };
            foreach (var suffix in suffixes)
            {
                suggestions.Add($"{subdomain}-{suffix}");
            }

            return suggestions.Take(3).ToArray();
        }
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}