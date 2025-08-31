using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly ApplicationDbContext _context;

        public PaymentService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Payment>> GetPaymentsAsync()
        {
            return await _context.Payments
                .Include(p => p.Booking)
                .ThenInclude(b => b.Customer)
                .Include(p => p.Booking)
                .ThenInclude(b => b.Service)
                .Include(p => p.Employee)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
        }

        public async Task<Payment?> GetPaymentByIdAsync(Guid id)
        {
            return await _context.Payments
                .Include(p => p.Booking)
                .ThenInclude(b => b.Customer)
                .Include(p => p.Booking)
                .ThenInclude(b => b.Service)
                .Include(p => p.Employee)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Payment> CreatePaymentAsync(CreatePaymentDto dto)
        {
            var booking = await _context.Bookings
                .Include(b => b.Service)
                .Include(b => b.Employee)
                .FirstOrDefaultAsync(b => b.Id == dto.BookingId);

            if (booking == null)
                throw new ArgumentException("Booking not found");

            decimal commissionAmount = 0;
            if (booking.Employee?.PaymentMethod == "percentage" && booking.Employee.CommissionPercentage > 0)
            {
                commissionAmount = dto.Amount * (booking.Employee.CommissionPercentage / 100);
            }

            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                BookingId = dto.BookingId,
                EmployeeId = booking.EmployeeId,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod,
                Status = dto.Status ?? "completed",
                TransactionId = dto.TransactionId,
                CommissionAmount = commissionAmount,
                TipAmount = dto.TipAmount,
                PaymentDate = DateTime.UtcNow,
                Notes = dto.Notes
            };

            _context.Payments.Add(payment);
            
            // Update booking status to completed if payment is successful
            if (payment.Status == "completed")
            {
                booking.Status = "completed";
            }

            await _context.SaveChangesAsync();
            return payment;
        }

        public async Task<Payment?> UpdatePaymentAsync(Guid id, UpdatePaymentDto dto)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null) return null;

            if (dto.Amount.HasValue)
                payment.Amount = dto.Amount.Value;
            if (!string.IsNullOrEmpty(dto.PaymentMethod))
                payment.PaymentMethod = dto.PaymentMethod;
            if (!string.IsNullOrEmpty(dto.Status))
                payment.Status = dto.Status;
            if (dto.TransactionId != null)
                payment.TransactionId = dto.TransactionId;
            if (dto.TipAmount.HasValue)
                payment.TipAmount = dto.TipAmount;
            if (dto.Notes != null)
                payment.Notes = dto.Notes;

            await _context.SaveChangesAsync();
            return payment;
        }

        public async Task<bool> DeletePaymentAsync(Guid id)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null) return false;

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}