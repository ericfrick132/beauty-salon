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
    public class PaymentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;

        public PaymentsController(
            ApplicationDbContext context,
            ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPayments(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? paymentMethod = null)
        {
            try
            {
                var query = _context.Payments
                    .Include(p => p.Booking)
                        .ThenInclude(b => b.Customer)
                    .Include(p => p.Booking)
                        .ThenInclude(b => b.Service)
                    .Include(p => p.Employee)
                    .AsQueryable();

                if (startDate.HasValue)
                {
                    query = query.Where(p => p.PaymentDate >= startDate.Value);
                }

                if (endDate.HasValue)
                {
                    query = query.Where(p => p.PaymentDate <= endDate.Value);
                }

                if (!string.IsNullOrEmpty(paymentMethod))
                {
                    query = query.Where(p => p.PaymentMethod == paymentMethod);
                }

                var payments = await query
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => new
                    {
                        id = p.Id,
                        bookingId = p.BookingId,
                        customerName = $"{p.Booking.Customer.FirstName} {p.Booking.Customer.LastName}",
                        serviceName = p.Booking.Service.Name,
                        employeeName = p.Employee != null ? p.Employee.Name : null,
                        amount = p.Amount,
                        paymentMethod = p.PaymentMethod,
                        status = p.Status,
                        paymentDate = p.PaymentDate,
                        tipAmount = p.TipAmount,
                        commissionAmount = p.CommissionAmount,
                        transactionId = p.TransactionId,
                        notes = p.Notes
                    })
                    .ToListAsync();

                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDto dto)
        {
            try
            {
                var booking = await _context.Bookings
                    .Include(b => b.Service)
                    .Include(b => b.Employee)
                    .FirstOrDefaultAsync(b => b.Id == dto.BookingId);

                if (booking == null)
                {
                    return NotFound(new { message = "Booking not found" });
                }

                // Check if payment already exists for this booking
                var existingPayment = await _context.Payments
                    .AnyAsync(p => p.BookingId == dto.BookingId && p.Status != "cancelled");

                if (existingPayment)
                {
                    return BadRequest(new { message = "Payment already exists for this booking" });
                }

                // Calculate commission if employee is specified
                decimal? commissionAmount = null;
                if (dto.EmployeeId.HasValue)
                {
                    var employee = await _context.Employees
                        .FirstOrDefaultAsync(e => e.Id == dto.EmployeeId.Value);

                    if (employee != null && employee.CommissionPercentage > 0)
                    {
                        commissionAmount = (dto.Amount * employee.CommissionPercentage) / 100;
                    }
                }

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    BookingId = dto.BookingId,
                    EmployeeId = dto.EmployeeId,
                    Amount = dto.Amount,
                    PaymentMethod = dto.PaymentMethod,
                    Status = "completed",
                    TransactionId = dto.TransactionId,
                    CommissionAmount = commissionAmount,
                    TipAmount = dto.TipAmount,
                    PaymentDate = DateTime.UtcNow,
                    Notes = dto.Notes
                };

                _context.Payments.Add(payment);

                // Update booking status to completed
                booking.Status = "completed";

                await _context.SaveChangesAsync();

                return Ok(new { id = payment.Id, message = "Payment created successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("stats/today")]
        public async Task<IActionResult> GetTodayStats()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var tomorrow = today.AddDays(1);

                var payments = await _context.Payments
                    .Where(p => p.PaymentDate >= today && p.PaymentDate < tomorrow && p.Status == "completed")
                    .ToListAsync();

                var stats = new
                {
                    totalRevenue = payments.Sum(p => p.Amount + (p.TipAmount ?? 0)),
                    cashRevenue = payments.Where(p => p.PaymentMethod == "cash").Sum(p => p.Amount),
                    cardRevenue = payments.Where(p => p.PaymentMethod == "card").Sum(p => p.Amount),
                    transferRevenue = payments.Where(p => p.PaymentMethod == "transfer").Sum(p => p.Amount),
                    mercadopagoRevenue = payments.Where(p => p.PaymentMethod == "mercadopago").Sum(p => p.Amount),
                    totalPayments = payments.Count,
                    pendingPayments = await _context.Bookings
                        .Where(b => b.StartTime >= today && b.StartTime < tomorrow)
                        .Where(b => !_context.Payments.Any(p => p.BookingId == b.Id && p.Status != "cancelled"))
                        .CountAsync()
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdatePaymentStatus(Guid id, [FromBody] UpdateStatusDto dto)
        {
            try
            {
                var payment = await _context.Payments.FindAsync(id);
                
                if (payment == null)
                {
                    return NotFound(new { message = "Payment not found" });
                }

                payment.Status = dto.Status;
                
                if (dto.Status == "refunded")
                {
                    // Update booking status if refunded
                    var booking = await _context.Bookings.FindAsync(payment.BookingId);
                    if (booking != null)
                    {
                        booking.Status = "cancelled";
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Payment status updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class CreatePaymentDto
    {
        public Guid BookingId { get; set; }
        public Guid? EmployeeId { get; set; }
        public decimal Amount { get; set; }
        public decimal? TipAmount { get; set; }
        public string PaymentMethod { get; set; } = "cash";
        public string? TransactionId { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}