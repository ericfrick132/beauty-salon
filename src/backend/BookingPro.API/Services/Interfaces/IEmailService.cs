namespace BookingPro.API.Services.Interfaces
{
    public interface IEmailService
    {
        Task SendConfirmationEmailAsync(string toEmail, string confirmUrl);
    }
}
