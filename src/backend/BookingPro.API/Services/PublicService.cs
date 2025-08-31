using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class PublicService : IPublicService
    {
        private readonly ApplicationDbContext _context;

        public PublicService(ApplicationDbContext context)
        {
            _context = context;
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
            
            // Default working hours - this could be enhanced to read from employee.WorkingHours
            var workingHours = new { start = new TimeSpan(9, 0, 0), end = new TimeSpan(18, 0, 0) };
            var slotDuration = TimeSpan.FromMinutes(service.DurationMinutes);

            for (var time = workingHours.start; time <= workingHours.end.Subtract(slotDuration); time = time.Add(TimeSpan.FromMinutes(30)))
            {
                var slotStart = date.Date.Add(time);
                var slotEnd = slotStart.Add(slotDuration);

                var isConflict = existingBookings.Any(b => 
                    slotStart < b.EndTime && slotEnd > b.StartTime);

                if (!isConflict)
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
    }
}