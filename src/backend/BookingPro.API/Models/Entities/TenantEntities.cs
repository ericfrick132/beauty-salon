using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BookingPro.API.Models.Interfaces;
using BookingPro.API.Models.Enums;

namespace BookingPro.API.Models.Entities
{
    // TABLAS POR TENANT (tenant schema)
    
    public class ServiceCategory : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Service> Services { get; set; } = new List<Service>();
    }

    public class Service : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid? CategoryId { get; set; }
        
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        [Required]
        public int DurationMinutes { get; set; }
        
        [Required]
        public decimal Price { get; set; }
        
        // Deposit/Payment configuration
        public bool RequiresDeposit { get; set; } = false;
        public decimal? DepositPercentage { get; set; } // Percentage of total price (0-100)
        public decimal? DepositFixedAmount { get; set; } // Fixed amount instead of percentage
        public string DepositPolicy { get; set; } = "AllCustomers"; // AllCustomers, NewCustomersOnly, AdvanceBookingOnly
        public int? DepositAdvanceDays { get; set; } // Days in advance to require deposit
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ServiceCategory? Category { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }


    public class Customer : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? LastName { get; set; }
        
        [MaxLength(255)]
        public string? Email { get; set; }
        
        [Required, MaxLength(50)]
        public string Phone { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? Dni { get; set; }
        
        public DateTime? BirthDate { get; set; }
        
        public string? Notes { get; set; }
        
        public string? Tags { get; set; } // JSON
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }

    public class Booking : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid CustomerId { get; set; }
        public Guid EmployeeId { get; set; } // Changed from ProfessionalId to EmployeeId
        public Guid ServiceId { get; set; }
        
        [Required]
        public DateTime StartTime { get; set; }
        
        [Required]
        public DateTime EndTime { get; set; }
        
        [MaxLength(50)]
        public string Status { get; set; } = BookingStatus.Confirmed.ToString().ToLower();
        
        public decimal? Price { get; set; }
        
        public string? Notes { get; set; }
        
        public bool ReminderSent { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CancelledAt { get; set; }
        
        public string? CancellationReason { get; set; }
        
        // Payment information
        public bool RequiresDeposit { get; set; } = false;
        public decimal? DepositAmount { get; set; }
        
        // Navigation properties
        public Customer Customer { get; set; } = null!;
        public Employee Employee { get; set; } = null!; // Changed from Professional to Employee
        public Service Service { get; set; } = null!;
        public ICollection<Payment> Payments { get; set; } = new List<Payment>(); // One booking can have multiple payments
    }

    public class Schedule : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid EmployeeId { get; set; } // Changed from ProfessionalId to EmployeeId
        
        [Required]
        public int DayOfWeek { get; set; } // 0 = Sunday, 1 = Monday, etc.
        
        [Required]
        public TimeSpan StartTime { get; set; }
        
        [Required]
        public TimeSpan EndTime { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public Employee Employee { get; set; } = null!; // Changed from Professional to Employee
    }

    public class Employee : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid? UserId { get; set; } // opcional, referencia a public.users
        
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Email { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [MaxLength(50)]
        public string EmployeeType { get; set; } = "employee"; // employee, contractor
        
        // Payment & Commission fields
        public decimal CommissionPercentage { get; set; } = 0; // 0-100
        public decimal FixedSalary { get; set; } = 0;
        
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = "percentage"; // percentage, fixed, mixed
        
        // Service & Operational fields (merged from Professional)
        public string? Specialties { get; set; } // JSON array de service_ids
        public string? WorkingHours { get; set; } // JSON horarios por día
        public bool CanPerformServices { get; set; } = true; // Can this employee perform services?
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeactivatedAt { get; set; }
        
        // Navigation properties
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>(); // Bookings assigned to this employee
        public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>(); // Working schedules
    }

    public class Payment : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid BookingId { get; set; }
        
        public Guid? CustomerId { get; set; } // Customer who made the payment
        
        public Guid? EmployeeId { get; set; } // Employee who received the payment
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty; // cash, card, transfer, mercadopago
        
        [MaxLength(50)]
        public string Status { get; set; } = PaymentStatus.Completed.ToString().ToLower();
        
        public string? TransactionId { get; set; } // For electronic payments
        
        // MercadoPago specific fields
        public string? MercadoPagoPaymentId { get; set; }
        public string? MercadoPagoPreferenceId { get; set; }
        public string? PaymentLink { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? PayerEmail { get; set; }
        public string? PayerName { get; set; }
        public string? FailureReason { get; set; }
        
        public decimal? CommissionAmount { get; set; } // Commission calculated for this payment
        
        public decimal? TipAmount { get; set; }
        
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        
        public string? Notes { get; set; }
        
        // Payment type
        public string PaymentType { get; set; } = "full"; // full, deposit, balance
        
        // Navigation properties
        public Booking Booking { get; set; } = null!;
        public Employee? Employee { get; set; }
        public Customer? Customer { get; set; }
    }

    public class DailyReport : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public DateTime Date { get; set; }
        
        public decimal TotalRevenue { get; set; }
        
        public decimal CashRevenue { get; set; }
        
        public decimal CardRevenue { get; set; }
        
        public decimal TransferRevenue { get; set; }
        
        public decimal MercadoPagoRevenue { get; set; }
        
        public int TotalBookings { get; set; }
        
        public int CompletedBookings { get; set; }
        
        public int CancelledBookings { get; set; }
        
        public decimal TotalCommissions { get; set; }
        
        public decimal TotalTips { get; set; }
        
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }

    public class BookingStatusHistory : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid BookingId { get; set; }
        
        [MaxLength(50)]
        public string FromStatus { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string ToStatus { get; set; } = string.Empty;
        
        public string? Reason { get; set; }
        public string? Notes { get; set; }
        
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
        
        [MaxLength(100)]
        public string? ChangedBy { get; set; }
        
        // Navigation properties
        public Booking Booking { get; set; } = null!;
    }
}