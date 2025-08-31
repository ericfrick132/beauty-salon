namespace BookingPro.API.Models.DTOs
{
    public class CreatePaymentLinkDto
    {
        public Guid BookingId { get; set; }
        public decimal Amount { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
    }

    public class PaymentLinkResponseDto
    {
        public string PaymentLink { get; set; } = string.Empty;
        public string PreferenceId { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }
}