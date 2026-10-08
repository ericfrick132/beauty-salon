using System.Security.Claims;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Registro de los teléfonos donde las apps reciben push (turno nuevo / cancelado). La app lo llama
    /// al iniciar sesión y cada vez que FCM/APNs le da un token nuevo; al cerrar sesión lo borra.
    /// </summary>
    [ApiController]
    [Route("api/devices")]
    [Authorize]
    public class DevicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPushNotificationService _push;

        public DevicesController(ApplicationDbContext context, IPushNotificationService push)
        {
            _context = context;
            _push = push;
        }

        public class RegisterDeviceDto
        {
            public string Platform { get; set; } = string.Empty; // android | ios
            public string Token { get; set; } = string.Empty;
            public string? Environment { get; set; }             // iOS: sandbox | production
        }

        public class UnregisterDeviceDto
        {
            public string Token { get; set; } = string.Empty;
        }

        private (Guid userId, Guid tenantId) Caller()
        {
            Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId);
            Guid.TryParse(User.FindFirst("tenant_id")?.Value ?? User.FindFirst("tenantId")?.Value, out var tenantId);
            return (userId, tenantId);
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] RegisterDeviceDto dto)
        {
            var (userId, tenantId) = Caller();
            if (userId == Guid.Empty || tenantId == Guid.Empty) return Unauthorized();
            var platform = (dto.Platform ?? "").Trim().ToLowerInvariant();
            var token = (dto.Token ?? "").Trim();
            if (platform is not ("android" or "ios")) return BadRequest(new { error = "Plataforma inválida" });
            if (token.Length is < 20 or > 512) return BadRequest(new { error = "Token inválido" });
            var env = dto.Environment?.Trim().ToLowerInvariant();
            if (env is not (null or "sandbox" or "production")) env = null;

            var row = await _context.DeviceTokens.FirstOrDefaultAsync(d => d.Token == token);
            if (row == null)
            {
                row = new DeviceToken { Token = token };
                _context.DeviceTokens.Add(row);
            }
            row.UserId = userId;
            row.TenantId = tenantId;
            row.Platform = platform;
            row.Environment = env;
            row.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { registered = true, pushEnabled = _push.IsConfigured });
        }

        [HttpPost("unregister")]
        public async Task<IActionResult> Unregister([FromBody] UnregisterDeviceDto dto)
        {
            var (userId, _) = Caller();
            var token = (dto.Token ?? "").Trim();
            var row = await _context.DeviceTokens.FirstOrDefaultAsync(d => d.Token == token && d.UserId == userId);
            if (row != null)
            {
                _context.DeviceTokens.Remove(row);
                await _context.SaveChangesAsync();
            }
            return Ok(new { unregistered = true });
        }

        /// <summary>Notificación de prueba al usuario que la pide (Perfil → Notificaciones → "Probar").</summary>
        [HttpPost("test")]
        public async Task<IActionResult> Test()
        {
            var (userId, _) = Caller();
            if (userId == Guid.Empty) return Unauthorized();
            if (!_push.IsConfigured)
                return Ok(new { sent = 0, pushEnabled = false });
            var sent = await _push.SendToUsersAsync(new[] { userId }, "TurnosPro", "Las notificaciones de turnos están activas en este teléfono.");
            return Ok(new { sent, pushEnabled = true });
        }
    }
}
