using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/public")]
    public class PublicController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly ILogger<PublicController> _logger;

        public PublicController(
            ApplicationDbContext context,
            ITenantService tenantService,
            IMercadoPagoService mercadoPagoService,
            ILogger<PublicController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _mercadoPagoService = mercadoPagoService;
            _logger = logger;
        }

        [HttpGet("services")]
        public async Task<IActionResult> GetPublicServices()
        {
            try
            {
                var services = await _context.Services
                    .Include(s => s.Category)
                    .Include(s => s.Bookings)
                    .Where(s => s.IsActive)
                    .Select(s => new
                    {
                        id = s.Id,
                        name = s.Name,
                        description = s.Description,
                        price = s.Price,
                        durationMinutes = s.DurationMinutes,
                        category = s.Category != null ? s.Category.Name : null,
                        bookingCount = s.Bookings.Count()
                    })
                    .OrderByDescending(s => s.bookingCount)
                    .ThenBy(s => s.name)
                    .ToListAsync();

                return Ok(services);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("employees")]
        public async Task<IActionResult> GetPublicEmployees()
        {
            try
            {
                var employees = await _context.Employees
                    .Where(p => p.IsActive && p.CanPerformServices)
                    .Select(p => new
                    {
                        id = p.Id,
                        name = p.Name,
                        specialties = new string[] { }
                    })
                    .OrderBy(p => p.name)
                    .ToListAsync();

                return Ok(employees);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("available-slots")]
        public async Task<IActionResult> GetAvailableSlots(
            [FromQuery] Guid professionalId,
            [FromQuery] DateTime date,
            [FromQuery] Guid serviceId)
        {
            try
            {
                var service = await _context.Services.FindAsync(serviceId);
                if (service == null)
                {
                    return NotFound(new { message = "Service not found" });
                }

                var employee = await _context.Employees
                    .Include(p => p.Schedules)
                    .FirstOrDefaultAsync(p => p.Id == professionalId);
                    
                if (employee == null)
                {
                    return NotFound(new { message = "Employee not found" });
                }

                // Get the day of week for the requested date
                var dayOfWeek = (int)date.DayOfWeek;
                
                // Get the professional's schedule for this day
                var schedule = employee.Schedules
                    .FirstOrDefault(s => s.DayOfWeek == dayOfWeek && s.IsActive);
                    
                if (schedule == null)
                {
                    return Ok(new List<string>()); // No working hours for this day
                }

                // Get existing bookings for this professional on this date
                var existingBookings = await _context.Bookings
                    .Where(b => b.EmployeeId == professionalId && 
                               b.StartTime.Date == date.Date &&
                               b.Status != "cancelled")
                    .OrderBy(b => b.StartTime)
                    .ToListAsync();

                var slots = new List<string>();
                var workStart = date.Date.Add(schedule.StartTime);
                var workEnd = date.Date.Add(schedule.EndTime);
                var slotDuration = TimeSpan.FromMinutes(service.DurationMinutes);

                // Generate time slots every 30 minutes
                for (var time = workStart; time.Add(slotDuration) <= workEnd; time = time.AddMinutes(30))
                {
                    var slotEnd = time.Add(slotDuration);
                    
                    // Check if this slot overlaps with any existing booking
                    var isAvailable = !existingBookings.Any(b => 
                        (time >= b.StartTime && time < b.EndTime) ||
                        (slotEnd > b.StartTime && slotEnd <= b.EndTime) ||
                        (time <= b.StartTime && slotEnd >= b.EndTime));

                    // Only add future slots (not past times for today)
                    if (isAvailable && time > DateTime.Now)
                    {
                        slots.Add(time.ToString("HH:mm"));
                    }
                }

                return Ok(slots);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("tenant-info")]
        public async Task<IActionResult> GetTenantInfo()
        {
            try
            {
                var tenantInfo = _tenantService.GetCurrentTenant();
                if (tenantInfo == null)
                {
                    return Ok(new
                    {
                        businessName = "BookingPro",
                        address = "",
                        phone = "",
                        email = ""
                    });
                }

                var tenant = await _context.Tenants
                    .FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);

                if (tenant == null)
                {
                    return Ok(new
                    {
                        businessName = "BookingPro",
                        address = "",
                        phone = "",
                        email = ""
                    });
                }

                return Ok(new
                {
                    businessName = tenant.BusinessName,
                    address = "",
                    phone = "",
                    email = ""
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("bookings")]
        public async Task<IActionResult> CreatePublicBooking([FromBody] PublicBookingDto dto)
        {
            try
            {
                // Check if the slot is still available
                var existingBooking = await _context.Bookings
                    .AnyAsync(b => b.EmployeeId == dto.EmployeeId &&
                                  b.StartTime < dto.EndTime &&
                                  b.EndTime > dto.StartTime &&
                                  b.Status != "cancelled");

                if (existingBooking)
                {
                    return BadRequest(new { message = "Este horario ya no está disponible" });
                }

                // Check if customer exists or create new one
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Email == dto.CustomerEmail || 
                                            c.Phone == dto.CustomerPhone);

                if (customer == null)
                {
                    // Split name into first and last name
                    var nameParts = dto.CustomerName.Split(' ', 2);
                    var firstName = nameParts[0];
                    var lastName = nameParts.Length > 1 ? nameParts[1] : "";

                    customer = new Customer
                    {
                        Id = Guid.NewGuid(),
                        FirstName = firstName,
                        LastName = lastName,
                        Email = dto.CustomerEmail,
                        Phone = dto.CustomerPhone,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Customers.Add(customer);
                }

                // Get service price
                var service = await _context.Services.FindAsync(dto.ServiceId);
                if (service == null)
                {
                    return BadRequest(new { message = "Servicio no encontrado" });
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
                    Price = service.Price,
                    Notes = dto.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                // Generate confirmation code
                var confirmationCode = GenerateConfirmationCode(booking.Id);

                // Check if payment is configured for this tenant
                var tenantInfo = _tenantService.GetCurrentTenant();
                if (tenantInfo != null)
                {
                    var paymentConfig = await _context.Set<PaymentConfiguration>()
                        .FirstOrDefaultAsync(pc => pc.TenantId == tenantInfo.Id && pc.IsEnabled);
                    
                    if (paymentConfig != null && paymentConfig.RequireImmediatePayment)
                    {
                        // Create payment preference
                        var paymentDto = new BookingPro.API.Models.DTOs.CreatePaymentDto
                        {
                            BookingId = booking.Id,
                            Amount = service.Price,
                            PaymentMethod = "mercadopago",
                            PaymentType = "full", // Can be enhanced to support deposit
                            CustomerName = dto.CustomerName,
                            CustomerEmail = dto.CustomerEmail,
                            Subdomain = tenantInfo.Subdomain
                        };

                        var paymentResult = await _mercadoPagoService.CreatePaymentPreferenceAsync(paymentDto);
                        
                        if (paymentResult.Success)
                        {
                            // Update booking status to pending payment
                            booking.Status = "pending_payment";
                            await _context.SaveChangesAsync();
                            
                            return Ok(new 
                            { 
                                success = true,
                                bookingId = booking.Id,
                                confirmationCode = confirmationCode,
                                requiresPayment = true,
                                payment = new
                                {
                                    preferenceId = paymentResult.Data?.PreferenceId,
                                    initPoint = paymentResult.Data?.InitPoint,
                                    sandboxInitPoint = paymentResult.Data?.SandboxInitPoint,
                                    publicKey = paymentResult.Data?.PublicKey,
                                    amount = paymentResult.Data?.Amount
                                },
                                message = "Reserva creada. Por favor complete el pago para confirmar." 
                            });
                        }
                        else
                        {
                            _logger.LogWarning("Failed to create payment preference: {Error}", paymentResult.Message);
                            // Continue without payment if preference creation fails
                        }
                    }
                }

                // TODO: Send confirmation email
                // await _emailService.SendBookingConfirmation(customer.Email, booking, confirmationCode);

                return Ok(new 
                { 
                    success = true,
                    bookingId = booking.Id,
                    confirmationCode = confirmationCode,
                    requiresPayment = false,
                    message = "Reserva creada exitosamente" 
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private string GenerateConfirmationCode(Guid bookingId)
        {
            // Generate a simple confirmation code based on booking ID
            var hash = bookingId.GetHashCode();
            var code = Math.Abs(hash).ToString().PadLeft(6, '0').Substring(0, 6);
            return $"BK{code}";
        }
    }

    public class PublicBookingDto
    {
        public Guid ServiceId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}