using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BookingPro.API.Models.Enums;

namespace BookingPro.API.Models.Entities
{
    [Table("payment_transactions")]
    public class PaymentTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid TenantId { get; set; }
        
        public Guid BookingId { get; set; }
        
        public Guid? CustomerId { get; set; }
        
        // MercadoPago Information
        [MaxLength(100)]
        public string? MercadoPagoPaymentId { get; set; }
        
        [MaxLength(100)]
        public string? MercadoPagoPreferenceId { get; set; }
        
        [MaxLength(100)]
        public string? MercadoPagoMerchantOrderId { get; set; }
        
        // Payment Details
        [Column(TypeName = "decimal(10, 2)")]
        public decimal Amount { get; set; }
        
        [MaxLength(10)]
        public string Currency { get; set; } = "ARS";
        
        [MaxLength(50)]
        public string Status { get; set; } = PaymentTransactionStatus.Pending.ToString().ToLower();
        
        [MaxLength(50)]
        public string PaymentType { get; set; } = "full"; // full, deposit, balance
        
        // Payment Method Details
        [MaxLength(50)]
        public string? PaymentMethod { get; set; } // credit_card, debit_card, cash, bank_transfer
        
        [MaxLength(100)]
        public string? PaymentMethodId { get; set; }
        
        // Additional Information
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public string? MetadataJson { get; set; } // JSON con información adicional
        
        // Processing Information
        public DateTime? ProcessedAt { get; set; }
        
        [MaxLength(100)]
        public string? ProcessorResponseCode { get; set; }
        
        [MaxLength(500)]
        public string? ProcessorResponseMessage { get; set; }
        
        // Refund Information
        public bool IsRefunded { get; set; } = false;
        
        [Column(TypeName = "decimal(10, 2)")]
        public decimal? RefundedAmount { get; set; }
        
        public DateTime? RefundedAt { get; set; }
        
        [MaxLength(500)]
        public string? RefundReason { get; set; }
        
        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Properties
        public Tenant Tenant { get; set; } = null!;
        public Booking Booking { get; set; } = null!;
        public Customer? Customer { get; set; }
    }
}