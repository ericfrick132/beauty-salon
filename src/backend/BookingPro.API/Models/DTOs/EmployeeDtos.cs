using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class CreateEmployeeDto
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Email { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [MaxLength(50)]
        public string? EmployeeType { get; set; }
        
        public decimal? CommissionPercentage { get; set; }
        public decimal? FixedSalary { get; set; }
        
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }
        
        public string? Specialties { get; set; }
        public string? WorkingHours { get; set; }
        public bool? CanPerformServices { get; set; }
    }

    public class UpdateEmployeeDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }
        
        [MaxLength(255)]
        public string? Email { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [MaxLength(50)]
        public string? EmployeeType { get; set; }
        
        public decimal? CommissionPercentage { get; set; }
        public decimal? FixedSalary { get; set; }
        
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }
        
        public string? Specialties { get; set; }
        public string? WorkingHours { get; set; }
        public bool? CanPerformServices { get; set; }
        public bool? IsActive { get; set; }
    }

    public class PayCommissionDto
    {
        [Required]
        public decimal Amount { get; set; }
        
        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty;
        
        public string? Notes { get; set; }
    }
}