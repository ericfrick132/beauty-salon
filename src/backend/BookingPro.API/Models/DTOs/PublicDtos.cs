using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class CreatePublicBookingDto
    {
        [Required, MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? CustomerEmail { get; set; }
        
        [Required, MaxLength(50)]
        public string CustomerPhone { get; set; } = string.Empty;
        
        [Required]
        public Guid EmployeeId { get; set; }
        
        [Required]
        public Guid ServiceId { get; set; }
        
        [Required]
        public DateTime StartTime { get; set; }
        
        [Required]
        public DateTime EndTime { get; set; }
        
        public string? Notes { get; set; }
    }
}