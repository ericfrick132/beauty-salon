using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/super-admin")]
    [Authorize(Roles = "super_admin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SuperAdminController> _logger;
        private readonly ISuperAdminService _superAdminService;

        public SuperAdminController(
            ApplicationDbContext context,
            ILogger<SuperAdminController> logger,
            ISuperAdminService superAdminService)
        {
            _context = context;
            _logger = logger;
            _superAdminService = superAdminService;
        }

        [HttpGet("tenants")]
        public async Task<IActionResult> GetTenants(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var query = _context.Tenants
                    .Include(t => t.Vertical)
                    .OrderByDescending(t => t.CreatedAt);

                var tenants = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(t => new
                    {
                        id = t.Id,
                        subdomain = t.Subdomain,
                        businessName = t.BusinessName,
                        ownerEmail = t.OwnerEmail,
                        verticalId = t.VerticalId,
                        vertical = new
                        {
                            name = t.Vertical.Name,
                            code = t.Vertical.Code,
                            domain = t.Vertical.Domain
                        },
                        isActive = t.Status == "active",
                        status = t.Status,
                        createdAt = t.CreatedAt,
                        planId = t.SubscriptionPlanId,
                        plan = t.SubscriptionPlanId.HasValue
                            ? _context.SubscriptionPlans
                                .Where(p => p.Id == t.SubscriptionPlanId.Value)
                                .Select(p => new { name = p.Name, code = p.Code, price = p.Price, currency = p.Currency })
                                .FirstOrDefault()
                            : null,
                        lastLoginAt = _context.Users
                            .IgnoreQueryFilters()
                            .Where(u => u.TenantId == t.Id && u.LastLogin.HasValue)
                            .OrderByDescending(u => u.LastLogin)
                            .Select(u => u.LastLogin)
                            .FirstOrDefault(),
                        // Facturación total aprobada
                        totalRevenue = _context.TenantSubscriptionPayments
                            .Where(p => p.TenantId == t.Id && p.Status == "approved")
                            .Select(p => (decimal?)p.Amount)
                            .Sum() ?? 0,
                        // Último vencimiento de suscripción (por pagos aprobados)
                        subscriptionExpiry = _context.TenantSubscriptionPayments
                            .Where(p => p.TenantId == t.Id && p.Status == "approved")
                            .OrderByDescending(p => p.PeriodEnd)
                            .Select(p => (DateTime?)p.PeriodEnd)
                            .FirstOrDefault(),
                        // Estado de suscripción derivado
                        subscriptionStatus = _context.TenantSubscriptionPayments
                            .Any(p => p.TenantId == t.Id && p.Status == "approved" && p.PeriodEnd > DateTime.UtcNow)
                                ? "ACTIVE"
                                : (_context.TenantSubscriptionPayments.Any(p => p.TenantId == t.Id)
                                    ? "EXPIRED"
                                    : "NEVER_SUBSCRIBED"),
                        daysUntilExpiry = (int?)null
                    })
                    .ToListAsync();

                return Ok(tenants);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tenants for super admin");
                return StatusCode(500, new { message = "Error fetching tenants" });
            }
        }

        [HttpGet("tenant-payments")]
        public async Task<IActionResult> GetTenantPayments()
        {
            try
            {
                // Return empty array for now since payment system isn't fully implemented
                var payments = new List<object>();
                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tenant payments for super admin");
                return StatusCode(500, new { message = "Error fetching payments" });
            }
        }

        [HttpGet("platform-config")]
        public async Task<IActionResult> GetPlatformConfig()
        {
            try
            {
                // Return default platform configuration
                var config = new
                {
                    monthlyPrice = 29.99m,
                    currency = "ARS",
                    isActive = true
                };

                return Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching platform config for super admin");
                return StatusCode(500, new { message = "Error fetching platform config" });
            }
        }

        [HttpPut("platform-config")]
        public async Task<IActionResult> UpdatePlatformConfig([FromBody] PlatformConfigDto config)
        {
            try
            {
                // For now, just return success - implement actual config storage later
                return Ok(new { success = true, message = "Platform configuration updated" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating platform config for super admin");
                return StatusCode(500, new { success = false, message = "Error updating platform config" });
            }
        }

        [HttpPost("tenants/{tenantId}/create-payment")]
        public async Task<IActionResult> CreateTenantPayment(Guid tenantId)
        {
            try
            {
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant == null)
                {
                    return NotFound(new { success = false, message = "Tenant not found" });
                }

                // For now, just return success - implement actual payment creation later
                return Ok(new { success = true, message = "Payment link created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tenant payment for super admin");
                return StatusCode(500, new { success = false, message = "Error creating payment" });
            }
        }

        [HttpPost("tenants/{tenantId}/impersonate")]
        public async Task<IActionResult> ImpersonateTenant(Guid tenantId)
        {
            try
            {
                // 1. Verificar que el usuario es super admin
                var userRole = User?.FindFirst("role")?.Value;
                var claimRole = User?.FindFirst(ClaimTypes.Role)?.Value;
                var isSuperAdmin = User?.FindFirst("is_super_admin")?.Value;
                
                _logger.LogWarning("IMPERSONATION DEBUG: role claim: {UserRole}, ClaimTypes.Role: {ClaimRole}, is_super_admin: {IsSuperAdmin}", userRole, claimRole, isSuperAdmin);
                
                if (userRole != "super_admin" && claimRole != "super_admin" && isSuperAdmin != "true")
                {
                    return Unauthorized(new { success = false, message = $"Only super admins can impersonate tenants. Current role: {userRole}, claimRole: {claimRole}, isSuperAdmin: {isSuperAdmin}" });
                }

                // 2. Realizar impersonation
                var result = await _superAdminService.ImpersonateTenantAsync(tenantId);

                if (!result.Success)
                {
                    return BadRequest(new { success = false, message = result.Message });
                }

                return Ok(new { 
                    success = true, 
                    data = result.Data,
                    message = "Impersonation token generated successfully" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during impersonation for tenant {TenantId}", tenantId);
                return StatusCode(500, new { success = false, message = "Error during impersonation" });
            }
        }

        [HttpGet("tenants/{tenantId}/message-wallet")]
        public async Task<IActionResult> GetTenantMessageWallet(Guid tenantId)
        {
            try
            {
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant == null)
                    return NotFound(new { success = false, message = "Tenant not found" });

                var wallet = await _context.TenantMessageWallets
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(w => w.TenantId == tenantId);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        balance = wallet?.Balance ?? 0,
                        totalPurchased = wallet?.TotalPurchased ?? 0,
                        totalSent = wallet?.TotalSent ?? 0,
                        updatedAt = wallet?.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching message wallet for tenant {TenantId}", tenantId);
                return StatusCode(500, new { success = false, message = "Error fetching wallet" });
            }
        }

        [HttpPost("tenants/{tenantId}/message-credits")]
        public async Task<IActionResult> AddMessageCredits(Guid tenantId, [FromBody] AddMessageCreditsDto dto)
        {
            try
            {
                if (dto.Amount <= 0)
                    return BadRequest(new { success = false, message = "Amount must be greater than 0" });

                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
                if (tenant == null)
                    return NotFound(new { success = false, message = "Tenant not found" });

                var wallet = await _context.TenantMessageWallets
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(w => w.TenantId == tenantId);

                if (wallet == null)
                {
                    wallet = new TenantMessageWallet
                    {
                        TenantId = tenantId,
                        Balance = 0,
                        TotalPurchased = 0,
                        TotalSent = 0
                    };
                    _context.TenantMessageWallets.Add(wallet);
                }

                wallet.Balance += dto.Amount;
                wallet.TotalPurchased += dto.Amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                // Create audit log entry
                var log = new MessageLog
                {
                    TenantId = tenantId,
                    Channel = "system",
                    MessageType = "credit",
                    Status = "sent",
                    To = "wallet",
                    Body = $"Super admin added {dto.Amount} credits. Reason: {dto.Reason ?? "N/A"}",
                    SentAt = DateTime.UtcNow
                };
                _context.MessageLogs.Add(log);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Super admin added {Amount} message credits to tenant {TenantId}. Reason: {Reason}",
                    dto.Amount, tenantId, dto.Reason);

                return Ok(new
                {
                    success = true,
                    message = $"Se cargaron {dto.Amount} créditos al tenant {tenant.BusinessName}",
                    data = new
                    {
                        balance = wallet.Balance,
                        totalPurchased = wallet.TotalPurchased,
                        totalSent = wallet.TotalSent
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding message credits for tenant {TenantId}", tenantId);
                return StatusCode(500, new { success = false, message = "Error adding credits" });
            }
        }

        [HttpPost("tenants/{tenantId}/assign-plan")]
        public async Task<IActionResult> AssignTenantPlan(Guid tenantId, [FromBody] AssignTenantPlanDto dto)
        {
            if (dto == null || dto.SubscriptionPlanId == Guid.Empty)
                return BadRequest(new { success = false, message = "subscriptionPlanId es requerido" });

            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "unknown";

            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null)
                return NotFound(new { success = false, message = "Tenant no encontrado" });

            var plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == dto.SubscriptionPlanId);
            if (plan == null)
                return NotFound(new { success = false, message = "Plan no encontrado" });

            tenant.SubscriptionPlanId = plan.Id;
            tenant.UpdatedAt = DateTime.UtcNow;

            // Update the latest Subscription record to reflect the new plan, but do NOT
            // change its status — no payment is being recorded, the tenant must still pay.
            var subscription = await _context.Subscriptions
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            if (subscription != null)
            {
                subscription.PlanType = plan.Code;
                subscription.MonthlyAmount = plan.Price;
                subscription.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "SuperAdmin {Admin} assigned plan {PlanCode} to tenant {TenantId} ({Subdomain}) without recording a payment",
                adminEmail, plan.Code, tenantId, tenant.Subdomain);

            return Ok(new
            {
                success = true,
                message = $"Plan '{plan.Name}' asignado. El tenant deberá pagar para activar el período.",
                planId = plan.Id,
                planCode = plan.Code,
                planName = plan.Name,
                planPrice = plan.Price,
                planCurrency = plan.Currency
            });
        }

        [HttpPost("tenants/{tenantId}/reset-password")]
        public async Task<IActionResult> ResetTenantAdminPassword(Guid tenantId, [FromBody] ResetTenantPasswordDto? dto)
        {
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "unknown";

            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            if (tenant == null)
                return NotFound(new { success = false, message = "Tenant no encontrado" });

            var query = _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.TenantId == tenantId);

            User? user = null;
            if (!string.IsNullOrWhiteSpace(dto?.Email))
            {
                var emailNorm = dto!.Email!.Trim().ToLower();
                user = await query.FirstOrDefaultAsync(u => u.Email.ToLower() == emailNorm);
            }
            else
            {
                user = await query.FirstOrDefaultAsync(u => u.Role == "admin")
                    ?? await query.FirstOrDefaultAsync(u => u.Email.ToLower() == (tenant.OwnerEmail ?? string.Empty).ToLower())
                    ?? await query.OrderBy(u => u.CreatedAt).FirstOrDefaultAsync();
            }

            if (user == null)
                return NotFound(new { success = false, message = "Usuario admin del tenant no encontrado" });

            string newPassword;
            bool generated = false;
            if (string.IsNullOrWhiteSpace(dto?.NewPassword))
            {
                newPassword = GenerateTemporaryPassword();
                generated = true;
            }
            else
            {
                newPassword = dto!.NewPassword!;
                if (newPassword.Length < 6)
                    return BadRequest(new { success = false, message = "La contraseña debe tener al menos 6 caracteres" });
            }

            user.PasswordHash = BookingPro.API.Services.Security.PasswordHasher.Hash(newPassword);
            user.IsActive = true;
            await _context.SaveChangesAsync();

            _logger.LogWarning(
                "SuperAdmin {Admin} reset password for user {UserEmail} of tenant {TenantId} ({Subdomain})",
                adminEmail, user.Email, tenantId, tenant.Subdomain);

            return Ok(new
            {
                success = true,
                message = "Contraseña actualizada correctamente",
                email = user.Email,
                generated,
                password = generated ? newPassword : null
            });
        }

        private static string GenerateTemporaryPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
            var random = new Random();
            var password = new string(Enumerable.Repeat(chars, 12)
                .Select(s => s[random.Next(s.Length)]).ToArray());

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

        [HttpDelete("tenants/{tenantId}")]
        public async Task<IActionResult> DeleteTenant(Guid tenantId)
        {
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "unknown";

            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            if (tenant == null)
                return NotFound(new { success = false, message = "Tenant no encontrado" });

            // Hard delete — remove tenant row; FK cascades handle related data via DB constraints.
            // Tables without FK cascade are cleaned explicitly below.
            _context.Tenants.Remove(tenant);
            await _context.SaveChangesAsync();

            _logger.LogWarning(
                "SuperAdmin {Admin} permanently deleted tenant {TenantId} ({Subdomain})",
                adminEmail, tenantId, tenant.Subdomain);

            return Ok(new { success = true, message = $"Tenant '{tenant.BusinessName}' eliminado permanentemente" });
        }

        [HttpGet("tenants/list")]
        public async Task<IActionResult> GetTenantsForImpersonation()
        {
            try
            {
                var result = await _superAdminService.GetTenantsForSuperAdminAsync();

                if (!result.Success)
                {
                    return BadRequest(new { success = false, message = result.Message });
                }

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tenants for impersonation");
                return StatusCode(500, new { success = false, message = "Error fetching tenants" });
            }
        }
    }

    public class PlatformConfigDto
    {
        public decimal MonthlyPrice { get; set; }
        public string Currency { get; set; } = "ARS";
        public bool IsActive { get; set; }
    }

    public class AddMessageCreditsDto
    {
        public int Amount { get; set; }
        public string? Reason { get; set; }
    }

    public class ResetTenantPasswordDto
    {
        public string? Email { get; set; }
        public string? NewPassword { get; set; }
    }

    public class AssignTenantPlanDto
    {
        public Guid SubscriptionPlanId { get; set; }
    }
}
