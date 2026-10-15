using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
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
    }
}
