using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    public interface IChytapayService
    {
        /// <summary>
        /// Creates a Chytapay payment_request for a booking using the tenant's
        /// connected Chytapay account.
        /// </summary>
        Task<ServiceResult<ChytapayPaymentRequestResultDto>> CreatePaymentRequestAsync(
            string tenantId, CreateChytapayPaymentRequestDto dto);

        /// <summary>
        /// Webhook handler — Chytapay POSTs to /api/webhooks/chytapay when a
        /// payment is received. We match by referenceId to the PaymentTransaction
        /// and update Booking + Payment accordingly.
        /// </summary>
        Task<ServiceResult<bool>> ProcessWebhookAsync(ChytapayWebhookPayloadDto payload);
    }
}
