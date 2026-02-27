using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class WhatsAppReminderService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<WhatsAppReminderService> _logger;
        private readonly int _checkIntervalMinutes;
        private readonly int _throttleMs;
        private static readonly SemaphoreSlim _sendLock = new(1, 1);

        public WhatsAppReminderService(
            IServiceProvider serviceProvider,
            ILogger<WhatsAppReminderService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _checkIntervalMinutes = configuration.GetValue("EvolutionApi:ReminderCheckIntervalMinutes", 2);
            _throttleMs = configuration.GetValue("EvolutionApi:ThrottleMs", 1500);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Initial delay to let app startup complete
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessDueReminders(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in WhatsApp reminder service");
                }

                await Task.Delay(TimeSpan.FromMinutes(_checkIntervalMinutes), stoppingToken);
            }
        }

        private async Task ProcessDueReminders(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var connectionService = scope.ServiceProvider.GetRequiredService<IWhatsAppConnectionService>();

            // Get all tenants with WhatsApp reminders enabled
            var enabledSettings = await context.TenantMessagingSettings
                .IgnoreQueryFilters()
                .Where(s => s.WhatsAppRemindersEnabled)
                .ToListAsync(ct);

            _logger.LogInformation("WhatsApp reminder check: {Count} tenants with reminders enabled", enabledSettings.Count);

            foreach (var settings in enabledSettings)
            {
                if (ct.IsCancellationRequested) break;

                try
                {
                    await ProcessTenantReminders(context, connectionService, settings, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing reminders for tenant {TenantId}", settings.TenantId);
                }
            }
        }

        private async Task ProcessTenantReminders(
            ApplicationDbContext context,
            IWhatsAppConnectionService connectionService,
            TenantMessagingSettings settings,
            CancellationToken ct)
        {
            // Verify WhatsApp connection is open
            var connection = await connectionService.GetConnectionByTenantIdAsync(settings.TenantId);
            if (connection == null || connection.Status != "open")
            {
                return;
            }

            // Check wallet balance
            var wallet = await context.TenantMessageWallets
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(w => w.TenantId == settings.TenantId, ct);
            if (wallet == null || wallet.Balance <= 0)
            {
                return;
            }

            // Calculate reminder window: now + ReminderAdvanceMinutes +/- 5 min
            var now = DateTime.UtcNow;
            var targetTime = now.AddMinutes(settings.ReminderAdvanceMinutes);
            var windowStart = targetTime.AddMinutes(-5);
            var windowEnd = targetTime.AddMinutes(5);

            // Find bookings due for reminders
            var bookings = await context.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Customer)
                .Include(b => b.Service)
                .Where(b => b.TenantId == settings.TenantId
                    && b.Status == "confirmed"
                    && !b.ReminderSent
                    && b.StartTime >= windowStart
                    && b.StartTime <= windowEnd)
                .ToListAsync(ct);

            if (bookings.Count == 0) return;

            var tenant = await context.Tenants
                .FirstOrDefaultAsync(t => t.Id == settings.TenantId, ct);

            _logger.LogInformation("Processing {Count} reminders for tenant {TenantId}",
                bookings.Count, settings.TenantId);

            foreach (var booking in bookings)
            {
                if (ct.IsCancellationRequested || wallet.Balance <= 0) break;

                var phone = booking.Customer?.Phone;
                if (string.IsNullOrWhiteSpace(phone)) continue;

                // Check for duplicate in MessageLog
                var alreadySent = await context.MessageLogs
                    .IgnoreQueryFilters()
                    .AnyAsync(l => l.BookingId == booking.Id
                        && l.MessageType == "reminder"
                        && l.Status == "sent", ct);
                if (alreadySent) continue;

                // Build message from template
                var timeLocal = booking.StartTime.ToLocalTime();
                var template = settings.ReminderTemplate
                    ?? "Hola {customer_name}! Te recordamos tu turno para {service_name} el {date} a las {time}.";
                var body = template
                    .Replace("{customer_name}", (booking.Customer?.FirstName + " " + (booking.Customer?.LastName ?? "")).Trim())
                    .Replace("{service_name}", booking.Service?.Name ?? "servicio")
                    .Replace("{date}", timeLocal.ToString("dd/MM/yyyy"))
                    .Replace("{time}", timeLocal.ToString("HH:mm"))
                    .Replace("{business_name}", tenant?.BusinessName ?? "");

                // Rate-limited send
                await _sendLock.WaitAsync(ct);
                try
                {
                    var sendResult = await connectionService.SendTextAsync(settings.TenantId, phone, body);

                    var log = new MessageLog
                    {
                        TenantId = settings.TenantId,
                        BookingId = booking.Id,
                        CustomerId = booking.CustomerId,
                        Channel = "whatsapp",
                        MessageType = "reminder",
                        Status = sendResult.Success ? "sent" : "failed",
                        To = phone,
                        Body = body,
                        SentAt = sendResult.Success ? DateTime.UtcNow : null,
                        ProviderMessageId = sendResult.Data,
                        ErrorMessage = sendResult.Success ? null : sendResult.Message
                    };
                    context.MessageLogs.Add(log);

                    if (sendResult.Success)
                    {
                        booking.ReminderSent = true;
                        wallet.Balance -= 1;
                        wallet.TotalSent += 1;
                        wallet.UpdatedAt = DateTime.UtcNow;
                        _logger.LogInformation("Sent reminder for booking {BookingId} to {Phone}",
                            booking.Id, phone);
                    }
                    else
                    {
                        _logger.LogWarning("Failed to send reminder for booking {BookingId}: {Error}",
                            booking.Id, sendResult.Message);
                    }

                    await context.SaveChangesAsync(ct);

                    // Rate limiting delay
                    await Task.Delay(_throttleMs, ct);
                }
                finally
                {
                    _sendLock.Release();
                }
            }
        }
    }
}
