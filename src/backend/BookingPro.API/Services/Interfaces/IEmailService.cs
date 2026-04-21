namespace BookingPro.API.Services.Interfaces
{
    public interface IEmailService
    {
        Task SendConfirmationEmailAsync(string toEmail, string confirmUrl);
        Task SendBookingConfirmationAsync(string toEmail, string customerName, string serviceName, DateTime startTime, int durationMinutes, decimal price, string professionalName, string businessName, string confirmationCode);

        // Subscription / billing lifecycle
        Task SendPaymentSucceededAsync(string toEmail, string recipientName, decimal amount, string currency, Guid? tenantId = null);
        Task SendPaymentFailedAsync(string toEmail, string recipientName, string upgradeUrl, Guid? tenantId = null);

        // Trial reminders
        Task SendTrialEndingAsync(string toEmail, string recipientName, int daysLeft, string upgradeUrl, Guid? tenantId = null);

        // Diagnostic
        Task SendTestEmailAsync(string toEmail);
    }
}
