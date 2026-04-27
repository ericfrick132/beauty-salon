using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Constants;
using BookingPro.API.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Gestión de usuarios DENTRO de un tenant (no super-admin).
    /// El owner/admin puede crear empleados con roles limitados.
    /// </summary>
    [Authorize(Roles = "admin,super_admin")]
    [ApiController]
    [Route("api/tenant-users")]
    public class TenantUsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;
        private readonly ILogger<TenantUsersController> _logger;

        // Roles permitidos al crear usuarios desde este controller (no se puede crear super_admin).
        private static readonly string[] AssignableRoles = new[] { Roles.Admin, Roles.Employee };

        public TenantUsersController(
            ApplicationDbContext context,
            ITenantService tenantService,
            ILogger<TenantUsersController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var tenantId = _tenantService.GetCurrentTenantIdFromContext();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "Tenant no resuelto." });

            var users = await _context.Users
                .Where(u => u.TenantId == tenantId)
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.FirstName,
                    u.LastName,
                    u.Phone,
                    u.Role,
                    u.IsActive,
                    u.LastLogin,
                    u.CreatedAt,
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateTenantUserDto dto)
        {
            var tenantId = _tenantService.GetCurrentTenantIdFromContext();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "Tenant no resuelto." });

            if (!AssignableRoles.Contains(dto.Role))
            {
                return BadRequest(new { error = $"Rol inválido. Valores permitidos: {string.Join(", ", AssignableRoles)}" });
            }

            var email = dto.Email.Trim().ToLowerInvariant();
            var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == email);
            if (exists) return Conflict(new { error = "Ya existe un usuario con ese email." });

            var user = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Email = email,
                FirstName = dto.FirstName?.Trim(),
                LastName = dto.LastName?.Trim(),
                Phone = dto.Phone?.Trim(),
                PasswordHash = Services.Security.PasswordHasher.Hash(dto.Password),
                Role = dto.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Tenant user {Email} created in tenant {TenantId} with role {Role}", email, tenantId, dto.Role);

            return CreatedAtAction(nameof(GetUsers), new { id = user.Id }, new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Phone,
                user.Role,
                user.IsActive,
            });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateTenantUserDto dto)
        {
            var tenantId = _tenantService.GetCurrentTenantIdFromContext();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "Tenant no resuelto." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId);
            if (user == null) return NotFound(new { error = "Usuario no encontrado." });

            if (!string.IsNullOrEmpty(dto.Role))
            {
                if (!AssignableRoles.Contains(dto.Role))
                    return BadRequest(new { error = "Rol inválido." });
                user.Role = dto.Role;
            }

            if (dto.FirstName != null) user.FirstName = dto.FirstName.Trim();
            if (dto.LastName != null) user.LastName = dto.LastName.Trim();
            if (dto.Phone != null) user.Phone = dto.Phone.Trim();
            if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

            if (!string.IsNullOrEmpty(dto.NewPassword))
            {
                user.PasswordHash = Services.Security.PasswordHasher.Hash(dto.NewPassword);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeactivateUser(Guid id)
        {
            var tenantId = _tenantService.GetCurrentTenantIdFromContext();
            if (tenantId == Guid.Empty) return BadRequest(new { error = "Tenant no resuelto." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId);
            if (user == null) return NotFound(new { error = "Usuario no encontrado." });

            // No permitir auto-desactivación
            var currentEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            if (!string.IsNullOrEmpty(currentEmail) && string.Equals(currentEmail, user.Email, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { error = "No podés desactivar tu propio usuario." });
            }

            user.IsActive = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class CreateTenantUserDto
    {
        [Required, EmailAddress, MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required, MinLength(8)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty;

        [MaxLength(100)] public string? FirstName { get; set; }
        [MaxLength(100)] public string? LastName { get; set; }
        [MaxLength(50)] public string? Phone { get; set; }
    }

    public class UpdateTenantUserDto
    {
        public string? Role { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Phone { get; set; }
        public bool? IsActive { get; set; }
        public string? NewPassword { get; set; }
    }
}
