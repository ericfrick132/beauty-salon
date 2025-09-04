using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Enums;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Services
{
    public class SuperAdminService : ISuperAdminService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SuperAdminService> _logger;

        public SuperAdminService(
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<SuperAdminService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<ServiceResult<ImpersonationResult>> ImpersonateTenantAsync(Guid tenantId)
        {
            try
            {
                // 1. Buscar el tenant activo (trial, active, o suspended)
                var tenant = await _context.Set<Tenant>()
                    .Include(t => t.Vertical)
                    .FirstOrDefaultAsync(t => t.Id == tenantId && 
                        (t.Status == TenantStatus.Active.ToString().ToLower() || 
                         t.Status == TenantStatus.Trial.ToString().ToLower() ||
                         t.Status == TenantStatus.Suspended.ToString().ToLower()));

                if (tenant == null)
                {
                    return ServiceResult<ImpersonationResult>.Fail("Tenant not found or inactive");
                }

                // 2. Buscar el primer admin activo del tenant
                var admin = await _context.Users
                    .IgnoreQueryFilters() // IMPORTANTE: Evitar filtros por tenant
                    .Where(u => u.TenantId == tenantId && u.IsActive && u.Role.ToLower() == "admin")
                    .OrderBy(u => u.CreatedAt)
                    .FirstOrDefaultAsync();

                if (admin == null)
                {
                    return ServiceResult<ImpersonationResult>.Fail("No active admin found for this tenant");
                }

                // 3. Generar JWT con claims especiales
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));
                var tokenHandler = new JwtSecurityTokenHandler();

                var claims = new List<Claim>
                {
                    new(ClaimTypes.NameIdentifier, admin.Id.ToString()),
                    new(ClaimTypes.Email, admin.Email),
                    new(ClaimTypes.Name, $"{admin.FirstName} {admin.LastName}"),
                    new(ClaimTypes.Role, admin.Role),
                    new("tenant_id", admin.TenantId.ToString()),
                    new("first_name", admin.FirstName ?? ""),
                    new("last_name", admin.LastName ?? ""),
                    // 🔥 CLAIMS CRÍTICOS PARA IMPERSONATION:
                    new("ImpersonatedBy", "SuperAdmin"),
                    new("ImpersonatedAt", DateTime.UtcNow.ToString("O")),
                    new("UserType", "Admin")
                };

                // 4. Token con expiración corta (1 hora)
                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(claims),
                    NotBefore = DateTime.UtcNow.AddMinutes(-1),
                    Expires = DateTime.UtcNow.AddHours(1), // Expiración corta por seguridad
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                    Issuer = _configuration["Jwt:Issuer"],
                    Audience = _configuration["Jwt:Audience"]
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);
                var tokenString = tokenHandler.WriteToken(token);

                // 5. Generar URL de redirect con el subdominio del tenant
                var baseUrl = _configuration["App:BaseUrl"] ?? "https://localhost:3001";
                var redirectUrl = $"https://{tenant.Subdomain}.localhost:3001/dashboard?impersonationToken={tokenString}";

                // Log de auditoría crítico
                _logger.LogWarning("IMPERSONATION INITIATED: SuperAdmin impersonating Admin {AdminEmail} ({AdminId}) in Tenant {TenantName} ({TenantId})",
                    admin.Email, admin.Id, tenant.BusinessName, tenantId);

                var result = new ImpersonationResult
                {
                    Token = tokenString,
                    TenantName = tenant.BusinessName,
                    TenantSubdomain = tenant.Subdomain,
                    AdminEmail = admin.Email,
                    AdminName = $"{admin.FirstName} {admin.LastName}",
                    RedirectUrl = redirectUrl
                };

                return ServiceResult<ImpersonationResult>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during impersonation for tenant {TenantId}", tenantId);
                return ServiceResult<ImpersonationResult>.Fail($"Error during impersonation: {ex.Message}");
            }
        }

        public async Task<ServiceResult<IEnumerable<SuperAdminTenantListDto>>> GetTenantsForSuperAdminAsync()
        {
            try
            {
                var tenants = await _context.Set<Tenant>()
                    .Include(t => t.Vertical)
                    .IgnoreQueryFilters()
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new SuperAdminTenantListDto
                    {
                        Id = t.Id,
                        BusinessName = t.BusinessName,
                        Subdomain = t.Subdomain,
                        Vertical = t.Vertical != null ? t.Vertical.Name : "Unknown",
                        IsActive = t.Status == TenantStatus.Active.ToString().ToLower() || t.Status == TenantStatus.Trial.ToString().ToLower(),
                        CreatedAt = t.CreatedAt,
                        AdminCount = _context.Users
                            .IgnoreQueryFilters()
                            .Count(u => u.TenantId == t.Id && u.Role.ToLower() == "admin" && u.IsActive),
                        BookingCount = _context.Set<Booking>()
                            .IgnoreQueryFilters()
                            .Count(b => b.Customer.TenantId == t.Id),
                        LastActivity = _context.Users
                            .IgnoreQueryFilters()
                            .Where(u => u.TenantId == t.Id && u.LastLogin.HasValue)
                            .OrderByDescending(u => u.LastLogin)
                            .Select(u => u.LastLogin!.Value.ToString("yyyy-MM-dd HH:mm"))
                            .FirstOrDefault()
                    })
                    .ToListAsync();

                return ServiceResult<IEnumerable<SuperAdminTenantListDto>>.Ok(tenants);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tenants for super admin");
                return ServiceResult<IEnumerable<SuperAdminTenantListDto>>.Fail($"Error retrieving tenants: {ex.Message}");
            }
        }
    }
}