using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Common;

namespace BookingPro.API.Services.Interfaces
{
    public interface IBookingService
    {
        Task<ServiceResult<IEnumerable<BookingListDto>>> GetBookingsAsync(DateTime? date = null, Guid? employeeId = null, string? status = null);
        Task<ServiceResult<BookingDetailDto>> GetBookingByIdAsync(Guid id);
        Task<ServiceResult<Booking>> CreateBookingAsync(CreateBookingDto dto);
        Task<ServiceResult<Booking>> UpdateBookingAsync(Guid id, UpdateBookingDto dto);
        Task<ServiceResult> DeleteBookingAsync(Guid id);
        Task<ServiceResult<IEnumerable<string>>> GetAvailableTimeSlotsAsync(Guid professionalId, DateTime date, Guid serviceId);
    }
}