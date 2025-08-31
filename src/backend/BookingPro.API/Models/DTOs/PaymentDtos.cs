using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class CreatePaymentDto
    {
        [Required]
        public Guid BookingId { get; set; }
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? Status { get; set; }
        
        public string? TransactionId { get; set; }
        public decimal? TipAmount { get; set; }
        public string? Notes { get; set; }
        
        // For public bookings
        public string? Subdomain { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        
        // Payment type
        [Required]
        public string PaymentType { get; set; } = "full"; // full, deposit, balance
    }

    public class UpdatePaymentDto
    {
        public decimal? Amount { get; set; }
        
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }
        
        [MaxLength(50)]
        public string? Status { get; set; }
        
        public string? TransactionId { get; set; }
        public decimal? TipAmount { get; set; }
        public string? Notes { get; set; }
    }

    public class CreatePaymentResponseDto
    {
        public string PreferenceId { get; set; } = string.Empty;
        public string InitPoint { get; set; } = string.Empty;
        public string? SandboxInitPoint { get; set; }
        public Guid TransactionId { get; set; }
        public decimal Amount { get; set; }
        public string? PublicKey { get; set; }
    }

    public class UpdatePaymentConfigurationDto
    {
        [MaxLength(500)]
        public string? MercadoPagoPublicKey { get; set; }
        
        [MaxLength(500)]
        public string? MercadoPagoAccessToken { get; set; }
        
        public bool IsEnabled { get; set; }
        public bool IsSandbox { get; set; }
        public bool RequireImmediatePayment { get; set; }
        public decimal? MinimumDepositPercentage { get; set; }
        public decimal? MinimumDepositAmount { get; set; }
    }

    // MercadoPago specific DTOs
    public class MercadoPagoConfigurationDto
    {
        public Guid Id { get; set; }
        public bool IsActive { get; set; }
        public DateTime? ConnectedAt { get; set; }
        public string? UserEmail { get; set; }
        public int PaymentExpirationMinutes { get; set; }
    }

    public class MercadoPagoAuthCallbackDto
    {
        public string Code { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
    }

    public class PaymentPreferenceResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string InitPoint { get; set; } = string.Empty;
        public string SandboxInitPoint { get; set; } = string.Empty;
        public string QrCode { get; set; } = string.Empty;
        public string DeepLink { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    public class PaymentNotificationDto
    {
        public string Id { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public PaymentData Data { get; set; } = new();
        public DateTime DateCreated { get; set; }
        public string UserId { get; set; } = string.Empty;
        public bool LiveMode { get; set; }
        public string Type { get; set; } = string.Empty;
    }

    public class PaymentData
    {
        public string Id { get; set; } = string.Empty;
    }

    public class ServiceDepositConfigDto
    {
        public bool RequiresDeposit { get; set; }
        public decimal? DepositPercentage { get; set; }
        public decimal? DepositFixedAmount { get; set; }
        public string DepositPolicy { get; set; } = "AllCustomers";
        public int? DepositAdvanceDays { get; set; }
    }

    public class CalculateDepositDto
    {
        public Guid ServiceId { get; set; }
        public Guid? CustomerId { get; set; }
        public DateTime BookingDate { get; set; }
    }

    public class DepositCalculationResultDto
    {
        public bool RequiresDeposit { get; set; }
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}