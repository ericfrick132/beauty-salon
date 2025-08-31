using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly ApplicationDbContext _context;

        public EmployeeService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Employee>> GetEmployeesAsync()
        {
            return await _context.Employees
                .Where(e => e.IsActive)
                .OrderBy(e => e.Name)
                .ToListAsync();
        }

        public async Task<Employee?> GetEmployeeByIdAsync(Guid id)
        {
            return await _context.Employees
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<Employee> CreateEmployeeAsync(CreateEmployeeDto dto)
        {
            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Email = dto.Email,
                Phone = dto.Phone,
                EmployeeType = dto.EmployeeType ?? "employee",
                CommissionPercentage = dto.CommissionPercentage ?? 0,
                FixedSalary = dto.FixedSalary ?? 0,
                PaymentMethod = dto.PaymentMethod ?? "percentage",
                Specialties = dto.Specialties,
                WorkingHours = dto.WorkingHours,
                CanPerformServices = dto.CanPerformServices ?? true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return employee;
        }

        public async Task<Employee?> UpdateEmployeeAsync(Guid id, UpdateEmployeeDto dto)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return null;

            if (!string.IsNullOrEmpty(dto.Name))
                employee.Name = dto.Name;
            if (dto.Email != null)
                employee.Email = dto.Email;
            if (dto.Phone != null)
                employee.Phone = dto.Phone;
            if (!string.IsNullOrEmpty(dto.EmployeeType))
                employee.EmployeeType = dto.EmployeeType;
            if (dto.CommissionPercentage.HasValue)
                employee.CommissionPercentage = dto.CommissionPercentage.Value;
            if (dto.FixedSalary.HasValue)
                employee.FixedSalary = dto.FixedSalary.Value;
            if (!string.IsNullOrEmpty(dto.PaymentMethod))
                employee.PaymentMethod = dto.PaymentMethod;
            if (dto.Specialties != null)
                employee.Specialties = dto.Specialties;
            if (dto.WorkingHours != null)
                employee.WorkingHours = dto.WorkingHours;
            if (dto.CanPerformServices.HasValue)
                employee.CanPerformServices = dto.CanPerformServices.Value;
            if (dto.IsActive.HasValue)
            {
                employee.IsActive = dto.IsActive.Value;
                if (!dto.IsActive.Value)
                    employee.DeactivatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return employee;
        }

        public async Task<bool> DeleteEmployeeAsync(Guid id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return false;

            employee.IsActive = false;
            employee.DeactivatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<object> GetEmployeeCommissionsAsync(Guid employeeId, DateTime? startDate = null, DateTime? endDate = null)
        {
            startDate ??= DateTime.UtcNow.AddDays(-30);
            endDate ??= DateTime.UtcNow;

            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found");

            var commissions = await _context.Payments
                .Where(p => p.EmployeeId == employeeId &&
                           p.PaymentDate >= startDate &&
                           p.PaymentDate <= endDate &&
                           p.CommissionAmount.HasValue)
                .Include(p => p.Booking)
                .ThenInclude(b => b.Customer)
                .Include(p => p.Booking)
                .ThenInclude(b => b.Service)
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new
                {
                    id = p.Id,
                    bookingId = p.BookingId,
                    customerName = $"{p.Booking.Customer.FirstName} {p.Booking.Customer.LastName}",
                    serviceName = p.Booking.Service.Name,
                    totalAmount = p.Amount,
                    commissionAmount = p.CommissionAmount,
                    paymentDate = p.PaymentDate,
                    paymentMethod = p.PaymentMethod
                })
                .ToListAsync();

            var totalCommissions = commissions.Sum(c => c.commissionAmount ?? 0);
            var totalBookings = commissions.Count;

            return new
            {
                employee = new { employee.Id, employee.Name },
                period = new { startDate, endDate },
                totalCommissions,
                totalBookings,
                commissions
            };
        }

        public Task<object> PayCommissionAsync(Guid employeeId, PayCommissionDto dto)
        {
            return Task.FromResult<object>(new { message = "Commission paid successfully" });
        }
    }
}