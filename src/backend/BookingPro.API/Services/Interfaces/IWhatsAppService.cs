using BookingPro.API.Models.Common;

namespace BookingPro.API.Services.Interfaces
{
    public interface IWhatsAppService
    {
        Task<ServiceResult<bool>> SendBookingReminderAsync(Guid bookingId);
    }
}

