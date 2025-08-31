using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    public interface IPublicService
    {
        Task<IEnumerable<Service>> GetServicesAsync();
        Task<Service?> GetServiceByIdAsync(Guid id);
        Task<IEnumerable<Employee>> GetEmployeesAsync();
        Task<Employee?> GetEmployeeByIdAsync(Guid id);
        Task<IEnumerable<string>> GetAvailableTimeSlotsAsync(Guid professionalId, DateTime date, Guid serviceId);
        Task<Booking> CreatePublicBookingAsync(CreatePublicBookingDto dto);
    }
}