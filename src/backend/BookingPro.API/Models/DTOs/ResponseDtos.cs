namespace BookingPro.API.Models.DTOs
{
    // Booking Response DTOs
    public class BookingListDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? Notes { get; set; }
    }

    public class BookingDetailDto
    {
        public Guid Id { get; set; }
        public CustomerSummaryDto Customer { get; set; } = new();
        public EmployeeSummaryDto Employee { get; set; } = new();
        public ServiceSummaryDto Service { get; set; } = new();
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? Notes { get; set; }
        public bool ReminderSent { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? CancellationReason { get; set; }
    }

    // Customer Response DTOs
    public class CustomerListDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Dni { get; set; }
        public DateTime? BirthDate { get; set; }
        public int BookingCount { get; set; }
        public DateTime? LastBooking { get; set; }
    }

    public class CustomerDetailDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Dni { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? Notes { get; set; }
        public string? Tags { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<BookingSummaryDto> Bookings { get; set; } = new();
    }

    public class CustomerSearchDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Dni { get; set; }
        public string FullName { get; set; } = string.Empty;
    }

    // Employee Response DTOs
    public class EmployeeListDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? EmployeeType { get; set; }
        public decimal? CommissionPercentage { get; set; }
        public decimal? FixedSalary { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Specialties { get; set; }
        public string? WorkingHours { get; set; }
        public bool? CanPerformServices { get; set; }
        public bool? IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal PendingCommissions { get; set; }
    }

    public class EmployeeDetailDto : EmployeeListDto
    {
        public DateTime? DeactivatedAt { get; set; }
        public List<CommissionSummaryDto> RecentCommissions { get; set; } = new();
    }

    // Summary DTOs for nested objects
    public class CustomerSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
    }

    public class EmployeeSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class ServiceSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int DurationMinutes { get; set; }
    }

    public class BookingSummaryDto
    {
        public Guid Id { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public ServiceSummaryDto Service { get; set; } = new();
        public EmployeeSummaryDto Employee { get; set; } = new();
    }

    public class CommissionSummaryDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public int TotalServices { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal? CommissionPercentage { get; set; }
        public decimal CommissionAmount { get; set; }
        public decimal? FixedSalary { get; set; }
        public decimal TotalEarnings { get; set; }
        public bool IsPaid { get; set; }
    }
}