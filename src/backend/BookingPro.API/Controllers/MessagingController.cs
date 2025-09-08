using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/messaging")]
    [Authorize]
    public class MessagingController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPlatformPaymentService _platformPayments;
        private readonly ILogger<MessagingController> _logger;

        public MessagingController(ApplicationDbContext context, IPlatformPaymentService platformPayments, ILogger<MessagingController> logger)
        {
            _context = context;
            _platformPayments = platformPayments;
            _logger = logger;
        }

        private Guid GetTenantId()
        {
            var tid = User.FindFirst("tenantId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(tid, out var id) ? id : Guid.Empty;
        }

        [HttpGet("packages")]
        public async Task<IActionResult> GetPackages()
        {
            var list = await _context.MessagePackages
                .Where(p => p.IsActive)
                .OrderBy(p => p.Quantity)
                .Select(p => new MessagePackageDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Quantity = p.Quantity,
                    Price = p.Price,
                    Currency = p.Currency,
                    IsActive = p.IsActive
                }).ToListAsync();
            return Ok(list);
        }

        [HttpPost("purchase")]
        public async Task<IActionResult> Purchase([FromBody] PurchaseMessagePackageRequestDto dto)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var result = await _platformPayments.CreateMessagePackagePurchaseAsync(tenantId, dto.PackageId);
            if (!result.Success || result.Data == null)
            {
                return BadRequest(new { error = result.Message });
            }
            return Ok(result.Data);
        }

        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance()
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var wallet = await _context.TenantMessageWallets.FirstOrDefaultAsync(w => w.TenantId == tenantId);
            if (wallet == null)
            {
                return Ok(new MessageBalanceDto { Balance = 0, TotalPurchased = 0, TotalSent = 0, UpdatedAt = DateTime.UtcNow });
            }
            return Ok(new MessageBalanceDto
            {
                Balance = wallet.Balance,
                TotalPurchased = wallet.TotalPurchased,
                TotalSent = wallet.TotalSent,
                UpdatedAt = wallet.UpdatedAt
            });
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var settings = await _context.TenantMessagingSettings.FirstOrDefaultAsync(s => s.TenantId == tenantId);
            settings ??= new TenantMessagingSettings { TenantId = tenantId };
            return Ok(new
            {
                whatsappRemindersEnabled = settings.WhatsAppRemindersEnabled,
                reminderAdvanceMinutes = settings.ReminderAdvanceMinutes,
                reminderTemplate = settings.ReminderTemplate
            });
        }

        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] dynamic dto)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var settings = await _context.TenantMessagingSettings.FirstOrDefaultAsync(s => s.TenantId == tenantId);
            if (settings == null)
            {
                settings = new TenantMessagingSettings
                {
                    TenantId = tenantId,
                };
                _context.TenantMessagingSettings.Add(settings);
            }
            settings.WhatsAppRemindersEnabled = (bool)(dto.whatsappRemindersEnabled ?? false);
            settings.ReminderAdvanceMinutes = (int)(dto.reminderAdvanceMinutes ?? 60);
            if (dto.reminderTemplate != null)
            {
                settings.ReminderTemplate = (string)dto.reminderTemplate;
            }
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPost("send-due-reminders")]
        public async Task<IActionResult> SendDueReminders([FromServices] IWhatsAppService wa)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();

            var settings = await _context.TenantMessagingSettings.FirstOrDefaultAsync(s => s.TenantId == tenantId);
            if (settings == null || !settings.WhatsAppRemindersEnabled)
            {
                return Ok(new { sent = 0, message = "WhatsApp reminders disabled" });
            }

            var advance = settings.ReminderAdvanceMinutes;
            var targetTimeUtc = DateTime.UtcNow.AddMinutes(advance);
            var windowEndUtc = targetTimeUtc.AddMinutes(5); // 5-minute window

            // Find bookings starting within the window and not cancelled/completed
            var bookings = await _context.Bookings
                .Where(b => b.StartTime >= targetTimeUtc && b.StartTime < windowEndUtc && b.Status == "confirmed")
                .OrderBy(b => b.StartTime)
                .Take(50)
                .ToListAsync();

            var sentCount = 0;
            foreach (var b in bookings)
            {
                // Avoid duplicate sends: check if a reminder log exists
                var already = await _context.MessageLogs.AnyAsync(l => l.BookingId == b.Id && l.MessageType == "reminder" && l.Channel == "whatsapp");
                if (already) continue;

                var res = await wa.SendBookingReminderAsync(b.Id);
                if (res.Success) sentCount++;
            }

            return Ok(new { sent = sentCount });
        }
    }
}
