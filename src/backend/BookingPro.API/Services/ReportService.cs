using BookingPro.API.Data;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace BookingPro.API.Services
{
    public class ReportService : IReportService
    {
        private readonly ApplicationDbContext _context;

        public ReportService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetDashboardStatsAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            startDate ??= DateTime.UtcNow.AddDays(-30);
            endDate ??= DateTime.UtcNow;

            var totalRevenue = await _context.Payments
                .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.Status == "completed")
                .SumAsync(p => p.Amount);

            var totalBookings = await _context.Bookings
                .Where(b => b.StartTime >= startDate && b.StartTime <= endDate)
                .CountAsync();

            var completedBookings = await _context.Bookings
                .Where(b => b.StartTime >= startDate && b.StartTime <= endDate && b.Status == "confirmed")
                .CountAsync();

            var cancelledBookings = await _context.Bookings
                .Where(b => b.StartTime >= startDate && b.StartTime <= endDate && b.Status == "cancelled")
                .CountAsync();

            var topServices = await _context.Bookings
                .Where(b => b.StartTime >= startDate && b.StartTime <= endDate && b.Status == "confirmed")
                .GroupBy(b => b.ServiceId)
                .Select(g => new
                {
                    ServiceId = g.Key,
                    Bookings = g.Count(),
                    Revenue = g.Join(_context.Services, b => b.ServiceId, s => s.Id, (b, s) => s.Price).Sum()
                })
                .Join(_context.Services, x => x.ServiceId, s => s.Id, (x, s) => new
                {
                    Name = s.Name,
                    Bookings = x.Bookings,
                    Revenue = x.Revenue
                })
                .OrderByDescending(x => x.Bookings)
                .Take(5)
                .ToListAsync();

            var topEmployees = await _context.Bookings
                .Where(b => b.StartTime >= startDate && b.StartTime <= endDate && b.Status == "confirmed")
                .GroupBy(b => b.EmployeeId)
                .Select(g => new
                {
                    EmployeeId = g.Key,
                    Bookings = g.Count(),
                    Revenue = g.Join(_context.Services, b => b.ServiceId, s => s.Id, (b, s) => s.Price).Sum()
                })
                .Join(_context.Employees, x => x.EmployeeId, p => p.Id, (x, p) => new
                {
                    Name = p.Name,
                    Bookings = x.Bookings,
                    Revenue = x.Revenue
                })
                .OrderByDescending(x => x.Bookings)
                .Take(5)
                .ToListAsync();

            return new
            {
                period = new { startDate, endDate },
                stats = new
                {
                    totalRevenue,
                    totalBookings,
                    completedBookings,
                    cancelledBookings,
                    cancellationRate = totalBookings > 0 ? (decimal)cancelledBookings / totalBookings * 100 : 0
                },
                topServices,
                topEmployees
            };
        }

        public async Task<string> ExportBookingsCsvAsync(DateTime startDate, DateTime endDate)
        {
            var bookings = await _context.Bookings
                .Where(b => b.StartTime >= startDate && b.StartTime <= endDate)
                .Include(b => b.Service)
                .Include(b => b.Employee)
                .Include(b => b.Customer)
                .OrderBy(b => b.StartTime)
                .ToListAsync();

            var csv = new StringBuilder();
            csv.AppendLine("Date,Time,Customer,Service,Employee,Status,Price");

            foreach (var booking in bookings)
            {
                csv.AppendLine($"{booking.StartTime:yyyy-MM-dd}," +
                       $"{booking.StartTime:HH:mm}," +
                       $"\"{booking.Customer?.FirstName} {booking.Customer?.LastName}\"," +
                       $"\"{booking.Service?.Name}\"," +
                       $"\"{booking.Employee?.Name}\"," +
                       $"{booking.Status}," +
                       $"{booking.Service?.Price}");
            }

            return csv.ToString();
        }

        public async Task<object> GetEmployeePerformanceAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            startDate ??= DateTime.UtcNow.AddMonths(-1);
            endDate ??= DateTime.UtcNow;

            var performance = await _context.Employees
                .Select(p => new
                {
                    Employee = p,
                    TotalBookings = _context.Bookings
                        .Where(b => b.EmployeeId == p.Id && 
                                   b.StartTime >= startDate && 
                                   b.StartTime <= endDate)
                        .Count(),
                    CompletedBookings = _context.Bookings
                        .Where(b => b.EmployeeId == p.Id && 
                                   b.StartTime >= startDate && 
                                   b.StartTime <= endDate && 
                                   b.Status == "confirmed")
                        .Count(),
                    Revenue = _context.Bookings
                        .Where(b => b.EmployeeId == p.Id && 
                                   b.StartTime >= startDate && 
                                   b.StartTime <= endDate && 
                                   b.Status == "confirmed")
                        .Join(_context.Services, b => b.ServiceId, s => s.Id, (b, s) => s.Price)
                        .Sum()
                })
                .Where(x => x.TotalBookings > 0)
                .OrderByDescending(x => x.CompletedBookings)
                .ToListAsync();

            return new
            {
                period = new { startDate, endDate },
                performance = performance.Select(p => new
                {
                    employee = new
                    {
                        id = p.Employee.Id,
                        name = p.Employee.Name,
                        employeeType = p.Employee.EmployeeType
                    },
                    totalBookings = p.TotalBookings,
                    completedBookings = p.CompletedBookings,
                    revenue = p.Revenue,
                    completionRate = p.TotalBookings > 0 ? (decimal)p.CompletedBookings / p.TotalBookings * 100 : 0
                })
            };
        }
    }
}