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
using Microsoft.AspNetCore.Authorization;

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
        private readonly IEmailService _emailService;
        private readonly IWhatsAppService _whatsAppService;
        private readonly ILogger<PublicController> _logger;

        public PublicController(
            ApplicationDbContext context,
            ITenantService tenantService,
            IMercadoPagoService mercadoPagoService,
            IBookingService bookingService,
            IEmailService emailService,
            IWhatsAppService whatsAppService,
            ILogger<PublicController> logger)
        {
            _context = context;
            _tenantService = tenantService;
            _mercadoPagoService = mercadoPagoService;
            _bookingService = bookingService;
            _emailService = emailService;
            _whatsAppService = whatsAppService;
            _logger = logger;
        }

        /// <summary>
        /// Resolve tenant subdomain by admin email. Public endpoint for landing login redirect.
        /// </summary>
        [HttpGet("tenant-by-email")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTenantByEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { error = "Email requerido" });
            }

            try
            {
                string? subdomain = null;
                string? domain = null;

                // Primary: look up via the Users table
                var user = await _context.Users
                    .Include(u => u.Tenant)
                    .ThenInclude(t => t.Vertical)
                    .Where(u => u.Email == email && u.IsActive)
                    .OrderByDescending(u => u.CreatedAt)
                    .FirstOrDefaultAsync();

                if (user?.Tenant?.Vertical != null)
                {
                    subdomain = user.Tenant.Subdomain;
                    domain = user.Tenant.Vertical.Domain;
                }
                else
                {
                    // Fallback: match directly on Tenant.OwnerEmail
                    var tenant = await _context.Tenants
                        .Include(t => t.Vertical)
                        .Where(t => t.OwnerEmail == email)
                        .OrderByDescending(t => t.CreatedAt)
                        .FirstOrDefaultAsync();

                    if (tenant?.Vertical == null)
                    {
                        return NotFound(new { error = "No se encontró una cuenta para ese email" });
                    }

                    subdomain = tenant.Subdomain;
                    domain = tenant.Vertical.Domain;
                }

                var host = HttpContext.Request.Host.Host;
                var isLocal = host.Contains("localhost") || host.StartsWith("127.");
                var loginUrl = isLocal
                    ? $"http://{subdomain}.localhost:3001/login"
                    : $"https://{subdomain}.turnos-pro.com/login";

                return Ok(new
                {
                    subdomain,
                    domain,
                    loginUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving tenant by email");
                return StatusCode(500, new { error = "Error buscando el tenant" });
            }
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
                        requiresDeposit = s.RequiresDeposit,
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

            // Apply tenant-specific minimum advance minutes for public booking
            var minAdvance = await GetMinAdvanceMinutesAsync();
            if (minAdvance > 0)
            {
                // Compute local tenant now, compare with each slot (on provided date)
                var tenantInfo = _tenantService.GetCurrentTenant();
                int offsetHours = 0;
                int.TryParse(tenantInfo?.TimeZone ?? "0", out offsetHours);
                var localNow = DateTime.UtcNow.AddHours(offsetHours);

                var filtered = new List<string>();
                foreach (var slot in result.Data ?? Enumerable.Empty<string>())
                {
                    if (slot.StartsWith("PAST:"))
                    {
                        filtered.Add(slot);
                        continue;
                    }
                    // Build local slot time on the given date
                    if (TimeSpan.TryParse(slot, out var ts))
                    {
                        var localSlot = date.Date.Add(ts);
                        if (localSlot < localNow.AddMinutes(minAdvance))
                        {
                            filtered.Add($"PAST:{slot}");
                        }
                        else
                        {
                            filtered.Add(slot);
                        }
                    }
                    else
                    {
                        filtered.Add(slot);
                    }
                }
                return Ok(filtered);
            }

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
                // Enforce minimum advance for public bookings
                var minAdvance = await GetMinAdvanceMinutesAsync();
                if (minAdvance > 0)
                {
                    var currentTenantInfo = _tenantService.GetCurrentTenant();
                    int offsetHours = 0;
                    int.TryParse(currentTenantInfo?.TimeZone ?? "0", out offsetHours);
                    var localNow = DateTime.UtcNow.AddHours(offsetHours);
                    var localStart = dto.StartTime.AddHours(offsetHours);
                    if (localStart < localNow.AddMinutes(minAdvance))
                    {
                        return BadRequest(new { message = $"Las reservas deben hacerse con al menos {minAdvance} minutos de anticipación" });
                    }
                }

                // Validate business hours, employee schedule, blocks and conflicts
                var validation = await _bookingService.ValidateBookingAsync(
                    dto.EmployeeId, dto.StartTime, dto.EndTime, dto.ServiceId);
                if (!validation.Success)
                {
                    return BadRequest(new { message = validation.Message ?? "Este horario no está disponible" });
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

                // Procesar pago/Seña según configuración del servicio y MP del tenant
                var tenantInfo = _tenantService.GetCurrentTenant();
                if (tenantInfo != null)
                {
                    // 1) Intentar seña si corresponde por configuración del servicio (independiente de toggles de UI)
                    var depositCalc = await _mercadoPagoService.CalculateDepositAsync(service.Id, customer.Id, dto.StartTime);
                    if (depositCalc.Success && depositCalc.Data != null && depositCalc.Data.RequiresDeposit && depositCalc.Data.Amount > 0)
                    {
                        booking.RequiresDeposit = true;
                        booking.DepositAmount = depositCalc.Data.Amount;
                        booking.Status = "pending_payment";
                        await _context.SaveChangesAsync();

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
                            var errorMessage = string.IsNullOrWhiteSpace(paymentResult.Message)
                                ? "No se pudo iniciar el pago de la seña. Intenta nuevamente o contacta al comercio."
                                : paymentResult.Message;
                            return BadRequest(new { message = errorMessage });
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

                    // 2) Si no requiere seña: NO exigir pago en la creación de la reserva
                }

                // Send confirmation email
                try
                {
                    var employee = await _context.Employees.FindAsync(dto.EmployeeId);
                    var tenantName = _tenantService.GetCurrentTenant()?.BusinessName ?? "TurnosPro";
                    await _emailService.SendBookingConfirmationAsync(
                        dto.CustomerEmail,
                        dto.CustomerName,
                        service.Name,
                        booking.StartTime,
                        (int)(booking.EndTime - booking.StartTime).TotalMinutes,
                        service.Price,
                        employee?.Name ?? "Sin asignar",
                        tenantName,
                        confirmationCode
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError(emailEx, "Failed to send booking confirmation email to {Email}", dto.CustomerEmail);
                }

                // Send WhatsApp confirmation (best-effort, non-blocking)
                try
                {
                    await _whatsAppService.SendBookingConfirmationAsync(booking.Id);
                }
                catch (Exception waEx)
                {
                    _logger.LogWarning(waEx, "Failed to send WhatsApp booking confirmation for booking {BookingId}", booking.Id);
                }

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

        private async Task<int> GetMinAdvanceMinutesAsync()
        {
            try
            {
                var tenantInfo = _tenantService.GetCurrentTenant();
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantInfo!.Id);
                if (tenant == null) return 0;
                var settings = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(tenant.Settings ?? "{}")
                    ?? new Dictionary<string, object>();
                if (settings.TryGetValue("bookingMinAdvanceMinutes", out var value))
                {
                    if (value is int iv) return iv;
                    if (value is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.Number)
                    {
                        return je.GetInt32();
                    }
                }
                return 0;
            }
            catch
            {
                return 0;
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
