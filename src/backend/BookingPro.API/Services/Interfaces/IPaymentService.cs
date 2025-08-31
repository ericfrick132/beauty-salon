using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    public interface IPaymentService
    {
        Task<IEnumerable<Payment>> GetPaymentsAsync();
        Task<Payment?> GetPaymentByIdAsync(Guid id);
        Task<Payment> CreatePaymentAsync(CreatePaymentDto dto);
        Task<Payment?> UpdatePaymentAsync(Guid id, UpdatePaymentDto dto);
        Task<bool> DeletePaymentAsync(Guid id);
    }
}