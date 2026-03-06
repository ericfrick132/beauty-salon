namespace BookingPro.API.Services.Interfaces
{
    public interface IEmailService
    {
        Task SendConfirmationEmailAsync(string toEmail, string confirmUrl);
        Task SendBookingConfirmationAsync(string toEmail, string customerName, string serviceName, DateTime startTime, int durationMinutes, decimal price, string professionalName, string businessName, string confirmationCode);
    }
}
