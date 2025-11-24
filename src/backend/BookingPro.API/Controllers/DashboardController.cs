using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using BookingPro.API.Data;
using BookingPro.API.Services;
using BookingPro.API.Models.Entities;

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

        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { message = "Dashboard controller is working", timestamp = DateTime.UtcNow });
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
                var (startDate, endDate, periodKey) = CalculatePeriod(period, date ?? DateTime.UtcNow);

                var employees = await _context.Employees
                    .Where(e => e.IsActive)
                    .ToListAsync();

                var payments = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status != "cancelled")
                    .ToListAsync();

                var sales = await _context.Sales
                    .Where(s => s.SaleDate >= startDate && s.SaleDate <= endDate && s.Status != "cancelled")
                    .Select(s => new { s.EmployeeId, s.TotalAmount })
                    .ToListAsync();

                var payrollPayments = await _context.PayrollPayments
                    .Where(p => p.PeriodKey == periodKey)
                    .ToListAsync();

                var payrollItems = new List<object>();

                foreach (var employee in employees)
                {
                    decimal fixedSalary = 0;
                    decimal commissions = 0;
                    decimal serviceCommission = 0;
                    decimal productCommission = 0;
                    int servicesCount = 0;
                    decimal serviceRevenue = 0;
                    decimal productRevenue = 0;

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

                    // Calcular comisiones separadas para servicios y productos
                    if (employee.PaymentMethod == "percentage" || employee.PaymentMethod == "mixed")
                    {
                        var employeePayments = payments.Where(p => p.EmployeeId == employee.Id);
                        servicesCount = employeePayments.Count();
                        serviceRevenue = employeePayments.Sum(p => p.Amount);

                        var employeeSales = sales.Where(s => s.EmployeeId == employee.Id);
                        productRevenue = employeeSales.Sum(s => s.TotalAmount);

                        var serviceCommissionPct = employee.ServiceCommissionPercentage > 0 
                            ? employee.ServiceCommissionPercentage 
                            : employee.CommissionPercentage;
                        var productCommissionPct = employee.ProductCommissionPercentage > 0 
                            ? employee.ProductCommissionPercentage 
                            : (employee.CommissionPercentage > 0 ? employee.CommissionPercentage : serviceCommissionPct);

                        serviceCommission = serviceRevenue * (serviceCommissionPct / 100);
                        productCommission = productRevenue * (productCommissionPct / 100);
                        commissions = serviceCommission + productCommission;
                    }

                    var totalToPay = fixedSalary + commissions;
                    var paidAmount = payrollPayments.Where(p => p.EmployeeId == employee.Id).Sum(p => p.Amount);

                    var paymentStatus = "pending";
                    if (paidAmount >= totalToPay && totalToPay > 0)
                    {
                        paymentStatus = "paid";
                    }
                    else if (paidAmount > 0 && paidAmount < totalToPay)
                    {
                        paymentStatus = "partial";
                    }

                    payrollItems.Add(new
                    {
                        employeeId = employee.Id,
                        employeeName = employee.Name,
                        employeeType = employee.EmployeeType,
                        paymentMethod = employee.PaymentMethod,
                        servicesCount,
                        serviceRevenue = Math.Round(serviceRevenue, 2),
                        productRevenue = Math.Round(productRevenue, 2),
                        fixedSalary = Math.Round(fixedSalary, 2),
                        commissionPercentage = employee.ServiceCommissionPercentage > 0 ? employee.ServiceCommissionPercentage : employee.CommissionPercentage,
                        serviceCommissionPercentage = employee.ServiceCommissionPercentage > 0 ? employee.ServiceCommissionPercentage : employee.CommissionPercentage,
                        productCommissionPercentage = employee.ProductCommissionPercentage > 0 ? employee.ProductCommissionPercentage : employee.CommissionPercentage,
                        serviceCommission = Math.Round(serviceCommission, 2),
                        productCommission = Math.Round(productCommission, 2),
                        commissions = Math.Round(commissions, 2),
                        totalToPay = Math.Round(totalToPay, 2),
                        paidAmount = Math.Round(paidAmount, 2),
                        remainingAmount = Math.Max(0, Math.Round(totalToPay - paidAmount, 2)),
                        isPaid = paymentStatus == "paid",
                        paymentStatus // pending, partial, paid
                    });
                }

                var totalPayroll = payrollItems.Sum(p => (decimal)((dynamic)p).totalToPay);

                return Ok(new
                {
                    period,
                    periodStart = startDate,
                    periodEnd = endDate,
                    periodKey,
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
                if (dto.Amount <= 0)
                {
                    return BadRequest(new { message = "Amount must be greater than zero" });
                }

                var (startDate, _, periodKey) = CalculatePeriod(dto.Period, dto.Date ?? DateTime.UtcNow);

                var employeeExists = await _context.Employees.AnyAsync(e => e.Id == dto.EmployeeId);
                if (!employeeExists)
                {
                    return NotFound(new { message = "Employee not found" });
                }

                var payment = new PayrollPayment
                {
                    EmployeeId = dto.EmployeeId,
                    PeriodKey = periodKey,
                    Amount = dto.Amount,
                    PaymentMethod = dto.PaymentMethod ?? "transfer",
                    Notes = dto.Notes,
                    PaidAt = DateTime.UtcNow
                };

                _context.PayrollPayments.Add(payment);
                await _context.SaveChangesAsync();

                var paidAmount = await _context.PayrollPayments
                    .Where(p => p.EmployeeId == dto.EmployeeId && p.PeriodKey == periodKey)
                    .SumAsync(p => p.Amount);

                return Ok(new { 
                    message = "Payroll marked as paid", 
                    employeeId = dto.EmployeeId,
                    amount = dto.Amount,
                    period = dto.Period,
                    periodKey,
                    totalPaid = paidAmount,
                    periodStart = startDate
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private (DateTime startDate, DateTime endDate, string periodKey) CalculatePeriod(string period, DateTime referenceDate)
        {
            var normalizedDate = referenceDate.Kind == DateTimeKind.Utc ? referenceDate : referenceDate.ToUniversalTime();
            DateTime startDate;
            DateTime endDate;

            if (period == "weekly")
            {
                int daysToMonday = ((int)normalizedDate.DayOfWeek - 1 + 7) % 7;
                startDate = DateTime.SpecifyKind(normalizedDate.AddDays(-daysToMonday).Date, DateTimeKind.Utc);
                endDate = startDate.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59);
            }
            else
            {
                startDate = new DateTime(normalizedDate.Year, normalizedDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                endDate = startDate.AddMonths(1).AddDays(-1).AddHours(23).AddMinutes(59).AddSeconds(59);
            }

            var periodKey = $"{period}:{startDate:yyyyMMdd}";
            return (startDate, endDate, periodKey);
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
        public string Period { get; set; } = "monthly";
        public DateTime? Date { get; set; }
        public string PaymentMethod { get; set; } = "transfer";
        public string? Notes { get; set; }
    }
}
