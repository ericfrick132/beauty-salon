using System.Collections.Concurrent;
using BookingPro.API.Data;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    // Bot de confirmación de turnos por WhatsApp (add-on "confirmation_bot").
    // Pide confirmación X minutos antes del turno; la respuesta del cliente
    // se procesa en WebhooksController (messages.upsert).
    public class BookingConfirmationBotService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BookingConfirmationBotService> _logger;
        private readonly int _checkIntervalMinutes;
        private readonly int _throttleMs;
        private static readonly SemaphoreSlim _sendLock = new(1, 1);
        private static readonly ConcurrentDictionary<Guid, bool> _webhookEnsured = new();

        public BookingConfirmationBotService(
            IServiceProvider serviceProvider,
            ILogger<BookingConfirmationBotService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _checkIntervalMinutes = configuration.GetValue("EvolutionApi:ReminderCheckIntervalMinutes", 2);
            _throttleMs = configuration.GetValue("EvolutionApi:ThrottleMs", 1500);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessDueConfirmations(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in booking confirmation bot service");
                }

                await Task.Delay(TimeSpan.FromMinutes(_checkIntervalMinutes), stoppingToken);
            }
        }

        private async Task ProcessDueConfirmations(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var connectionService = scope.ServiceProvider.GetRequiredService<IWhatsAppConnectionService>();
            var featureAddons = scope.ServiceProvider.GetRequiredService<IFeatureAddonService>();

            var enabledSettings = await context.TenantMessagingSettings
                .IgnoreQueryFilters()
                .Where(s => s.ConfirmationBotEnabled)
                .ToListAsync(ct);

            foreach (var settings in enabledSettings)
            {
                if (ct.IsCancellationRequested) break;

                try
                {
                    await ProcessTenantConfirmations(context, connectionService, featureAddons, settings, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing confirmations for tenant {TenantId}", settings.TenantId);
                }
            }

            await ExpireStaleRequests(context, ct);
        }

        private async Task ProcessTenantConfirmations(
            ApplicationDbContext context,
            IWhatsAppConnectionService connectionService,
            IFeatureAddonService featureAddons,
            TenantMessagingSettings settings,
            CancellationToken ct)
        {
            // El bot es un add-on pago: sin vigencia, no se envía nada
            if (!await featureAddons.HasActiveAddonAsync(settings.TenantId, FeatureCodes.ConfirmationBot))
            {
                return;
            }

            var connection = await connectionService.GetConnectionByTenantIdAsync(settings.TenantId);
            if (connection == null || connection.Status != "open")
            {
                return;
            }

            // Instancias conectadas antes del bot no están suscriptas a MESSAGES_UPSERT
            if (_webhookEnsured.TryAdd(settings.TenantId, true))
            {
                await connectionService.EnsureInboundWebhookAsync(settings.TenantId);
            }

            var wallet = await context.TenantMessageWallets
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(w => w.TenantId == settings.TenantId, ct);
            if (wallet == null || wallet.Balance <= 0)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var windowEnd = now.AddMinutes(settings.ConfirmationAdvanceMinutes);

            // Turnos que entran en la ventana de anticipación y todavía no tienen pedido.
            // Se excluyen los reservados dentro de la ventana (recién agendados, no necesitan confirmación).
            var bookings = await context.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Customer)
                .Include(b => b.Service)
                .Where(b => b.TenantId == settings.TenantId
                    && (b.Status == "pending" || b.Status == "confirmed")
                    && b.StartTime > now
                    && b.StartTime <= windowEnd
                    && b.CreatedAt < b.StartTime.AddMinutes(-settings.ConfirmationAdvanceMinutes)
                    // El IgnoreQueryFilters del query raíz aplica también a esta subquery
                    && !context.BookingConfirmationRequests.Any(r => r.BookingId == b.Id))
                .OrderBy(b => b.StartTime)
                .Take(50)
                .ToListAsync(ct);

            if (bookings.Count == 0) return;

            var tenant = await context.Tenants
                .FirstOrDefaultAsync(t => t.Id == settings.TenantId, ct);

            _logger.LogInformation("Confirmation bot: {Count} bookings to confirm for tenant {TenantId}",
                bookings.Count, settings.TenantId);

            foreach (var booking in bookings)
            {
                if (ct.IsCancellationRequested || wallet.Balance <= 0) break;

                var phone = booking.Customer?.Phone;
                if (string.IsNullOrWhiteSpace(phone)) continue;

                var timeLocal = booking.StartTime.ToLocalTime();
                var template = settings.ConfirmationTemplate
                    ?? "Hola {customer_name}! Te escribimos de {business_name} por tu turno de {service_name} el {date} a las {time}.";
                var body = template
                    .Replace("{customer_name}", (booking.Customer?.FirstName + " " + (booking.Customer?.LastName ?? "")).Trim())
                    .Replace("{service_name}", booking.Service?.Name ?? "servicio")
                    .Replace("{date}", timeLocal.ToString("dd/MM/yyyy"))
                    .Replace("{time}", timeLocal.ToString("HH:mm"))
                    .Replace("{business_name}", tenant?.BusinessName ?? "");
                body += "\n\nRespondé *1* para confirmar tu turno ✅ o *2* para cancelarlo ❌";

                await _sendLock.WaitAsync(ct);
                try
                {
                    var sendResult = await connectionService.SendTextAsync(settings.TenantId, phone, body);

                    var normalizedPhone = new string(phone.Where(char.IsDigit).ToArray());
                    context.MessageLogs.Add(new MessageLog
                    {
                        TenantId = settings.TenantId,
                        BookingId = booking.Id,
                        CustomerId = booking.CustomerId,
                        Channel = "whatsapp",
                        MessageType = "confirmation_request",
                        Status = sendResult.Success ? "sent" : "failed",
                        To = phone,
                        Body = body,
                        SentAt = sendResult.Success ? DateTime.UtcNow : null,
                        ProviderMessageId = sendResult.Data,
                        ErrorMessage = sendResult.Success ? null : sendResult.Message
                    });

                    if (sendResult.Success)
                    {
                        context.BookingConfirmationRequests.Add(new BookingConfirmationRequest
                        {
                            TenantId = settings.TenantId,
                            BookingId = booking.Id,
                            CustomerId = booking.CustomerId,
                            Phone = normalizedPhone,
                            Status = "sent",
                            ProviderMessageId = sendResult.Data,
                            SentAt = DateTime.UtcNow
                        });

                        wallet.Balance -= 1;
                        wallet.TotalSent += 1;
                        wallet.UpdatedAt = DateTime.UtcNow;
                        _logger.LogInformation("Sent confirmation request for booking {BookingId} to {Phone}",
                            booking.Id, phone);
                    }
                    else
                    {
                        _logger.LogWarning("Failed to send confirmation request for booking {BookingId}: {Error}",
                            booking.Id, sendResult.Message);
                    }

                    await context.SaveChangesAsync(ct);
                    await Task.Delay(_throttleMs, ct);
                }
                finally
                {
                    _sendLock.Release();
                }
            }
        }

        private async Task ExpireStaleRequests(ApplicationDbContext context, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var stale = await context.BookingConfirmationRequests
                .Where(r => r.Status == "sent")
                .Join(context.Bookings,
                    r => r.BookingId, b => b.Id, (r, b) => new { Request = r, b.StartTime })
                .Where(x => x.StartTime < now)
                .Select(x => x.Request)
                .IgnoreQueryFilters()
                .ToListAsync(ct);

            if (stale.Count == 0) return;

            foreach (var request in stale)
            {
                request.Status = "expired";
                request.UpdatedAt = now;
            }
            await context.SaveChangesAsync(ct);
        }
    }
}
