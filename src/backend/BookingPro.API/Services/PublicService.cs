using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Linq;

namespace BookingPro.API.Services
{
    public class PublicService : IPublicService
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;

        private record BusinessHoursConfig(TimeSpan Opening, TimeSpan Closing, HashSet<int> ClosedDays);
        private static readonly TimeSpan DefaultOpening = new TimeSpan(9, 0, 0);
        private static readonly TimeSpan DefaultClosing = new TimeSpan(22, 0, 0);

        public PublicService(ApplicationDbContext context, ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
        }

        public async Task<IEnumerable<Service>> GetServicesAsync()
        {
            return await _context.Services
                .Where(s => s.IsActive)
                .Include(s => s.Category)
                .OrderBy(s => s.Name)
                .ToListAsync();
        }

        public async Task<Service?> GetServiceByIdAsync(Guid id)
        {
            return await _context.Services
                .Include(s => s.Category)
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive);
        }

        public async Task<IEnumerable<Employee>> GetEmployeesAsync()
        {
            return await _context.Employees
                .Where(e => e.IsActive && e.CanPerformServices)
                .OrderBy(e => e.Name)
                .ToListAsync();
        }

        public async Task<Employee?> GetEmployeeByIdAsync(Guid id)
        {
            return await _context.Employees
                .FirstOrDefaultAsync(e => e.Id == id && e.IsActive && e.CanPerformServices);
        }

        public async Task<IEnumerable<string>> GetAvailableTimeSlotsAsync(Guid professionalId, DateTime date, Guid serviceId)
        {
            var businessConfig = await GetBusinessHoursConfigAsync();
            if (businessConfig.ClosedDays.Contains((int)date.DayOfWeek))
            {
                return new List<string>();
            }

            var employee = await _context.Employees.FindAsync(professionalId);
            var service = await _context.Services.FindAsync(serviceId);

            if (employee == null || service == null)
            {
                return new List<string>();
            }

            var existingBookings = await _context.Bookings
                .Where(b => b.EmployeeId == professionalId && 
                           b.StartTime.Date == date.Date &&
                           b.Status != "cancelled")
                .OrderBy(b => b.StartTime)
                .ToListAsync();

            var availableSlots = new List<string>();
            var workingHours = new { start = businessConfig.Opening, end = businessConfig.Closing };
            var slotDuration = TimeSpan.FromMinutes(service.DurationMinutes);

            for (var time = workingHours.start; time <= workingHours.end.Subtract(slotDuration); time = time.Add(TimeSpan.FromMinutes(30)))
            {
                var slotStart = date.Date.Add(time);
                var slotEnd = slotStart.Add(slotDuration);

                var isConflict = existingBookings.Any(b => 
                    slotStart < b.EndTime && slotEnd > b.StartTime);

                if (!isConflict && IsWithinBusinessHours(slotStart, slotEnd, businessConfig))
                {
                    availableSlots.Add(slotStart.ToString("HH:mm"));
                }
            }

            return availableSlots;
        }

        public async Task<Booking> CreatePublicBookingAsync(CreatePublicBookingDto dto)
        {
            // Check if the slot is still available
            var existingBooking = await _context.Bookings
                .AnyAsync(b => b.EmployeeId == dto.EmployeeId &&
                              b.StartTime < dto.EndTime &&
                              b.EndTime > dto.StartTime &&
                              b.Status != "cancelled");

            if (existingBooking)
                throw new InvalidOperationException("Time slot is no longer available");

            // Find or create customer
            Customer? customer = null;
            
            if (!string.IsNullOrEmpty(dto.CustomerEmail))
            {
                customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Email == dto.CustomerEmail);
            }

            if (customer == null)
            {
                customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    FirstName = dto.CustomerName.Split(' ').FirstOrDefault() ?? dto.CustomerName,
                    LastName = dto.CustomerName.Contains(' ') ? 
                        string.Join(" ", dto.CustomerName.Split(' ').Skip(1)) : null,
                    Email = dto.CustomerEmail,
                    Phone = dto.CustomerPhone,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
            }

            // Create booking
            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                CustomerId = customer.Id,
                EmployeeId = dto.EmployeeId,
                ServiceId = dto.ServiceId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                Status = "confirmed",
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return booking;
        }

        private async Task<BusinessHoursConfig> GetBusinessHoursConfigAsync()
        {
            var defaultConfig = new BusinessHoursConfig(DefaultOpening, DefaultClosing, new HashSet<int>());
            var tenantInfo = _tenantService.GetCurrentTenant();
            if (tenantInfo == null) return defaultConfig;

            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);
            if (tenant == null) return defaultConfig;

            try
            {
                var settings = JsonSerializer.Deserialize<Dictionary<string, object>>(tenant.Settings ?? "{}") ?? new();
                var opening = ParseTimeSetting(settings, "businessOpeningTime") ?? DefaultOpening;
                var closing = ParseTimeSetting(settings, "businessClosingTime") ?? DefaultClosing;
                if (opening >= closing)
                {
                    opening = DefaultOpening;
                    closing = DefaultClosing;
                }

                var closedDays = ParseClosedDays(settings);
                return new BusinessHoursConfig(opening, closing, closedDays);
            }
            catch
            {
                return defaultConfig;
            }
        }

        private static TimeSpan? ParseTimeSetting(Dictionary<string, object> settings, string key)
        {
            if (!settings.TryGetValue(key, out var value) || value == null) return null;

            if (value is JsonElement je && je.ValueKind == JsonValueKind.String)
            {
                if (TimeSpan.TryParse(je.GetString(), out var parsed)) return parsed;
            }
            else if (value is string str && TimeSpan.TryParse(str, out var parsed))
            {
                return parsed;
            }
            else if (TimeSpan.TryParse(value.ToString(), out var parsedObj))
            {
                return parsedObj;
            }

            return null;
        }

        private static HashSet<int> ParseClosedDays(Dictionary<string, object> settings)
        {
            try
            {
                if (!settings.TryGetValue("businessClosedDays", out var value) || value == null)
                {
                    return new HashSet<int>();
                }

                if (value is JsonElement je && je.ValueKind == JsonValueKind.Array)
                {
                    var days = je.EnumerateArray()
                        .Where(item => item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out _))
                        .Select(item => item.GetInt32());
                    return new HashSet<int>(days);
                }

                if (value is IEnumerable<object> objList)
                {
                    return new HashSet<int>(objList.Select(o => Convert.ToInt32(o)));
                }

                var parsed = JsonSerializer.Deserialize<List<int>>(value.ToString() ?? "[]") ?? new List<int>();
                return new HashSet<int>(parsed);
            }
            catch
            {
                return new HashSet<int>();
            }
        }

        private static bool IsWithinBusinessHours(DateTime startTime, DateTime endTime, BusinessHoursConfig businessConfig)
        {
            if (businessConfig.ClosedDays.Contains((int)startTime.DayOfWeek) ||
                businessConfig.ClosedDays.Contains((int)endTime.DayOfWeek))
            {
                return false;
            }

            var startTimeOfDay = startTime.TimeOfDay;
            var endTimeOfDay = endTime.TimeOfDay;

            return startTimeOfDay >= businessConfig.Opening &&
                   endTimeOfDay <= businessConfig.Closing &&
                   startTime.Date == endTime.Date;
        }
    }
}
