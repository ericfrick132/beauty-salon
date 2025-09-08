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
        private readonly IBookingService _bookingService;
        private readonly ILogger<PublicController> _logger;

        public PublicController(
            ApplicationDbContext context,
            ITenantService tenantService,
            IMercadoPagoService mercadoPagoService,
            IBookingService bookingService,
            ILogger<PublicController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _mercadoPagoService = mercadoPagoService;
            _bookingService = bookingService;
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
            var result = await _bookingService.GetAvailableTimeSlotsAsync(professionalId, date, serviceId);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
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

                // Get service (including deposit configuration)
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
                    
                    // Priority: if service requires deposit, enforce deposit payment; else if tenant requires immediate full payment, enforce full payment
                    if (paymentConfig != null)
                    {
                        // Calculate if deposit is required for this service/booking
                        var depositCalc = await _mercadoPagoService.CalculateDepositAsync(service.Id, customer.Id, dto.StartTime);
                        if (depositCalc.Success && depositCalc.Data != null && depositCalc.Data.RequiresDeposit && depositCalc.Data.Amount > 0)
                        {
                            // Mark booking as requiring deposit
                            booking.RequiresDeposit = true;
                            booking.DepositAmount = depositCalc.Data.Amount;
                            booking.Status = "pending_payment";
                            await _context.SaveChangesAsync();

                            // Create MercadoPago preference for deposit amount
                            var paymentDto = new BookingPro.API.Models.DTOs.CreatePaymentDto
                            {
                                BookingId = booking.Id,
                                Amount = depositCalc.Data.Amount,
                                PaymentMethod = "mercadopago",
                                PaymentType = "deposit",
                                CustomerName = dto.CustomerName,
                                CustomerEmail = dto.CustomerEmail,
                                Subdomain = tenantInfo.Subdomain
                            };

                            var paymentResult = await _mercadoPagoService.CreatePaymentPreferenceAsync(paymentDto);
                            if (!paymentResult.Success)
                            {
                                _logger.LogWarning("Failed to create deposit payment preference: {Error}", paymentResult.Message);
                                return BadRequest(new { message = "No se pudo iniciar el pago de la seña. Intenta nuevamente o contacta al comercio." });
                            }

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
                                message = "Reserva creada. Por favor pagá la seña para confirmar." 
                            });
                        }
                        else if (paymentConfig.RequireImmediatePayment)
                        {
                            // Require full payment if configured
                            var paymentDto = new BookingPro.API.Models.DTOs.CreatePaymentDto
                            {
                                BookingId = booking.Id,
                                Amount = service.Price,
                                PaymentMethod = "mercadopago",
                                PaymentType = "full",
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
