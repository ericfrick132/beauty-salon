using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
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
        private readonly IConfiguration _configuration;
        private readonly HttpClient _http;

        public WhatsAppService(ApplicationDbContext context, ILogger<WhatsAppService> logger, IConfiguration configuration, IHttpClientFactory httpFactory)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _http = httpFactory.CreateClient();
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

                var settings = await _context.TenantMessagingSettings.FirstOrDefaultAsync(s => s.TenantId == booking.TenantId);
                if (settings == null || !settings.WhatsAppRemindersEnabled)
                {
                    return ServiceResult<bool>.Fail("WhatsApp reminders disabled");
                }

                // Check wallet
                var wallet = await _context.TenantMessageWallets.FirstOrDefaultAsync(w => w.TenantId == booking.TenantId);
                if (wallet == null || wallet.Balance <= 0)
                {
                    return ServiceResult<bool>.Fail("Insufficient message credits");
                }

                var toPhone = booking.Customer?.Phone;
                if (string.IsNullOrWhiteSpace(toPhone))
                {
                    return ServiceResult<bool>.Fail("Customer has no phone");
                }

                // Twilio configuration
                var accountSid = _configuration["Twilio:AccountSid"];
                var authToken = _configuration["Twilio:AuthToken"];
                var fromWhatsApp = _configuration["Twilio:WhatsAppFrom"]; // e.g., whatsapp:+14155238886
                if (string.IsNullOrWhiteSpace(accountSid) || string.IsNullOrWhiteSpace(authToken) || string.IsNullOrWhiteSpace(fromWhatsApp))
                {
                    return ServiceResult<bool>.Fail("Twilio not configured");
                }

                // Normalize phone: ensure whatsapp:+ prefix and country code
                var to = toPhone.StartsWith("whatsapp:") ? toPhone : $"whatsapp:{toPhone}";

                var timeLocal = booking.StartTime.ToLocalTime();
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == booking.TenantId);
                var template = settings.ReminderTemplate ?? "Hola {customer_name}! Te recordamos tu turno para {service_name} el {date} a las {time}.";
                string body = template
                    .Replace("{customer_name}", (booking.Customer?.FirstName + " " + (booking.Customer?.LastName ?? "")).Trim())
                    .Replace("{service_name}", booking.Service?.Name ?? "servicio")
                    .Replace("{date}", timeLocal.ToString("dd/MM/yyyy"))
                    .Replace("{time}", timeLocal.ToString("HH:mm"))
                    .Replace("{business_name}", tenant?.BusinessName ?? "");

                var url = $"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json";

                var form = new List<KeyValuePair<string, string>>
                {
                    new("From", fromWhatsApp),
                    new("To", to),
                    new("Body", body)
                };

                var req = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new FormUrlEncodedContent(form)
                };
                var authBytes = Encoding.ASCII.GetBytes($"{accountSid}:{authToken}");
                req.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                var response = await _http.SendAsync(req);
                var content = await response.Content.ReadAsStringAsync();

                var log = new MessageLog
                {
                    TenantId = booking.TenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Channel = "whatsapp",
                    MessageType = "reminder",
                    Status = response.IsSuccessStatusCode ? "sent" : "failed",
                    To = to,
                    Body = body,
                    SentAt = response.IsSuccessStatusCode ? DateTime.UtcNow : null,
                };

                try
                {
                    var json = JsonSerializer.Deserialize<JsonElement>(content);
                    if (json.TryGetProperty("sid", out var sid))
                    {
                        log.ProviderMessageId = sid.GetString();
                    }
                    if (!response.IsSuccessStatusCode)
                    {
                        log.ErrorMessage = json.TryGetProperty("message", out var msg) ? msg.GetString() : content;
                    }
                }
                catch
                {
                    if (!response.IsSuccessStatusCode) log.ErrorMessage = content;
                }

                _context.MessageLogs.Add(log);

                if (response.IsSuccessStatusCode)
                {
                    wallet.Balance -= 1;
                    wallet.TotalSent += 1;
                    wallet.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return response.IsSuccessStatusCode
                    ? ServiceResult<bool>.Ok(true)
                    : ServiceResult<bool>.Fail(log.ErrorMessage ?? "Failed to send message");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp reminder");
                return ServiceResult<bool>.Fail("Error sending reminder");
            }
        }
    }
}
