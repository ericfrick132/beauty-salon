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
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #f0f4f8; padding: 40px 0;"">
  <tr>
    <td align=""center"">
      <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"">
        <!-- Header -->
        <tr>
          <td style=""background: linear-gradient(135deg, #1565c0, #1e88e5, #42a5f5); padding: 40px 40px 32px; text-align: center;"">
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" style=""margin: 0 auto;"">
              <tr>
                <td style=""background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px;"">
                  <span style=""font-size: 28px; color: #ffffff; font-weight: 800; letter-spacing: -0.5px;"">TurnosPro</span>
                </td>
              </tr>
            </table>
            <p style=""color: rgba(255,255,255,0.85); font-size: 14px; margin: 16px 0 0; letter-spacing: 0.3px;"">Sistema de gestión de turnos online</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style=""padding: 40px 40px 16px;"">
            <h1 style=""margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #1a1a2e;"">¡Estás a un paso!</h1>
            <p style=""margin: 0 0 28px; font-size: 16px; color: #555; line-height: 1.6;"">
              Confirmá tu dirección de email para activar tu cuenta y empezar a gestionar tus turnos de forma profesional.
            </p>
            <!-- Button -->
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
              <tr>
                <td align=""center"" style=""padding: 8px 0 32px;"">
                  <a href=""{confirmUrl}""
                     style=""display: inline-block; background: linear-gradient(135deg, #1565c0, #1e88e5); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 50px; letter-spacing: 0.3px;"">
                    Confirmar mi email
                  </a>
                </td>
              </tr>
            </table>
            <!-- Divider -->
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
              <tr>
                <td style=""border-top: 1px solid #e8ecf0; padding-top: 24px;"">
                  <p style=""margin: 0 0 12px; font-size: 13px; color: #888; line-height: 1.5;"">
                    Si el botón no funciona, copiá y pegá este link en tu navegador:
                  </p>
                  <p style=""margin: 0 0 24px; font-size: 13px; word-break: break-all;"">
                    <a href=""{confirmUrl}"" style=""color: #1e88e5; text-decoration: underline;"">{confirmUrl}</a>
                  </p>
                </td>
              </tr>
            </table>
            <!-- Info box -->
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
              <tr>
                <td style=""background-color: #f8fafc; border-radius: 10px; padding: 20px; border-left: 4px solid #1e88e5;"">
                  <p style=""margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #1a1a2e;"">&#128337; Este link expira en 24 horas</p>
                  <p style=""margin: 0; font-size: 13px; color: #777; line-height: 1.5;"">Si no solicitaste esta cuenta, podés ignorar este email con total tranquilidad.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style=""padding: 24px 40px 32px; text-align: center;"">
            <p style=""margin: 0 0 4px; font-size: 12px; color: #aaa;"">© {DateTime.UtcNow.Year} TurnosPro — turnos-pro.com</p>
            <p style=""margin: 0; font-size: 12px; color: #ccc;"">Buenos Aires, Argentina</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>"
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
