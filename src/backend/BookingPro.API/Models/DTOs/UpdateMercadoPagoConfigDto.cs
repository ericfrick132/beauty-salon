namespace BookingPro.API.Models.DTOs
{
    public class UpdateMercadoPagoConfigDto
    {
        public int PaymentExpirationMinutes { get; set; } = 5;
    }
}