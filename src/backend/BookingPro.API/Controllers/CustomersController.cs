using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Data;
using BookingPro.API.Services;
using BookingPro.API.Utilities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerService _customerService;
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IPlanEntitlementService _plans;

        public CustomersController(ICustomerService customerService, ApplicationDbContext context, ITenantProvider tenantProvider, IPlanEntitlementService plans)
        {
            _customerService = customerService;
            _context = context;
            _tenantProvider = tenantProvider;
            _plans = plans;
        }

        /// <summary>
        /// Ficha e historial del cliente (plan Pro): todos sus turnos, cuánto gastó, cada cuánto viene,
        /// servicio y profesional preferidos, y las respuestas que dejó en el formulario.
        /// </summary>
        [HttpGet("{id:guid}/history")]
        public async Task<IActionResult> GetHistory(Guid id)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.CustomerHistory);
            if (!feature.Allowed) return PlanLimitResult.From(feature);

            var customer = await _context.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
            if (customer == null) return NotFound(new { message = "Cliente no encontrado" });

            var bookings = await _context.Bookings.AsNoTracking()
                .Where(b => b.CustomerId == id)
                .OrderByDescending(b => b.StartTime)
                .Select(b => new
                {
                    b.Id, b.StartTime, b.EndTime, b.Status, b.Price, b.Notes, b.CouponCode, b.DiscountAmount, b.SeriesId, b.CustomFieldsJson,
                    b.ServiceId, ServiceName = b.Service.Name,
                    b.EmployeeId, EmployeeName = b.Employee.Name,
                })
                .ToListAsync();
            var paid = await _context.Payments.AsNoTracking()
                .Where(p => p.Booking.CustomerId == id && p.Status == "completed")
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var now = DateTime.UtcNow;
            var attended = bookings.Where(b => b.Status == "completed" || (b.StartTime < now && b.Status == "confirmed")).ToList();
            var visits = attended.Select(b => b.StartTime).OrderBy(d => d).ToList();
            double? avgDaysBetween = visits.Count >= 2
                ? Math.Round((visits[^1] - visits[0]).TotalDays / (visits.Count - 1), 1)
                : null;

            return Ok(new
            {
                customer = new { customer.Id, customer.FirstName, customer.LastName, customer.Email, customer.Phone, customer.Dni, customer.BirthDate, customer.Notes, customer.Tags, customer.CreatedAt },
                stats = new
                {
                    totalBookings = bookings.Count,
                    attended = attended.Count,
                    cancelled = bookings.Count(b => b.Status == "cancelled"),
                    noShows = bookings.Count(b => b.Status == "no_show" || b.Status == "noshow"),
                    // Lo cobrado registrado; si el negocio no carga pagos, lo facturado de los turnos atendidos.
                    totalSpent = paid > 0 ? paid : attended.Sum(b => b.Price ?? 0),
                    firstVisit = visits.Count > 0 ? visits[0] : (DateTime?)null,
                    lastVisit = visits.Count > 0 ? visits[^1] : (DateTime?)null,
                    nextBooking = bookings.Where(b => b.StartTime > now && b.Status != "cancelled").OrderBy(b => b.StartTime).Select(b => (DateTime?)b.StartTime).FirstOrDefault(),
                    avgDaysBetweenVisits = avgDaysBetween,
                    favoriteService = attended.GroupBy(b => b.ServiceName).OrderByDescending(g => g.Count()).Select(g => g.Key).FirstOrDefault(),
                    favoriteEmployee = attended.GroupBy(b => b.EmployeeName).OrderByDescending(g => g.Count()).Select(g => g.Key).FirstOrDefault(),
                },
                bookings = bookings.Select(b => new
                {
                    b.Id, b.StartTime, b.EndTime, b.Status, b.Price, b.Notes, b.CouponCode, b.DiscountAmount, b.SeriesId,
                    b.ServiceId, b.ServiceName, b.EmployeeId, b.EmployeeName,
                    customFields = BookingExtrasService.ParseAnswers(b.CustomFieldsJson),
                }),
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers()
        {
            var result = await _customerService.GetCustomersAsync();
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCustomer(Guid id)
        {
            var result = await _customerService.GetCustomerByIdAsync(id);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerDto dto)
        {
            var result = await _customerService.CreateCustomerAsync(dto);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return CreatedAtAction(nameof(GetCustomer), new { id = result.Data!.Id }, new { id = result.Data.Id, message = result.Message });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerDto dto)
        {
            var result = await _customerService.UpdateCustomerAsync(id, dto);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(new { message = result.Message });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(Guid id)
        {
            var result = await _customerService.DeleteCustomerAsync(id);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(new { message = result.Message });
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchCustomers([FromQuery] string searchTerm)
        {
            var result = await _customerService.SearchCustomersAsync(searchTerm);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
        }
    }
}