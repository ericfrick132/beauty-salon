using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class CreateCustomerDto
    {
        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string LastName { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Email { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [MaxLength(20)]
        public string? Dni { get; set; }
        
        public DateTime? BirthDate { get; set; }
        public string? Notes { get; set; }
        public string? Tags { get; set; }
    }

    public class UpdateCustomerDto
    {
        [MaxLength(100)]
        public string? FirstName { get; set; }
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        [MaxLength(255)]
        public string? Email { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [MaxLength(20)]
        public string? Dni { get; set; }
        
        public DateTime? BirthDate { get; set; }
        public string? Notes { get; set; }
        public string? Tags { get; set; }
    }
}
