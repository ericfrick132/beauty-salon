using System.Net;
using System.Net.Mail;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;
        private readonly ApplicationDbContext _db;

        public EmailService(IConfiguration config, ILogger<EmailService> logger, ApplicationDbContext db)
        {
            _config = config;
            _logger = logger;
            _db = db;
        }

        // ====================================================================
        // Helpers
        // ====================================================================

        private (string from, string password, string host, int port) GetSmtpConfig()
        {
            var from = _config["Email:From"] ?? "";
            var password = _config["Email:Password"] ?? "";
            var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "587");
            return (from, password, smtpHost, smtpPort);
        }

        /// <summary>
        /// Core send primitive. Persists an <see cref="EmailLog"/> row for every
        /// attempt — status=sent on success, status=failed + ErrorMessage on
        /// failure. Failures are logged but NOT rethrown by default so that
        /// non-critical emails (reminders, trial warnings) don't crash callers.
        /// Callers that need a hard failure signal should pass throwOnError=true.
        /// </summary>
        private async Task SendAndLogAsync(
            string toEmail,
            string subject,
            string htmlBody,
            string templateKey,
            Guid? tenantId = null,
            bool throwOnError = false)
        {
            var (from, password, smtpHost, smtpPort) = GetSmtpConfig();

            var log = new EmailLog
            {
                Id = Guid.NewGuid(),
                ToEmail = toEmail ?? "",
                Subject = subject ?? "",
                TemplateKey = templateKey,
                Status = "sent",
                ErrorMessage = null,
                TenantId = tenantId,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                using var message = new MailMessage(from, toEmail)
                {
                    Subject = subject,
                    IsBodyHtml = true,
                    Body = htmlBody
                };
                using var smtp = new SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new NetworkCredential(from, password),
                    EnableSsl = true
                };
                await smtp.SendMailAsync(message);
                _logger.LogInformation("Email sent: template={Template} to={Email}", templateKey, toEmail);
            }
            catch (Exception ex)
            {
                log.Status = "failed";
                log.ErrorMessage = ex.Message.Length > 2000 ? ex.Message.Substring(0, 2000) : ex.Message;
                _logger.LogError(ex, "Email send failed: template={Template} to={Email}", templateKey, toEmail);
                if (throwOnError)
                {
                    await PersistLogSafelyAsync(log);
                    throw;
                }
            }

            await PersistLogSafelyAsync(log);
        }

        private async Task PersistLogSafelyAsync(EmailLog log)
        {
            try
            {
                _db.EmailLogs.Add(log);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist EmailLog row for template={Template} to={Email}",
                    log.TemplateKey, log.ToEmail);
            }
        }

        // ====================================================================
        // Existing methods (kept signature-compatible)
        // ====================================================================

        public async Task SendConfirmationEmailAsync(string toEmail, string confirmUrl)
        {
            var subject = "Confirmá tu cuenta en TurnosPro";
            var body = $@"
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #f0f4f8; padding: 40px 0;"">
  <tr>
    <td align=""center"">
      <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"">
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
        <tr>
          <td style=""padding: 40px 40px 16px;"">
            <h1 style=""margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #1a1a2e;"">¡Estás a un paso!</h1>
            <p style=""margin: 0 0 28px; font-size: 16px; color: #555; line-height: 1.6;"">
              Confirmá tu dirección de email para activar tu cuenta y empezar a gestionar tus turnos de forma profesional.
            </p>
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
</html>";

            await SendAndLogAsync(toEmail, subject, body, "welcome");
        }

        public async Task SendBookingConfirmationAsync(string toEmail, string customerName, string serviceName, DateTime startTime, int durationMinutes, decimal price, string professionalName, string businessName, string confirmationCode)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
            var localStart = TimeZoneInfo.ConvertTimeFromUtc(startTime, tz);
            var dateStr = localStart.ToString("dddd d 'de' MMMM", new System.Globalization.CultureInfo("es-AR"));
            var timeStr = localStart.ToString("HH:mm");
            var endTime = localStart.AddMinutes(durationMinutes);
            var endTimeStr = endTime.ToString("HH:mm");

            var subject = $"Confirmación de turno en {businessName}";
            var body = $@"
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #f0f4f8; padding: 40px 0;"">
  <tr>
    <td align=""center"">
      <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"">
        <tr>
          <td style=""background: linear-gradient(135deg, #1565c0, #1e88e5, #42a5f5); padding: 40px 40px 32px; text-align: center;"">
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" style=""margin: 0 auto;"">
              <tr>
                <td style=""background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px;"">
                  <span style=""font-size: 28px; color: #ffffff; font-weight: 800; letter-spacing: -0.5px;"">{businessName}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style=""padding: 40px 40px 16px;"">
            <h1 style=""margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #1a1a2e;"">&#9989; Turno confirmado</h1>
            <p style=""margin: 0 0 28px; font-size: 16px; color: #555; line-height: 1.6;"">
              Hola <strong>{customerName}</strong>, tu turno fue reservado con éxito.
            </p>
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #f8fafc; border-radius: 12px; overflow: hidden;"">
              <tr>
                <td style=""padding: 24px;"">
                  <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                    <tr>
                      <td style=""padding: 8px 0;"">
                        <span style=""font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;"">Servicio</span><br/>
                        <span style=""font-size: 16px; font-weight: 600; color: #1a1a2e;"">{serviceName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style=""padding: 8px 0; border-top: 1px solid #e8ecf0;"">
                        <span style=""font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;"">Fecha y hora</span><br/>
                        <span style=""font-size: 16px; font-weight: 600; color: #1a1a2e;"">&#128197; {dateStr}</span><br/>
                        <span style=""font-size: 16px; font-weight: 600; color: #1e88e5;"">&#128337; {timeStr} - {endTimeStr}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style=""padding: 8px 0; border-top: 1px solid #e8ecf0;"">
                        <span style=""font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;"">Profesional</span><br/>
                        <span style=""font-size: 16px; font-weight: 600; color: #1a1a2e;"">{professionalName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style=""padding: 8px 0; border-top: 1px solid #e8ecf0;"">
                        <span style=""font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;"">Precio</span><br/>
                        <span style=""font-size: 20px; font-weight: 700; color: #1565c0;"">$ {price:N0}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""margin-top: 20px;"">
              <tr>
                <td align=""center"" style=""background-color: #e3f2fd; border-radius: 10px; padding: 16px;"">
                  <span style=""font-size: 13px; color: #666;"">Código de confirmación</span><br/>
                  <span style=""font-size: 24px; font-weight: 700; color: #1565c0; letter-spacing: 2px;"">{confirmationCode}</span>
                </td>
              </tr>
            </table>
            <p style=""margin: 24px 0 0; font-size: 13px; color: #888; line-height: 1.5;"">
              Si necesitás cancelar o reprogramar, contactá directamente a {businessName}.
            </p>
          </td>
        </tr>
        <tr>
          <td style=""padding: 24px 40px 32px; text-align: center;"">
            <p style=""margin: 0 0 4px; font-size: 12px; color: #aaa;"">Reservado a través de TurnosPro</p>
            <p style=""margin: 0; font-size: 12px; color: #ccc;"">turnos-pro.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>";

            await SendAndLogAsync(toEmail, subject, body, "booking_confirmation");
        }

        // ====================================================================
        // New lifecycle methods
        // ====================================================================

        public async Task SendPaymentSucceededAsync(string toEmail, string recipientName, decimal amount, string currency, Guid? tenantId = null)
        {
            var subject = "Pago recibido — tu suscripción sigue activa";
            var body = BaseLayout(
                headline: "Pago recibido",
                leadHtml: $"Hola <strong>{System.Net.WebUtility.HtmlEncode(recipientName ?? "")}</strong>, recibimos tu pago correctamente. Gracias por seguir con TurnosPro.",
                bodyHtml: $@"
<table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #f8fafc; border-radius: 12px; overflow: hidden;"">
  <tr>
    <td style=""padding: 24px;"">
      <span style=""font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;"">Monto cobrado</span><br/>
      <span style=""font-size: 28px; font-weight: 700; color: #1565c0;"">{currency} {amount:N2}</span>
      <p style=""margin: 16px 0 0; font-size: 14px; color: #555; line-height: 1.55;"">
        Tu acceso al panel se renovó. No hay nada que hacer de tu parte.
      </p>
    </td>
  </tr>
</table>"
            );
            await SendAndLogAsync(toEmail, subject, body, "payment_succeeded", tenantId);
        }

        public async Task SendPaymentFailedAsync(string toEmail, string recipientName, string upgradeUrl, Guid? tenantId = null)
        {
            var subject = "Tu pago no pudo procesarse";
            var body = BaseLayout(
                headline: "Hubo un problema con tu pago",
                leadHtml: $"Hola <strong>{System.Net.WebUtility.HtmlEncode(recipientName ?? "")}</strong>, intentamos cobrar tu suscripción pero el pago no fue aprobado.",
                bodyHtml: $@"
<p style=""margin: 0 0 20px; font-size: 15px; color: #555; line-height: 1.6;"">
  Esto puede pasar por un problema temporal con la tarjeta o el banco. Para no perder acceso al panel, actualizá tu método de pago acá:
</p>
<table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
  <tr>
    <td align=""center"" style=""padding: 8px 0 24px;"">
      <a href=""{upgradeUrl}"" style=""display: inline-block; background: linear-gradient(135deg, #c13a16, #e05a32); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 50px;"">
        Reintentar pago
      </a>
    </td>
  </tr>
</table>
<p style=""margin: 0; font-size: 13px; color: #888; line-height: 1.5;"">
  Si ya pagaste, ignorá este email — los webhooks pueden demorar unos minutos en reflejarse.
</p>"
            );
            await SendAndLogAsync(toEmail, subject, body, "payment_failed", tenantId);
        }

        public async Task SendTrialEndingAsync(string toEmail, string recipientName, int daysLeft, string upgradeUrl, Guid? tenantId = null)
        {
            var templateKey = daysLeft > 0 ? "trial_ending_2d" : "trial_expired";
            var subject = daysLeft > 0
                ? $"Tu prueba termina en {daysLeft} día{(daysLeft == 1 ? "" : "s")}"
                : "Tu período de prueba terminó";

            var headline = daysLeft > 0
                ? $"Quedan {daysLeft} día{(daysLeft == 1 ? "" : "s")} de prueba"
                : "Tu prueba gratuita terminó";

            var lead = daysLeft > 0
                ? $"Hola <strong>{System.Net.WebUtility.HtmlEncode(recipientName ?? "")}</strong>, tu período de prueba está por terminar. Activá tu suscripción para seguir usando el panel sin interrupciones."
                : $"Hola <strong>{System.Net.WebUtility.HtmlEncode(recipientName ?? "")}</strong>, se terminó tu período de prueba. Suscribite para no perder acceso a tu información y reservas.";

            var body = BaseLayout(
                headline: headline,
                leadHtml: lead,
                bodyHtml: $@"
<table role=""presentation"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
  <tr>
    <td align=""center"" style=""padding: 8px 0 24px;"">
      <a href=""{upgradeUrl}"" style=""display: inline-block; background: linear-gradient(135deg, #1565c0, #1e88e5); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 50px;"">
        Activar suscripción
      </a>
    </td>
  </tr>
</table>
<p style=""margin: 0; font-size: 13px; color: #888; line-height: 1.5;"">
  Si ya te suscribiste, podés ignorar este aviso.
</p>"
            );

            await SendAndLogAsync(toEmail, subject, body, templateKey, tenantId);
        }

        public async Task SendTestEmailAsync(string toEmail)
        {
            var subject = "Email de prueba — TurnosPro";
            var body = BaseLayout(
                headline: "Email de prueba",
                leadHtml: "Este email confirma que la configuración SMTP de la plataforma está funcionando correctamente.",
                bodyHtml: $@"
<p style=""margin: 0 0 16px; font-size: 14px; color: #555; line-height: 1.6;"">
  Generado el {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC desde el panel de super admin.
</p>"
            );
            await SendAndLogAsync(toEmail, subject, body, "test", null, throwOnError: true);
        }

        // ====================================================================
        // Shared layout for the new lifecycle templates
        // ====================================================================

        private static string BaseLayout(string headline, string leadHtml, string bodyHtml)
        {
            return $@"
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #f0f4f8; padding: 40px 0;"">
  <tr>
    <td align=""center"">
      <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"">
        <tr>
          <td style=""background: linear-gradient(135deg, #1565c0, #1e88e5, #42a5f5); padding: 36px 40px 28px; text-align: center;"">
            <span style=""font-size: 24px; color: #ffffff; font-weight: 800; letter-spacing: -0.5px;"">TurnosPro</span>
          </td>
        </tr>
        <tr>
          <td style=""padding: 36px 40px 16px;"">
            <h1 style=""margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e;"">{headline}</h1>
            <p style=""margin: 0 0 24px; font-size: 15px; color: #555; line-height: 1.6;"">{leadHtml}</p>
            {bodyHtml}
          </td>
        </tr>
        <tr>
          <td style=""padding: 20px 40px 28px; text-align: center; border-top: 1px solid #eef2f6;"">
            <p style=""margin: 0 0 4px; font-size: 12px; color: #aaa;"">© {DateTime.UtcNow.Year} TurnosPro — turnos-pro.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>";
        }
    }
}
