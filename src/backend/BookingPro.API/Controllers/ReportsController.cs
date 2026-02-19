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

                // Total Revenue - use Payments table for actual revenue
                var totalRevenue = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .SumAsync(p => (decimal?)p.Amount) ?? 0;

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

                // Revenue by Month - use Payments
                var revenueByMonth = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                    .Select(g => new
                    {
                        year = g.Key.Year,
                        month = g.Key.Month,
                        revenue = g.Sum(p => p.Amount)
                    })
                    .OrderBy(x => x.year).ThenBy(x => x.month)
                    .ToListAsync();

                var monthNames = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };
                var revenueByMonthFormatted = revenueByMonth.Select(x => new
                {
                    month = monthNames[x.month - 1],
                    revenue = x.revenue
                }).ToList();

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

                // Group by day to produce DailyReport-compatible objects
                var reports = payments
                    .GroupBy(p => p.PaymentDate.Date)
                    .Select(g => new
                    {
                        date = g.Key.ToString("yyyy-MM-dd"),
                        totalRevenue = g.Sum(p => p.Amount),
                        cashRevenue = g.Where(p => p.PaymentMethod == "cash").Sum(p => p.Amount),
                        cardRevenue = g.Where(p => p.PaymentMethod == "card").Sum(p => p.Amount),
                        transferRevenue = g.Where(p => p.PaymentMethod == "transfer").Sum(p => p.Amount),
                        mercadoPagoRevenue = g.Where(p => p.PaymentMethod == "mercadopago").Sum(p => p.Amount),
                        totalBookings = g.Select(p => p.BookingId).Distinct().Count(),
                        completedBookings = g.Where(p => p.Booking != null && p.Booking.Status == "completed")
                            .Select(p => p.BookingId).Distinct().Count(),
                        cancelledBookings = 0,
                        totalCommissions = g.Sum(p => p.CommissionAmount ?? 0),
                        totalTips = g.Sum(p => p.TipAmount ?? 0),
                    })
                    .OrderBy(x => x.date)
                    .ToList();

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

                var paymentsWithEmployee = await _context.Payments
                    .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                    .Include(p => p.Employee)
                    .ToListAsync();

                var commissions = paymentsWithEmployee
                    .GroupBy(p => new { p.EmployeeId, EmployeeName = p.Employee?.Name ?? "Sin nombre" })
                    .Select(g =>
                    {
                        var emp = _context.Employees.FirstOrDefault(e => e.Id == g.Key.EmployeeId);
                        return new
                        {
                            employeeId = g.Key.EmployeeId,
                            employeeName = g.Key.EmployeeName,
                            totalServices = g.Select(p => p.BookingId).Distinct().Count(),
                            totalRevenue = g.Sum(p => p.Amount),
                            commissionPercentage = emp?.CommissionPercentage ?? 0,
                            commissionAmount = g.Sum(p => p.CommissionAmount ?? 0),
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
