using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BookingPro.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;

        public EmployeesController(
            ApplicationDbContext context,
            ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
        }

        [HttpGet]
        public async Task<IActionResult> GetEmployees()
        {
            try
            {
                var employees = await _context.Employees
                    .Where(e => e.IsActive)
                    .Select(e => new
                    {
                        id = e.Id,
                        name = e.Name,
                        email = e.Email,
                        phone = e.Phone,
                        employeeType = e.EmployeeType,
                        commissionPercentage = e.CommissionPercentage,
                        fixedSalary = e.FixedSalary,
                        paymentMethod = e.PaymentMethod,
                        specialties = e.Specialties,
                        workingHours = e.WorkingHours,
                        canPerformServices = e.CanPerformServices,
                        isActive = e.IsActive,
                        createdAt = e.CreatedAt,
                        pendingCommissions = _context.Payments
                            .Where(p => p.EmployeeId == e.Id && p.CommissionAmount != null)
                            .Sum(p => p.CommissionAmount ?? 0)
                    })
                    .OrderBy(e => e.name)
                    .ToListAsync();

                return Ok(employees);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetEmployee(Guid id)
        {
            try
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(e => e.Id == id);

                if (employee == null)
                {
                    return NotFound(new { message = "Employee not found" });
                }

                return Ok(employee);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeDto dto)
        {
            try
            {
                var employee = new Employee
                {
                    Id = Guid.NewGuid(),
                    Name = dto.Name,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    EmployeeType = dto.EmployeeType,
                    CommissionPercentage = dto.CommissionPercentage,
                    FixedSalary = dto.FixedSalary,
                    PaymentMethod = dto.PaymentMethod,
                    Specialties = dto.Specialties,
                    WorkingHours = dto.WorkingHours,
                    CanPerformServices = dto.CanPerformServices,
                    IsActive = dto.IsActive,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Employees.Add(employee);
                await _context.SaveChangesAsync();

                return Ok(new { id = employee.Id, message = "Employee created successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] UpdateEmployeeDto dto)
        {
            try
            {
                var employee = await _context.Employees.FindAsync(id);
                
                if (employee == null)
                {
                    return NotFound(new { message = "Employee not found" });
                }

                employee.Name = dto.Name;
                employee.Email = dto.Email;
                employee.Phone = dto.Phone;
                employee.EmployeeType = dto.EmployeeType;
                employee.CommissionPercentage = dto.CommissionPercentage;
                employee.FixedSalary = dto.FixedSalary;
                employee.PaymentMethod = dto.PaymentMethod;
                employee.Specialties = dto.Specialties;
                employee.WorkingHours = dto.WorkingHours;
                employee.CanPerformServices = dto.CanPerformServices;
                employee.IsActive = dto.IsActive;

                if (!dto.IsActive && employee.IsActive)
                {
                    employee.DeactivatedAt = DateTime.UtcNow;
                }
                else if (dto.IsActive && !employee.IsActive)
                {
                    employee.DeactivatedAt = null;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Employee updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(Guid id)
        {
            try
            {
                var employee = await _context.Employees.FindAsync(id);
                
                if (employee == null)
                {
                    return NotFound(new { message = "Employee not found" });
                }

                // Check if employee has associated bookings
                var hasBookings = await _context.Bookings.AnyAsync(b => b.EmployeeId == id);
                
                if (hasBookings)
                {
                    // Soft delete: deactivate instead of hard delete
                    employee.IsActive = false;
                    employee.DeactivatedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    
                    return Ok(new { message = "Employee deactivated successfully (has associated bookings)" });
                }
                else
                {
                    // Hard delete if no bookings exist
                    _context.Employees.Remove(employee);
                    await _context.SaveChangesAsync();
                    
                    return Ok(new { message = "Employee deleted successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}/commissions")]
        public async Task<IActionResult> GetEmployeeCommissions(
            Guid id,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var employee = await _context.Employees.FindAsync(id);
                
                if (employee == null)
                {
                    return NotFound(new { message = "Employee not found" });
                }

                startDate ??= DateTime.UtcNow.AddMonths(-1);
                endDate ??= DateTime.UtcNow;

                var payments = await _context.Payments
                    .Include(p => p.Booking)
                        .ThenInclude(b => b.Service)
                    .Where(p => p.EmployeeId == id && 
                               p.PaymentDate >= startDate && 
                               p.PaymentDate <= endDate)
                    .ToListAsync();

                var commissions = payments
                    .GroupBy(p => new { 
                        Year = p.PaymentDate.Year, 
                        Month = p.PaymentDate.Month 
                    })
                    .Select(g => new
                    {
                        employeeId = id,
                        employeeName = employee.Name,
                        period = $"{g.Key.Month:00}/{g.Key.Year}",
                        totalServices = g.Count(),
                        totalRevenue = g.Sum(p => p.Amount),
                        commissionPercentage = employee.CommissionPercentage,
                        commissionAmount = g.Sum(p => p.CommissionAmount ?? 0),
                        fixedSalary = employee.FixedSalary,
                        totalEarnings = g.Sum(p => p.CommissionAmount ?? 0) + employee.FixedSalary,
                        isPaid = false // TODO: Implement payment tracking
                    })
                    .OrderByDescending(c => c.period)
                    .ToList();

                return Ok(commissions);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetEmployeeStats()
        {
            try
            {
                var now = DateTime.UtcNow;
                var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

                var stats = new
                {
                    totalEmployees = await _context.Employees.CountAsync(),
                    activeEmployees = await _context.Employees.CountAsync(e => e.IsActive),
                    totalPendingCommissions = await _context.Payments
                        .Where(p => p.CommissionAmount != null)
                        .SumAsync(p => p.CommissionAmount ?? 0),
                    totalPaidThisMonth = await _context.Payments
                        .Where(p => p.PaymentDate >= startOfMonth && p.CommissionAmount != null)
                        .SumAsync(p => p.CommissionAmount ?? 0)
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("commissions/{employeeId}/pay")]
        public IActionResult PayCommission(Guid employeeId, [FromBody] PayCommissionDto dto)
        {
            try
            {
                // TODO: Implement commission payment tracking
                // This would create a payment record for the employee's commission
                
                return Ok(new { message = "Commission paid successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class CreateEmployeeDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string EmployeeType { get; set; } = "employee";
        public decimal CommissionPercentage { get; set; }
        public decimal FixedSalary { get; set; }
        public string PaymentMethod { get; set; } = "percentage";
        
        // Service & Operational fields
        public string? Specialties { get; set; } // JSON array de service_ids
        public string? WorkingHours { get; set; } // JSON horarios por día
        public bool CanPerformServices { get; set; } = true;
        
        public bool IsActive { get; set; } = true;
    }

    public class UpdateEmployeeDto : CreateEmployeeDto
    {
    }

    public class PayCommissionDto
    {
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "transfer";
        public string? Notes { get; set; }
    }
}