using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Representa una suscripción recurrente de un tenant usando MercadoPago Preapproval.
    /// Cuando el tenant autoriza, MercadoPago cobra automáticamente cada mes.
    /// </summary>
    [Table("tenant_preapprovals", Schema = "public")]
    public class TenantPreapproval
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid TenantId { get; set; }

        public Guid SubscriptionPlanId { get; set; }

        // MercadoPago Preapproval data
        [Required, MaxLength(100)]
        public string MercadoPagoPreapprovalId { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? InitPoint { get; set; } // URL donde el usuario autoriza el débito automático

        [MaxLength(500)]
        public string? SandboxInitPoint { get; set; }

        // Status: pending, authorized, paused, cancelled
        [Required, MaxLength(50)]
        public string Status { get; set; } = "pending";

        // Payer info
        [Required, MaxLength(255)]
        public string PayerEmail { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? PayerId { get; set; } // MercadoPago payer ID

        // Recurring configuration
        public int FrequencyValue { get; set; } = 1;

        [MaxLength(20)]
        public string FrequencyType { get; set; } = "months"; // days, months

        public decimal TransactionAmount { get; set; }

        [MaxLength(10)]
        public string CurrencyId { get; set; } = "ARS";

        [MaxLength(200)]
        public string? ExternalReference { get; set; }

        [MaxLength(255)]
        public string? Reason { get; set; } // Description shown to user

        // Dates
        public DateTime? DateCreated { get; set; } // MP creation date
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? AuthorizedAt { get; set; }
        public DateTime? NextPaymentDate { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public DateTime? CancelledAt { get; set; }
        public DateTime? PausedAt { get; set; }

        // Payment tracking
        public int ConsecutiveFailedPayments { get; set; } = 0;

        [MaxLength(500)]
        public string? LastFailureReason { get; set; }

        public int TotalPaymentsProcessed { get; set; } = 0;
        public decimal TotalAmountPaid { get; set; } = 0;

        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Tenant Tenant { get; set; } = null!;
        public virtual SubscriptionPlan SubscriptionPlan { get; set; } = null!;
        public virtual ICollection<PreapprovalPayment> Payments { get; set; } = new List<PreapprovalPayment>();
    }

    /// <summary>
    /// Registro de cada pago recurrente procesado por MercadoPago.
    /// Se crea cuando MercadoPago notifica via webhook subscription_authorized_payment.
    /// </summary>
    [Table("preapproval_payments", Schema = "public")]
    public class PreapprovalPayment
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid TenantId { get; set; }

        public Guid TenantPreapprovalId { get; set; }

        // MercadoPago payment data
        [Required, MaxLength(100)]
        public string MercadoPagoPaymentId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? MercadoPagoPreapprovalId { get; set; } // Reference to parent preapproval

        public decimal Amount { get; set; }

        [MaxLength(10)]
        public string CurrencyId { get; set; } = "ARS";

        // Status: approved, rejected, pending, in_process, cancelled, refunded
        [Required, MaxLength(50)]
        public string Status { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? StatusDetail { get; set; } // accredited, pending_contingency, etc.

        // Payment method info
        [MaxLength(100)]
        public string? PaymentMethodId { get; set; } // visa, master, etc.

        [MaxLength(50)]
        public string? PaymentTypeId { get; set; } // credit_card, debit_card, etc.

        [MaxLength(6)]
        public string? CardLastFourDigits { get; set; }

        // Dates
        public DateTime? PaymentDate { get; set; } // When MP processed it
        public DateTime? MoneyReleaseDate { get; set; }

        // Retry info
        public int RetryAttempt { get; set; } = 0;

        [MaxLength(500)]
        public string? FailureReason { get; set; }

        [MaxLength(200)]
        public string? ExternalReference { get; set; }

        // Period this payment covers
        public DateTime? PeriodStart { get; set; }
        public DateTime? PeriodEnd { get; set; }

        // Raw response (for debugging)
        public string? RawResponse { get; set; } // JSON

        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Tenant Tenant { get; set; } = null!;
        public virtual TenantPreapproval TenantPreapproval { get; set; } = null!;
    }
}
