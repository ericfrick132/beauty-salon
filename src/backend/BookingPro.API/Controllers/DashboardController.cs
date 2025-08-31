using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
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
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;

        public DashboardController(
            ApplicationDbContext context,
            ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
        }

        [HttpGet("financial-stats")]
        public async Task<IActionResult> GetFinancialStats(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var now = DateTime.UtcNow;
                startDate ??= new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                endDate ??= now;

                // Facturación total (todos los ingresos)
                var totalRevenue = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate)
                    .SumAsync(p => p.Amount);

                // Calcular sueldos y comisiones a pagar
                var employees = await _context.Employees
                    .Where(e => e.IsActive)
                    .ToListAsync();

                decimal totalSalaries = 0;
                decimal totalCommissions = 0;

                foreach (var employee in employees)
                {
                    // Calcular según el método de pago
                    if (employee.PaymentMethod == "fixed" || employee.PaymentMethod == "mixed")
                    {
                        // Sueldo fijo mensual prorrateado
                        var daysInPeriod = (endDate.Value - startDate.Value).Days + 1;
                        var monthlyDays = DateTime.DaysInMonth(startDate.Value.Year, startDate.Value.Month);
                        totalSalaries += (employee.FixedSalary * daysInPeriod) / monthlyDays;
                    }

                    if (employee.PaymentMethod == "percentage" || employee.PaymentMethod == "mixed")
                    {
                        // Comisiones basadas en servicios realizados
                        var employeeRevenue = await _context.Payments
                            .Where(p => p.EmployeeId == employee.Id &&
                                       p.PaymentDate >= startDate && 
                                       p.PaymentDate <= endDate)
                            .SumAsync(p => p.Amount);

                        totalCommissions += employeeRevenue * (employee.CommissionPercentage / 100);
                    }
                }

                // Ganancia neta = Facturación - Sueldos - Comisiones
                var netProfit = totalRevenue - totalSalaries - totalCommissions;

                // Comparación con período anterior
                var previousStart = startDate.Value.AddMonths(-1);
                var previousEnd = startDate.Value.AddDays(-1);

                var previousRevenue = await _context.Payments
                    .Where(p => p.PaymentDate >= previousStart && p.PaymentDate <= previousEnd)
                    .SumAsync(p => p.Amount);

                var revenueGrowth = previousRevenue > 0 
                    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
                    : 0;

                return Ok(new
                {
                    totalRevenue,
                    totalSalaries,
                    totalCommissions,
                    totalExpenses = totalSalaries + totalCommissions,
                    netProfit,
                    profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
                    revenueGrowth,
                    period = new
                    {
                        start = startDate,
                        end = endDate
                    },
                    breakdown = new
                    {
                        salariesPercentage = totalRevenue > 0 ? (totalSalaries / totalRevenue) * 100 : 0,
                        commissionsPercentage = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0,
                        netProfitPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("payroll")]
        public async Task<IActionResult> GetPayroll(
            [FromQuery] string period = "monthly", // monthly, weekly
            [FromQuery] DateTime? date = null)
        {
            try
            {
                var referenceDate = date ?? DateTime.UtcNow;
                DateTime startDate, endDate;

                if (period == "weekly")
                {
                    // Calcular semana (lunes a domingo)
                    int daysToMonday = ((int)referenceDate.DayOfWeek - 1 + 7) % 7;
                    startDate = referenceDate.AddDays(-daysToMonday).Date;
                    endDate = startDate.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59);
                }
                else // monthly
                {
                    startDate = new DateTime(referenceDate.Year, referenceDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    endDate = startDate.AddMonths(1).AddDays(-1).AddHours(23).AddMinutes(59).AddSeconds(59);
                }

                var employees = await _context.Employees
                    .Where(e => e.IsActive)
                    .ToListAsync();

                var payrollItems = new List<object>();

                foreach (var employee in employees)
                {
                    decimal fixedSalary = 0;
                    decimal commissions = 0;
                    int servicesCount = 0;

                    // Calcular sueldo fijo
                    if (employee.PaymentMethod == "fixed" || employee.PaymentMethod == "mixed")
                    {
                        if (period == "weekly")
                        {
                            // Sueldo semanal = mensual / 4.33
                            fixedSalary = employee.FixedSalary / 4.33m;
                        }
                        else
                        {
                            fixedSalary = employee.FixedSalary;
                        }
                    }

                    // Calcular comisiones
                    if (employee.PaymentMethod == "percentage" || employee.PaymentMethod == "mixed")
                    {
                        var payments = await _context.Payments
                            .Include(p => p.Booking)
                                .ThenInclude(b => b.Service)
                            .Where(p => p.EmployeeId == employee.Id &&
                                       p.PaymentDate >= startDate &&
                                       p.PaymentDate <= endDate)
                            .ToListAsync();

                        servicesCount = payments.Count;
                        var revenue = payments.Sum(p => p.Amount);
                        commissions = revenue * (employee.CommissionPercentage / 100);
                    }

                    var totalToPay = fixedSalary + commissions;

                    payrollItems.Add(new
                    {
                        employeeId = employee.Id,
                        employeeName = employee.Name,
                        employeeType = employee.EmployeeType,
                        paymentMethod = employee.PaymentMethod,
                        servicesCount,
                        fixedSalary = Math.Round(fixedSalary, 2),
                        commissionPercentage = employee.CommissionPercentage,
                        commissions = Math.Round(commissions, 2),
                        totalToPay = Math.Round(totalToPay, 2),
                        isPaid = false, // TODO: Implement payment tracking
                        paymentStatus = "pending" // pending, partial, paid
                    });
                }

                var totalPayroll = payrollItems.Sum(p => (decimal)((dynamic)p).totalToPay);

                return Ok(new
                {
                    period,
                    periodStart = startDate,
                    periodEnd = endDate,
                    employees = payrollItems.OrderByDescending(p => ((dynamic)p).totalToPay),
                    summary = new
                    {
                        totalEmployees = payrollItems.Count,
                        totalFixedSalaries = payrollItems.Sum(p => (decimal)((dynamic)p).fixedSalary),
                        totalCommissions = payrollItems.Sum(p => (decimal)((dynamic)p).commissions),
                        totalPayroll,
                        pendingPayments = payrollItems.Count(p => ((dynamic)p).paymentStatus == "pending"),
                        partialPayments = payrollItems.Count(p => ((dynamic)p).paymentStatus == "partial"),
                        completedPayments = payrollItems.Count(p => ((dynamic)p).paymentStatus == "paid")
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("payroll/mark-paid")]
        public async Task<IActionResult> MarkPayrollPaid([FromBody] MarkPayrollPaidDto dto)
        {
            try
            {
                // TODO: Implementar registro de pagos de nómina
                // Esto debería crear registros en una tabla de PayrollPayments
                // para trackear qué sueldos/comisiones han sido pagados

                return Ok(new { 
                    message = "Payroll marked as paid", 
                    employeeId = dto.EmployeeId,
                    amount = dto.Amount,
                    period = dto.Period
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("revenue-by-employee")]
        public async Task<IActionResult> GetRevenueByEmployee(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var now = DateTime.UtcNow;
                startDate ??= new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                endDate ??= now;

                var employeeRevenue = await _context.Payments
                    .Include(p => p.Employee)
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate)
                    .GroupBy(p => new { p.EmployeeId, p.Employee.Name })
                    .Select(g => new
                    {
                        employeeId = g.Key.EmployeeId,
                        employeeName = g.Key.Name,
                        totalRevenue = g.Sum(p => p.Amount),
                        servicesCount = g.Count(),
                        averageTicket = g.Average(p => p.Amount)
                    })
                    .OrderByDescending(e => e.totalRevenue)
                    .ToListAsync();

                return Ok(employeeRevenue);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class MarkPayrollPaidDto
    {
        public Guid EmployeeId { get; set; }
        public decimal Amount { get; set; }
        public string Period { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = "transfer";
        public string? Notes { get; set; }
    }
}