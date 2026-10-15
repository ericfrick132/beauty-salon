using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Utilities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Lo que pasa cuando se acredita la seña de un turno, igual para Mercado Pago (webhook del pago) y para
    /// Stripe Connect (checkout.session.completed): el turno queda confirmado y se registra el cobro como
    /// Payment "completed" (lo que el panel usa para marcarlo pago), una sola vez por pago del proveedor.
    /// No guarda: el que llama hace SaveChanges.
    /// </summary>
    public static class DepositConfirmation
    {
        public sealed record PaidDeposit(
            string Provider,              // "mercadopago" | "stripe"
            string? ExternalPaymentId,    // id del pago de MP / PaymentIntent de Stripe
            string? MercadoPagoPreferenceId,
            decimal Amount,
            string? PayerEmail,
            DateTime PaidAt,
            string PaymentType,
            string Notes);

        public static async Task<Booking?> ConfirmBookingAsync(ApplicationDbContext context, Guid tenantId, Guid bookingId, PaidDeposit paid)
        {
            var booking = await context.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Customer)
                .Include(b => b.Service)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);
            if (booking == null) return null;

            booking.Status = "confirmed";
            booking.UpdatedAt = DateTime.UtcNow;

            var externalId = paid.ExternalPaymentId;
            var isMercadoPago = paid.Provider == "mercadopago";
            var alreadyRecorded = isMercadoPago
                ? booking.Payments.Any(p => p.MercadoPagoPaymentId == externalId)
                : booking.Payments.Any(p => p.PaymentMethod == paid.Provider && p.TransactionId == externalId);

            if (!alreadyRecorded && !string.IsNullOrEmpty(externalId))
            {
                var recorded = new Payment
                {
                    TenantId = tenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Amount = paid.Amount,
                    PaymentMethod = paid.Provider,
                    Status = "completed",
                    MercadoPagoPaymentId = isMercadoPago ? externalId : null,
                    MercadoPagoPreferenceId = isMercadoPago ? paid.MercadoPagoPreferenceId : null,
                    TransactionId = externalId,
                    PayerEmail = paid.PayerEmail,
                    PaymentDate = paid.PaidAt,
                    PaymentType = paid.PaymentType,
                    Notes = paid.Notes,
                };
                context.Payments.Add(recorded);
                booking.Payments.Add(recorded);
            }

            return booking;
        }

        /// <summary>
        /// True si la transacción la creó el asistente de WhatsApp (Origin = "whatsapp_bot" en MetadataJson,
        /// que solo se setea desde código: CreatePaymentDto.Origin no se bindea desde HTTP).
        /// </summary>
        public static bool IsFromWhatsAppBot(PaymentTransaction transaction)
        {
            if (string.IsNullOrWhiteSpace(transaction.MetadataJson)) return false;
            try
            {
                using var doc = JsonDocument.Parse(transaction.MetadataJson);
                return doc.RootElement.ValueKind == JsonValueKind.Object
                    && doc.RootElement.TryGetProperty("Origin", out var origin)
                    && origin.ValueKind == JsonValueKind.String
                    && origin.GetString() == CreatePaymentDto.WhatsAppBotOrigin;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        /// <summary>
        /// Le avisa al cliente por el WhatsApp del negocio (Evolution) que su seña se acreditó. Solo si el
        /// turno tiene un teléfono real (los turnos del asistente guardan el número de WhatsApp) y el
        /// negocio tiene WhatsApp conectado. La vista previa del panel ("preview-panel") no tiene dígitos,
        /// así que nunca manda nada. Cualquier error se loguea y se ignora. Lo usan Mercado Pago y Stripe.
        /// </summary>
        public static async Task NotifyDepositReceivedAsync(ApplicationDbContext context, IWhatsAppConnectionService whatsApp,
            ILogger logger, Guid tenantId, Booking booking, decimal amount)
        {
            try
            {
                var phone = new string((booking.Customer?.Phone ?? "").Where(char.IsDigit).ToArray());
                if (phone.Length < 8) return;

                var connection = await whatsApp.GetConnectionByTenantIdAsync(tenantId);
                if (connection == null || connection.Status != "open") return;

                var tenant = await context.Tenants.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
                // Hora y moneda del negocio (zona IANA o el offset viejo "-3"; sin configurar → Argentina).
                var local = TenantTime.ToLocal(booking.StartTime, TenantTime.For(tenant));
                var es = MoneyFormat.CultureFor(tenant);
                var day = local.ToString("dddd dd/MM", es);
                day = string.IsNullOrEmpty(day) ? day : char.ToUpper(day[0]) + day[1..];
                var money = MoneyFormat.Format(amount, tenant);

                var w = Wording.For(tenant);
                var msg = w.T(
                    $"¡Recibimos tu seña de {money} ✅! Tu turno del {day} a las {local:HH:mm} quedó confirmado. ¡Te esperamos!",
                    $"¡Recibimos tu anticipo de {money} ✅! Tu cita del {day} a las {local:HH:mm} quedó confirmada. ¡Te esperamos!",
                    $"¡Hemos recibido tu señal de {money} ✅! Tu cita del {day} a las {local:HH:mm} ha quedado confirmada. ¡Te esperamos!");
                var send = await whatsApp.SendTextAsync(tenantId, phone, msg);
                if (!send.Success)
                    logger.LogWarning("Seña acreditada: no se pudo avisar por WhatsApp al turno {BookingId}: {Error}", booking.Id, send.Message);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Seña acreditada: no se pudo avisar por WhatsApp al turno {BookingId}", booking.Id);
            }
        }
    }
}
