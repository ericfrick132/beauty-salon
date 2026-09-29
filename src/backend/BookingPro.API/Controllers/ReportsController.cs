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
    [Authorize(Roles = "admin,super_admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(
            ApplicationDbContext context,
            ITenantService tenantService,
            ILogger<ReportsController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _logger = logger;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardReport(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                endDate ??= DateTime.UtcNow;
                startDate ??= endDate.Value.AddDays(-30);

                // Ingresos = turnos cobrados (Payments) + venta de productos (Sales)
                var serviceRevenue = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .SumAsync(p => (decimal?)p.Amount) ?? 0;

                var periodSales = _context.Sales
                    .Where(s => s.SaleDate >= startDate && s.SaleDate <= endDate && s.Status != "cancelled");

                var productRevenue = await periodSales.SumAsync(s => (decimal?)s.TotalAmount) ?? 0;
                var productSalesCount = await periodSales.CountAsync();
                var productCost = await _context.SaleItems
                    .Where(i => i.Sale.SaleDate >= startDate && i.Sale.SaleDate <= endDate && i.Sale.Status != "cancelled")
                    .SumAsync(i => (decimal?)(i.UnitCost * i.Quantity)) ?? 0;

                var totalRevenue = serviceRevenue + productRevenue;

                var topProducts = await _context.SaleItems
                    .Where(i => i.Sale.SaleDate >= startDate && i.Sale.SaleDate <= endDate && i.Sale.Status != "cancelled")
                    .GroupBy(i => new { i.ProductId, i.Product.Name })
                    .Select(g => new
                    {
                        name = g.Key.Name,
                        quantity = g.Sum(i => i.Quantity),
                        revenue = g.Sum(i => i.TotalAmount),
                        profit = g.Sum(i => i.TotalAmount - i.UnitCost * i.Quantity)
                    })
                    .OrderByDescending(x => x.revenue)
                    .Take(5)
                    .ToListAsync();

                // Total Bookings
                var totalBookings = await _context.Bookings
                    .Where(b => b.StartTime >= startDate && b.StartTime <= endDate && b.Status != "cancelled")
                    .CountAsync();

                // Total Customers
                var totalCustomers = await _context.Bookings
                    .Where(b => b.StartTime >= startDate && b.StartTime <= endDate)
                    .Select(b => b.CustomerId)
                    .Distinct()
                    .CountAsync();

                // Average ticket from payments
                var averageServicePrice = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .AverageAsync(p => (decimal?)p.Amount) ?? 0;

                // Top Services - combine booking count with payment revenue
                var topServices = await _context.Bookings
                    .Where(b => b.StartTime >= startDate && b.StartTime <= endDate && b.Status != "cancelled")
                    .Include(b => b.Service)
                    .GroupBy(b => new { b.ServiceId, b.Service.Name })
                    .Select(g => new
                    {
                        name = g.Key.Name ?? "Sin servicio",
                        count = g.Count(),
                        revenue = _context.Payments
                            .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate
                                && p.Status == "completed"
                                && g.Select(b => b.Id).Contains(p.BookingId))
                            .Sum(p => (decimal?)p.Amount) ?? 0
                    })
                    .OrderByDescending(x => x.count)
                    .Take(5)
                    .ToListAsync();

                // Top Professionals - use payments for revenue
                var topProfessionals = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .Include(p => p.Employee)
                    .GroupBy(p => new { p.EmployeeId, p.Employee.Name })
                    .Select(g => new
                    {
                        name = g.Key.Name ?? "Sin profesional",
                        bookings = g.Select(p => p.BookingId).Distinct().Count(),
                        revenue = g.Sum(p => p.Amount)
                    })
                    .OrderByDescending(x => x.revenue)
                    .Take(4)
                    .ToListAsync();

                // Bookings by Day
                var bookingsByDayData = await _context.Bookings
                    .Where(b => b.StartTime >= startDate && b.StartTime <= endDate && b.Status != "cancelled")
                    .GroupBy(b => b.StartTime.DayOfWeek)
                    .Select(g => new
                    {
                        dayOfWeek = g.Key,
                        count = g.Count()
                    })
                    .ToListAsync();

                var dayNames = new[] { "Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb" };
                var bookingsByDay = new List<object>();
                for (int i = 0; i < 7; i++)
                {
                    var dayData = bookingsByDayData.FirstOrDefault(d => (int)d.dayOfWeek == i);
                    bookingsByDay.Add(new
                    {
                        date = dayNames[i],
                        count = dayData?.count ?? 0
                    });
                }

                // Revenue by Month - turnos y productos por separado
                var serviceByMonth = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(p => p.Amount) })
                    .ToListAsync();

                var productByMonth = await periodSales
                    .GroupBy(s => new { s.SaleDate.Year, s.SaleDate.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(s => s.TotalAmount) })
                    .ToListAsync();

                var monthNames = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };
                var revenueByMonthFormatted = serviceByMonth.Select(x => (x.Year, x.Month))
                    .Union(productByMonth.Select(x => (x.Year, x.Month)))
                    .OrderBy(k => k.Year).ThenBy(k => k.Month)
                    .Select(k =>
                    {
                        var services = serviceByMonth.Where(x => x.Year == k.Year && x.Month == k.Month).Sum(x => x.Amount);
                        var products = productByMonth.Where(x => x.Year == k.Year && x.Month == k.Month).Sum(x => x.Amount);
                        return new
                        {
                            month = monthNames[k.Month - 1],
                            revenue = services + products,
                            serviceRevenue = services,
                            productRevenue = products
                        };
                    })
                    .ToList();

                // Bookings by Status
                var bookingsByStatus = await _context.Bookings
                    .Where(b => b.StartTime >= startDate && b.StartTime <= endDate)
                    .GroupBy(b => b.Status)
                    .Select(g => new
                    {
                        status = g.Key,
                        count = g.Count()
                    })
                    .ToListAsync();

                var statusTranslations = new Dictionary<string, string>
                {
                    ["confirmed"] = "Confirmado",
                    ["pending"] = "Pendiente",
                    ["cancelled"] = "Cancelado",
                    ["completed"] = "Completado"
                };

                var bookingsByStatusFormatted = bookingsByStatus.Select(x => new
                {
                    status = statusTranslations.ContainsKey(x.status) ? statusTranslations[x.status] : x.status,
                    count = x.count
                }).ToList();

                var reportData = new
                {
                    totalRevenue,
                    serviceRevenue,
                    productRevenue,
                    productCost,
                    productProfit = productRevenue - productCost,
                    productSalesCount,
                    topProducts,
                    totalBookings,
                    totalCustomers,
                    averageServicePrice,
                    topServices,
                    topProfessionals,
                    bookingsByDay,
                    revenueByMonth = revenueByMonthFormatted,
                    bookingsByStatus = bookingsByStatusFormatted
                };

                return Ok(reportData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating dashboard report");
                return StatusCode(500, new { message = "Error generating report" });
            }
        }

        [HttpGet("financial")]
        public async Task<IActionResult> GetFinancialReport(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                endDate ??= DateTime.UtcNow;
                startDate ??= endDate.Value.AddDays(-30);

                var payments = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .Include(p => p.Booking)
                    .ToListAsync();

                var sales = await _context.Sales
                    .Where(s => s.SaleDate >= startDate && s.SaleDate <= endDate && s.Status != "cancelled")
                    .Select(s => new { s.SaleDate, s.EmployeeId, s.TotalAmount, s.PaymentMethod })
                    .ToListAsync();

                var productPctByEmployee = (await _context.Employees.ToListAsync())
                    .ToDictionary(e => e.Id, e => CommissionRates.EarnsCommission(e) ? CommissionRates.ProductPct(e) : 0m);

                decimal ProductCommission(Guid? employeeId, decimal amount) =>
                    employeeId.HasValue && productPctByEmployee.TryGetValue(employeeId.Value, out var pct)
                        ? amount * pct / 100 : 0;

                // Un día aparece si tuvo cobros de turnos o ventas de productos
                var days = payments.Select(p => p.PaymentDate.Date)
                    .Union(sales.Select(s => s.SaleDate.Date))
                    .OrderBy(d => d);

                var reports = days.Select(day =>
                {
                    var dayPayments = payments.Where(p => p.PaymentDate.Date == day).ToList();
                    var daySales = sales.Where(s => s.SaleDate.Date == day).ToList();

                    decimal ByMethod(string method) =>
                        dayPayments.Where(p => p.PaymentMethod == method).Sum(p => p.Amount)
                        + daySales.Where(s => s.PaymentMethod == method).Sum(s => s.TotalAmount);

                    var serviceRevenue = dayPayments.Sum(p => p.Amount);
                    var productRevenue = daySales.Sum(s => s.TotalAmount);

                    return new
                    {
                        date = day.ToString("yyyy-MM-dd"),
                        totalRevenue = serviceRevenue + productRevenue,
                        serviceRevenue,
                        productRevenue,
                        productSalesCount = daySales.Count,
                        cashRevenue = ByMethod("cash"),
                        cardRevenue = ByMethod("card"),
                        transferRevenue = ByMethod("transfer"),
                        mercadoPagoRevenue = ByMethod("mercadopago"),
                        totalBookings = dayPayments.Select(p => p.BookingId).Distinct().Count(),
                        completedBookings = dayPayments.Where(p => p.Booking != null && p.Booking.Status == "completed")
                            .Select(p => p.BookingId).Distinct().Count(),
                        cancelledBookings = 0,
                        totalCommissions = dayPayments.Sum(p => p.CommissionAmount ?? 0)
                            + daySales.Sum(s => ProductCommission(s.EmployeeId, s.TotalAmount)),
                        totalTips = dayPayments.Sum(p => p.TipAmount ?? 0),
                    };
                }).ToList();

                return Ok(new { reports });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating financial report");
                return StatusCode(500, new { message = "Error generating financial report" });
            }
        }

        [HttpGet("commissions")]
        public async Task<IActionResult> GetCommissionsReport(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                endDate ??= DateTime.UtcNow;
                startDate ??= endDate.Value.AddDays(-30);

                var payments = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed" && p.EmployeeId != null)
                    .Select(p => new { p.EmployeeId, p.BookingId, p.Amount, p.CommissionAmount })
                    .ToListAsync();

                var sales = await _context.Sales
                    .Where(s => s.SaleDate >= startDate && s.SaleDate <= endDate && s.Status != "cancelled" && s.EmployeeId != null)
                    .Select(s => new { s.EmployeeId, s.TotalAmount })
                    .ToListAsync();

                var employeeIds = payments.Select(p => p.EmployeeId!.Value)
                    .Union(sales.Select(s => s.EmployeeId!.Value))
                    .ToList();

                var employees = await _context.Employees
                    .Where(e => employeeIds.Contains(e.Id))
                    .ToListAsync();

                var commissions = employees
                    .Select(emp =>
                    {
                        var empPayments = payments.Where(p => p.EmployeeId == emp.Id).ToList();
                        var serviceRevenue = empPayments.Sum(p => p.Amount);
                        var productRevenue = sales.Where(s => s.EmployeeId == emp.Id).Sum(s => s.TotalAmount);
                        var earns = CommissionRates.EarnsCommission(emp);
                        var serviceCommission = empPayments.Sum(p => p.CommissionAmount ?? 0);
                        var productCommission = earns ? productRevenue * CommissionRates.ProductPct(emp) / 100 : 0;

                        return new
                        {
                            employeeId = emp.Id,
                            employeeName = emp.Name,
                            totalServices = empPayments.Select(p => p.BookingId).Distinct().Count(),
                            serviceRevenue,
                            productRevenue,
                            totalRevenue = serviceRevenue + productRevenue,
                            commissionPercentage = CommissionRates.ServicePct(emp),
                            productCommissionPercentage = earns ? CommissionRates.ProductPct(emp) : 0,
                            serviceCommission,
                            productCommission = Math.Round(productCommission, 2),
                            commissionAmount = Math.Round(serviceCommission + productCommission, 2),
                        };
                    })
                    .OrderByDescending(x => x.totalRevenue)
                    .ToList();

                return Ok(commissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating commissions report");
                return StatusCode(500, new { message = "Error generating commissions report" });
            }
        }
    }
}
