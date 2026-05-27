using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    // ============================ OAuth flow ============================

    public class InitiateChytapayOAuthDto
    {
        [MaxLength(1000)]
        public string? RedirectUrl { get; set; }
    }

    public class ChytapayOAuthUrlDto
    {
        public string AuthorizationUrl { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    public class ChytapayOAuthCallbackDto
    {
        [Required]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string State { get; set; } = string.Empty;

        public string? Error { get; set; }
        public string? ErrorDescription { get; set; }
    }

    /// <summary>
    /// Token response from POST /integration/oauth2/token (and /refresh).
    /// Chytapay returns idToken/refreshToken/expires_in.
    /// </summary>
    public class ChytapayTokenResponseDto
    {
        public string IdToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public int ExpiresIn { get; set; } // seconds
        public string TokenType { get; set; } = string.Empty;
    }

    public class ChytapayConnectionStatusDto
    {
        public bool IsConnected { get; set; }
        public DateTime? ConnectedAt { get; set; }
        public DateTime? IdTokenExpiresAt { get; set; }
        public bool NeedsRefresh { get; set; }
        public bool IsTestMode { get; set; }
        public string? LastError { get; set; }
    }

    public class DisconnectChytapayDto
    {
        public bool ConfirmDisconnect { get; set; } = false;
    }

    // ============================ Payment request ============================

    public class ChytapayCustomerPhoneDto
    {
        [Required]
        public string CountryCode { get; set; } = "+54";

        [Required]
        public string Number { get; set; } = string.Empty;
    }

    public class ChytapayCustomerDto
    {
        [Required, MinLength(2), MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public ChytapayCustomerPhoneDto? PhoneNumber { get; set; }

        [MaxLength(320)]
        public string? Email { get; set; }
    }

    public class ChytapaySurchargeDto
    {
        /// <summary>"%", "fixed", or "none"</summary>
        [Required]
        public string Type { get; set; } = "none";

        public decimal Value { get; set; } = 0;
    }

    /// <summary>
    /// Body for POST /api/chytapay/create-payment-request — what the frontend
    /// (or NewBooking flow) sends. The service expands customer / dueDates
    /// from the linked booking when not provided.
    /// </summary>
    public class CreateChytapayPaymentRequestDto
    {
        [Required]
        public Guid BookingId { get; set; }

        /// <summary>Override amount; if null, uses booking deposit amount.</summary>
        public decimal? Amount { get; set; }

        /// <summary>Free-text description for the cobro.</summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>One or two YYYY-MM-DD dates, each ≤35 days from today.</summary>
        public List<string>? DueDates { get; set; }

        public ChytapaySurchargeDto? Surcharge { get; set; }

        public bool SendWhatsappNotification { get; set; } = true;
        public bool SendEmailNotification { get; set; } = false;
    }

    public class ChytapayPaymentRequestResultDto
    {
        public string PaymentRequestId { get; set; } = string.Empty;
        public string ReferenceId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public string? Cvu { get; set; }
        public string? BankAccountHolder { get; set; }
        public string? BankAccountHolderTaxId { get; set; }
        public string? BankName { get; set; }
    }

    // ============================ Webhook ============================

    public class ChytapayWebhookPayloadDto
    {
        public string ReferenceId { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
        public decimal TotalAmountToPay { get; set; }
        public decimal PaidAmount { get; set; }
        public int CurrentDueDateIndex { get; set; }
        public DateTime? CurrentDueDate { get; set; }
        /// <summary>"PAID" or "PARTIAL_PAID"</summary>
        public string StateType { get; set; } = string.Empty;
    }
}
