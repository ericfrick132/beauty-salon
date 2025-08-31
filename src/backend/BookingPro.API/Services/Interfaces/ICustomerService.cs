using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Common;

namespace BookingPro.API.Services.Interfaces
{
    public interface ICustomerService
    {
        Task<ServiceResult<IEnumerable<CustomerListDto>>> GetCustomersAsync();
        Task<ServiceResult<CustomerDetailDto>> GetCustomerByIdAsync(Guid id);
        Task<ServiceResult<Customer>> CreateCustomerAsync(CreateCustomerDto dto);
        Task<ServiceResult<Customer>> UpdateCustomerAsync(Guid id, UpdateCustomerDto dto);
        Task<ServiceResult> DeleteCustomerAsync(Guid id);
        Task<ServiceResult<IEnumerable<CustomerSearchDto>>> SearchCustomersAsync(string searchTerm);
    }
}