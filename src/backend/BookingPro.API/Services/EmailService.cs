using System.Net;
using System.Net.Mail;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendConfirmationEmailAsync(string toEmail, string confirmUrl)
        {
            var from = _config["Email:From"]!;
            var password = _config["Email:Password"]!;
            var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "587");

            using var message = new MailMessage(from, toEmail)
            {
                Subject = "Confirmá tu cuenta en TurnosPro",
                IsBodyHtml = true,
                Body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
    <h2 style=""color: #1976d2;"">Bienvenido a TurnosPro</h2>
    <p>Hacé click en el siguiente botón para confirmar tu email y continuar con el registro:</p>
    <p style=""text-align: center; margin: 30px 0;"">
        <a href=""{confirmUrl}""
           style=""background-color: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px;"">
            Confirmar mi email
        </a>
    </p>
    <p style=""color: #666; font-size: 14px;"">Si no creaste esta cuenta, podés ignorar este email.</p>
    <p style=""color: #666; font-size: 12px;"">Este link expira en 24 horas.</p>
    <hr style=""border: none; border-top: 1px solid #eee; margin: 20px 0;"" />
    <p style=""color: #999; font-size: 12px;"">TurnosPro - Sistema de gestión de turnos</p>
</div>"
            };

            using var smtp = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(from, password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(message);
            _logger.LogInformation("Confirmation email sent to {Email}", toEmail);
        }
    }
}
