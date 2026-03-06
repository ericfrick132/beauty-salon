using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class WhatsAppService : IWhatsAppService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<WhatsAppService> _logger;
        private readonly IWhatsAppConnectionService _connectionService;

        public WhatsAppService(
            ApplicationDbContext context,
            ILogger<WhatsAppService> logger,
            IWhatsAppConnectionService connectionService)
        {
            _context = context;
            _logger = logger;
            _connectionService = connectionService;
        }

        public async Task<ServiceResult<bool>> SendBookingReminderAsync(Guid bookingId)
        {
            try
            {
                var booking = await _context.Bookings
                    .Include(b => b.Customer)
                    .Include(b => b.Service)
                    .FirstOrDefaultAsync(b => b.Id == bookingId);
                if (booking == null) return ServiceResult<bool>.Fail("Booking not found");

                var settings = await _context.TenantMessagingSettings
                    .FirstOrDefaultAsync(s => s.TenantId == booking.TenantId);
                if (settings == null || !settings.WhatsAppRemindersEnabled)
                {
                    return ServiceResult<bool>.Fail("WhatsApp reminders disabled");
                }

                // Check wallet
                var wallet = await _context.TenantMessageWallets
                    .FirstOrDefaultAsync(w => w.TenantId == booking.TenantId);
                if (wallet == null || wallet.Balance <= 0)
                {
                    return ServiceResult<bool>.Fail("Insufficient message credits");
                }

                var toPhone = booking.Customer?.Phone;
                if (string.IsNullOrWhiteSpace(toPhone))
                {
                    return ServiceResult<bool>.Fail("Customer has no phone");
                }

                // Build message body from template
                var timeLocal = booking.StartTime.ToLocalTime();
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == booking.TenantId);
                var template = settings.ReminderTemplate
                    ?? "Hola {customer_name}! Te recordamos tu turno para {service_name} el {date} a las {time}.";
                string body = template
                    .Replace("{customer_name}", (booking.Customer?.FirstName + " " + (booking.Customer?.LastName ?? "")).Trim())
                    .Replace("{service_name}", booking.Service?.Name ?? "servicio")
                    .Replace("{date}", timeLocal.ToString("dd/MM/yyyy"))
                    .Replace("{time}", timeLocal.ToString("HH:mm"))
                    .Replace("{business_name}", tenant?.BusinessName ?? "");

                // Send via Evolution API
                var sendResult = await _connectionService.SendTextAsync(booking.TenantId, toPhone, body);

                var log = new MessageLog
                {
                    TenantId = booking.TenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Channel = "whatsapp",
                    MessageType = "reminder",
                    Status = sendResult.Success ? "sent" : "failed",
                    To = toPhone,
                    Body = body,
                    SentAt = sendResult.Success ? DateTime.UtcNow : null,
                    ProviderMessageId = sendResult.Data,
                    ErrorMessage = sendResult.Success ? null : sendResult.Message
                };

                _context.MessageLogs.Add(log);

                if (sendResult.Success)
                {
                    wallet.Balance -= 1;
                    wallet.TotalSent += 1;
                    wallet.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return sendResult.Success
                    ? ServiceResult<bool>.Ok(true)
                    : ServiceResult<bool>.Fail(sendResult.Message ?? "Failed to send message");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp reminder");
                return ServiceResult<bool>.Fail("Error sending reminder");
            }
        }

        public async Task<ServiceResult<bool>> SendBookingConfirmationAsync(Guid bookingId)
        {
            try
            {
                var booking = await _context.Bookings
                    .Include(b => b.Customer)
                    .Include(b => b.Service)
                    .Include(b => b.Employee)
                    .FirstOrDefaultAsync(b => b.Id == bookingId);
                if (booking == null) return ServiceResult<bool>.Fail("Booking not found");

                // Check connection exists and is open
                var connection = await _connectionService.GetConnectionByTenantIdAsync(booking.TenantId);
                if (connection == null || connection.Status != "open")
                    return ServiceResult<bool>.Ok(false, "WhatsApp not connected");

                // Check wallet
                var wallet = await _context.TenantMessageWallets
                    .FirstOrDefaultAsync(w => w.TenantId == booking.TenantId);
                if (wallet == null || wallet.Balance <= 0)
                    return ServiceResult<bool>.Ok(false, "Insufficient credits");

                var toPhone = booking.Customer?.Phone;
                if (string.IsNullOrWhiteSpace(toPhone))
                    return ServiceResult<bool>.Ok(false, "Customer has no phone");

                // Avoid duplicate: check if confirmation already sent
                var alreadySent = await _context.MessageLogs
                    .AnyAsync(l => l.BookingId == bookingId && l.MessageType == "confirmation" && l.Channel == "whatsapp" && l.Status == "sent");
                if (alreadySent)
                    return ServiceResult<bool>.Ok(true, "Already sent");

                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == booking.TenantId);
                var timeLocal = booking.StartTime.ToLocalTime();
                var body = $"Hola {booking.Customer?.FirstName}! Tu turno para {booking.Service?.Name ?? "servicio"} " +
                           $"el {timeLocal:dd/MM/yyyy} a las {timeLocal:HH:mm} con {booking.Employee?.Name ?? "nosotros"} " +
                           $"fue confirmado. {tenant?.BusinessName ?? ""}";

                var sendResult = await _connectionService.SendTextAsync(booking.TenantId, toPhone, body);

                var log = new MessageLog
                {
                    TenantId = booking.TenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Channel = "whatsapp",
                    MessageType = "confirmation",
                    Status = sendResult.Success ? "sent" : "failed",
                    To = toPhone,
                    Body = body,
                    SentAt = sendResult.Success ? DateTime.UtcNow : null,
                    ProviderMessageId = sendResult.Data,
                    ErrorMessage = sendResult.Success ? null : sendResult.Message
                };
                _context.MessageLogs.Add(log);

                if (sendResult.Success)
                {
                    wallet.Balance -= 1;
                    wallet.TotalSent += 1;
                    wallet.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return sendResult.Success
                    ? ServiceResult<bool>.Ok(true)
                    : ServiceResult<bool>.Fail(sendResult.Message ?? "Failed to send confirmation");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp booking confirmation");
                return ServiceResult<bool>.Fail("Error sending confirmation");
            }
        }
    }
}
