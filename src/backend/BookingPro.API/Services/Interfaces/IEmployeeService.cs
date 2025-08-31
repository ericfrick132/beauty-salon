using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    public interface IEmployeeService
    {
        Task<IEnumerable<Employee>> GetEmployeesAsync();
        Task<Employee?> GetEmployeeByIdAsync(Guid id);
        Task<Employee> CreateEmployeeAsync(CreateEmployeeDto dto);
        Task<Employee?> UpdateEmployeeAsync(Guid id, UpdateEmployeeDto dto);
        Task<bool> DeleteEmployeeAsync(Guid id);
        Task<object> GetEmployeeCommissionsAsync(Guid employeeId, DateTime? startDate = null, DateTime? endDate = null);
        Task<object> PayCommissionAsync(Guid employeeId, PayCommissionDto dto);
    }
}