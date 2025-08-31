using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class CreateBookingDto
    {
        [Required]
        public Guid CustomerId { get; set; }
        
        [Required]
        public Guid EmployeeId { get; set; }
        
        [Required]
        public Guid ServiceId { get; set; }
        
        [Required]
        public DateTime StartTime { get; set; }
        
        [Required]
        public DateTime EndTime { get; set; }
        
        public string? Status { get; set; }
        public decimal? Price { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateBookingDto
    {
        public Guid? CustomerId { get; set; }
        public Guid? EmployeeId { get; set; }
        public Guid? ServiceId { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? Status { get; set; }
        public decimal? Price { get; set; }
        public string? Notes { get; set; }
        public string? CancellationReason { get; set; }
    }

    public class UpdateBookingStatusDto
    {
        [Required]
        public string NewStatus { get; set; } = string.Empty;
        
        public string? Reason { get; set; }
        public string? Notes { get; set; }
        
        // Para cancelaciones
        public string? CancellationReason { get; set; }
        
        // Para no-shows
        public bool WasNoShow { get; set; } = false;
    }
}