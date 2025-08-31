using System.Text;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class EmailAutomationService : IEmailAutomationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<EmailAutomationService> _logger;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public EmailAutomationService(
            ApplicationDbContext context,
            ILogger<EmailAutomationService> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
        }

        public async Task<ServiceResult<bool>> SendWelcomeEmailAsync(EndUser endUser)
        {
            try
            {
                if (endUser.WelcomeEmailSentAt.HasValue)
                {
                    return ServiceResult<bool>.Ok(true, "Email already sent");
                }

                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var template = GetEmailTemplate("welcome", endUser, tenant);
                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.WelcomeEmailSentAt = DateTime.UtcNow;
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Welcome email sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending welcome email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<bool>> SendDay3EmailAsync(EndUser endUser)
        {
            try
            {
                if (endUser.Day3EmailSentAt.HasValue)
                {
                    return ServiceResult<bool>.Ok(true, "Email already sent");
                }

                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var template = GetEmailTemplate("day3", endUser, tenant);
                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.Day3EmailSentAt = DateTime.UtcNow;
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Day 3 email sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending day 3 email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<bool>> SendDay5EmailAsync(EndUser endUser)
        {
            try
            {
                if (endUser.Day5EmailSentAt.HasValue)
                {
                    return ServiceResult<bool>.Ok(true, "Email already sent");
                }

                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var daysRemaining = endUser.DemoEndsAt.HasValue ? 
                    Math.Max(0, (int)(endUser.DemoEndsAt.Value - DateTime.UtcNow).TotalDays) : 0;

                var template = GetEmailTemplate("day5", endUser, tenant, new Dictionary<string, string>
                {
                    {"DaysRemaining", daysRemaining.ToString()}
                });

                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.Day5EmailSentAt = DateTime.UtcNow;
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Day 5 email sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending day 5 email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<bool>> SendDay7EmailAsync(EndUser endUser)
        {
            try
            {
                if (endUser.Day7EmailSentAt.HasValue)
                {
                    return ServiceResult<bool>.Ok(true, "Email already sent");
                }

                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                // Get available plans for this tenant
                var plans = await _context.TenantPlans
                    .Where(p => p.TenantId == endUser.TenantId && p.IsActive)
                    .OrderBy(p => p.DisplayOrder)
                    .ToListAsync();

                var planLinks = new StringBuilder();
                foreach (var plan in plans)
                {
                    var subscribeUrl = $"{_configuration["FrontendUrl"]}/subscribe?plan={plan.Id}&email={endUser.Email}";
                    planLinks.AppendLine($"<a href='{subscribeUrl}' style='display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>{plan.Name} - ${plan.Price}</a>");
                }

                var template = GetEmailTemplate("day7", endUser, tenant, new Dictionary<string, string>
                {
                    {"PlanLinks", planLinks.ToString()}
                });

                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.Day7EmailSentAt = DateTime.UtcNow;
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Day 7 conversion email sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending day 7 email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<bool>> SendRenewalReminderEmailAsync(EndUser endUser, string renewalPaymentLink)
        {
            try
            {
                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var daysRemaining = endUser.MembershipEndsAt.HasValue ? 
                    Math.Max(0, (int)(endUser.MembershipEndsAt.Value - DateTime.UtcNow).TotalDays) : 0;

                var template = GetEmailTemplate("renewal_reminder", endUser, tenant, new Dictionary<string, string>
                {
                    {"DaysRemaining", daysRemaining.ToString()},
                    {"RenewalLink", renewalPaymentLink}
                });

                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.LastRenewalReminderSentAt = DateTime.UtcNow;
                    endUser.RenewalReminderCount++;
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Renewal reminder email sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending renewal reminder email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<bool>> SendFinalRenewalWarningAsync(EndUser endUser, string renewalPaymentLink)
        {
            try
            {
                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var template = GetEmailTemplate("final_warning", endUser, tenant, new Dictionary<string, string>
                {
                    {"RenewalLink", renewalPaymentLink}
                });

                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.LastRenewalReminderSentAt = DateTime.UtcNow;
                    endUser.RenewalReminderCount++;
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Final warning email sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending final warning email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<bool>> SendExpirationNoticeAsync(EndUser endUser)
        {
            try
            {
                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var template = GetEmailTemplate("expired", endUser, tenant);
                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Expiration notice sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending expiration notice");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<bool>> SendRecoveryEmailAsync(EndUser endUser, string reactivationLink)
        {
            try
            {
                var tenant = await _context.Tenants.FindAsync(endUser.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<bool>.Fail("Tenant not found");
                }

                var template = GetEmailTemplate("recovery", endUser, tenant, new Dictionary<string, string>
                {
                    {"ReactivationLink", reactivationLink}
                });

                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);

                if (emailSent)
                {
                    endUser.RecoveryEmailSentAt = DateTime.UtcNow;
                    endUser.RecoveryEmailCount++;
                    endUser.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Recovery email sent to {Email} for tenant {TenantId}", 
                        endUser.Email, endUser.TenantId);
                }

                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending recovery email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<int>> ProcessScheduledEmailsAsync()
        {
            try
            {
                var today = DateTime.UtcNow.Date;

                // Process demo day emails
                var demoCount = await ProcessDemoEmailsAsync(today);

                // Process renewal reminders
                var renewalCount = await ProcessRenewalRemindersAsync(today);

                // Process recovery emails
                var recoveryCount = await ProcessRecoveryEmailsAsync(today);

                var processedCount = demoCount + renewalCount + recoveryCount;
                _logger.LogInformation("Processed {Count} scheduled emails", processedCount);
                return ServiceResult<int>.Ok(processedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing scheduled emails");
                return ServiceResult<int>.Fail("Error processing emails");
            }
        }

        public async Task<ServiceResult<bool>> SendCustomEmailAsync(Guid endUserId, EmailTemplateDto template)
        {
            try
            {
                var endUser = await _context.EndUsers.FindAsync(endUserId);
                if (endUser == null)
                {
                    return ServiceResult<bool>.Fail("User not found");
                }

                var emailSent = await SendEmailAsync(endUser.Email, template.Subject, template.Body);
                return ServiceResult<bool>.Ok(emailSent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending custom email");
                return ServiceResult<bool>.Fail("Error sending email");
            }
        }

        public async Task<ServiceResult<EmailStatsDto>> GetEmailStatsAsync(Guid tenantId, DateTime? from = null, DateTime? to = null)
        {
            try
            {
                from ??= DateTime.UtcNow.AddDays(-30);
                to ??= DateTime.UtcNow;

                var users = await _context.EndUsers
                    .Where(u => u.TenantId == tenantId && 
                               u.CreatedAt >= from && 
                               u.CreatedAt <= to)
                    .ToListAsync();

                var stats = new EmailStatsDto
                {
                    TotalEmailsSent = users.Count(u => u.WelcomeEmailSentAt.HasValue) +
                                     users.Count(u => u.Day3EmailSentAt.HasValue) +
                                     users.Count(u => u.Day5EmailSentAt.HasValue) +
                                     users.Count(u => u.Day7EmailSentAt.HasValue) +
                                     users.Sum(u => u.RenewalReminderCount) +
                                     users.Sum(u => u.RecoveryEmailCount),
                    
                    WelcomeEmails = users.Count(u => u.WelcomeEmailSentAt.HasValue),
                    EngagementEmails = users.Count(u => u.Day3EmailSentAt.HasValue || u.Day5EmailSentAt.HasValue),
                    ConversionEmails = users.Count(u => u.Day7EmailSentAt.HasValue),
                    RenewalReminders = users.Sum(u => u.RenewalReminderCount),
                    RecoveryEmails = users.Sum(u => u.RecoveryEmailCount)
                };

                // Calculate conversion rate (demo to paid)
                var demoUsers = users.Count(u => u.Status != "VISITANTE");
                var paidUsers = users.Count(u => u.Status == "PAGÓ_ACTIVO" || u.Status == "POR_VENCER");
                stats.ConversionRate = demoUsers > 0 ? (double)paidUsers / demoUsers * 100 : 0;

                return ServiceResult<EmailStatsDto>.Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting email stats");
                return ServiceResult<EmailStatsDto>.Fail("Error retrieving stats");
            }
        }

        #region Private Methods

        private async Task<int> ProcessDemoEmailsAsync(DateTime today)
        {
            // Day 3 emails
            var day3Users = await _context.EndUsers
                .Where(u => u.Status == "DEMO_ACTIVO" &&
                           u.DemoStartedAt.HasValue &&
                           u.DemoStartedAt.Value.Date.AddDays(3) == today &&
                           !u.Day3EmailSentAt.HasValue)
                .ToListAsync();

            var processedCount = 0;
            
            foreach (var user in day3Users)
            {
                await SendDay3EmailAsync(user);
                processedCount++;
            }

            // Day 5 emails
            var day5Users = await _context.EndUsers
                .Where(u => u.Status == "DEMO_ACTIVO" &&
                           u.DemoStartedAt.HasValue &&
                           u.DemoStartedAt.Value.Date.AddDays(5) == today &&
                           !u.Day5EmailSentAt.HasValue)
                .ToListAsync();

            foreach (var user in day5Users)
            {
                await SendDay5EmailAsync(user);
                processedCount++;
            }

            // Day 7 emails
            var day7Users = await _context.EndUsers
                .Where(u => u.Status == "DEMO_ACTIVO" &&
                           u.DemoStartedAt.HasValue &&
                           u.DemoStartedAt.Value.Date.AddDays(7) == today &&
                           !u.Day7EmailSentAt.HasValue)
                .ToListAsync();

            foreach (var user in day7Users)
            {
                await SendDay7EmailAsync(user);
                processedCount++;
            }
            
            return processedCount;
        }

        private async Task<int> ProcessRenewalRemindersAsync(DateTime today)
        {
            // 3-day reminders
            var reminderUsers = await _context.EndUsers
                .Where(u => u.Status == "PAGÓ_ACTIVO" &&
                           u.MembershipEndsAt.HasValue &&
                           u.MembershipEndsAt.Value.Date.AddDays(-3) == today &&
                           (u.LastRenewalReminderSentAt == null ||
                            u.LastRenewalReminderSentAt.Value.Date != today))
                .ToListAsync();

            var processedCount = 0;
            
            foreach (var user in reminderUsers)
            {
                // Create renewal link
                var renewalLink = $"{_configuration["FrontendUrl"]}/renew?user={user.Id}";
                await SendRenewalReminderEmailAsync(user, renewalLink);
                processedCount++;
            }

            // 1-day final warnings
            var warningUsers = await _context.EndUsers
                .Where(u => u.Status == "PAGÓ_ACTIVO" &&
                           u.MembershipEndsAt.HasValue &&
                           u.MembershipEndsAt.Value.Date.AddDays(-1) == today)
                .ToListAsync();

            foreach (var user in warningUsers)
            {
                var renewalLink = $"{_configuration["FrontendUrl"]}/renew?user={user.Id}";
                await SendFinalRenewalWarningAsync(user, renewalLink);
                processedCount++;
            }
            
            return processedCount;
        }

        private async Task<int> ProcessRecoveryEmailsAsync(DateTime today)
        {
            var recoveryUsers = await _context.EndUsers
                .Where(u => (u.Status == "VENCIDO" || u.Status == "DEMO_EXPIRADO") &&
                           u.RecoveryEmailCount < 3 &&
                           (u.RecoveryEmailSentAt == null ||
                            u.RecoveryEmailSentAt.Value.Date.AddDays(3) <= today))
                .ToListAsync();

            var processedCount = 0;
            
            foreach (var user in recoveryUsers)
            {
                var reactivationLink = $"{_configuration["FrontendUrl"]}/reactivate?user={user.Id}";
                await SendRecoveryEmailAsync(user, reactivationLink);
                processedCount++;
            }
            
            return processedCount;
        }

        private EmailTemplateDto GetEmailTemplate(string templateType, EndUser endUser, Tenant tenant, Dictionary<string, string>? extraVars = null)
        {
            var variables = new Dictionary<string, string>
            {
                {"FirstName", endUser.FirstName},
                {"BusinessName", tenant.BusinessName},
                {"SupportEmail", tenant.OwnerEmail},
                {"LoginUrl", $"{_configuration["FrontendUrl"]}/login"}
            };

            if (extraVars != null)
            {
                foreach (var kvp in extraVars)
                {
                    variables[kvp.Key] = kvp.Value;
                }
            }

            return templateType.ToLower() switch
            {
                "welcome" => GetWelcomeTemplate(variables),
                "day3" => GetDay3Template(variables),
                "day5" => GetDay5Template(variables),
                "day7" => GetDay7Template(variables),
                "renewal_reminder" => GetRenewalReminderTemplate(variables),
                "final_warning" => GetFinalWarningTemplate(variables),
                "expired" => GetExpiredTemplate(variables),
                "recovery" => GetRecoveryTemplate(variables),
                _ => new EmailTemplateDto { Template = templateType, Subject = "Notification", Body = "Default notification" }
            };
        }

        private EmailTemplateDto GetWelcomeTemplate(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "welcome",
                Subject = $"¡Bienvenido a {vars["BusinessName"]}! Tu demo de 7 días ha comenzado",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p>¡Bienvenido a {vars["BusinessName"]}! Estamos emocionados de tenerte con nosotros.</p>
                <p>Tu período de demo de <strong>7 días completamente gratis</strong> ha comenzado. Durante este tiempo, tendrás acceso completo a todas las funciones.</p>
                <p><a href='{vars["LoginUrl"]}' style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Comenzar ahora</a></p>
                <p>Si tienes alguna pregunta, no dudes en contactarnos a {vars["SupportEmail"]}</p>
                <p>¡Que disfrutes tu experiencia!</p>"
            };
        }

        private EmailTemplateDto GetDay3Template(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "day3",
                Subject = $"¿Cómo va tu experiencia con {vars["BusinessName"]}?",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p>Han pasado 3 días desde que comenzaste tu demo. ¿Cómo va todo?</p>
                <p>Queremos asegurarnos de que estés aprovechando al máximo todas las funciones disponibles.</p>
                <p><a href='{vars["LoginUrl"]}' style='background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Continuar explorando</a></p>
                <p>¿Necesitas ayuda? Responde a este email y te ayudaremos.</p>"
            };
        }

        private EmailTemplateDto GetDay5Template(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "day5",
                Subject = $"⏰ Solo te quedan {vars.GetValueOrDefault("DaysRemaining", "2")} días de demo",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p><strong>Tu demo expira pronto</strong> - solo te quedan {vars.GetValueOrDefault("DaysRemaining", "2")} días para disfrutar del acceso completo.</p>
                <p>No pierdas todo tu progreso. Asegura tu acceso continuo ahora.</p>
                <p><a href='{vars["LoginUrl"]}' style='background: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Ver planes de suscripción</a></p>
                <p>¡No dejes que expire tu acceso!</p>"
            };
        }

        private EmailTemplateDto GetDay7Template(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "day7",
                Subject = $"🚨 Tu demo expira HOY - Continúa con {vars["BusinessName"]}",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p><strong>Tu período de demo expira hoy.</strong></p>
                <p>Para continuar disfrutando de {vars["BusinessName"]}, elige el plan que mejor se adapte a tus necesidades:</p>
                <div style='margin: 20px 0;'>
                {vars.GetValueOrDefault("PlanLinks", "")}
                </div>
                <p>¡No pierdas el acceso a todas las funciones que has estado usando!</p>
                <p><em>Este es tu último recordatorio antes de que expire tu demo.</em></p>"
            };
        }

        private EmailTemplateDto GetRenewalReminderTemplate(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "renewal_reminder",
                Subject = $"Tu suscripción a {vars["BusinessName"]} vence en {vars.GetValueOrDefault("DaysRemaining", "3")} días",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p>Tu suscripción a {vars["BusinessName"]} vence en {vars.GetValueOrDefault("DaysRemaining", "3")} días.</p>
                <p>Para mantener tu acceso sin interrupciones, renueva tu suscripción ahora:</p>
                <p><a href='{vars.GetValueOrDefault("RenewalLink", "")}' style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Renovar suscripción</a></p>
                <p>¡Gracias por confiar en nosotros!</p>"
            };
        }

        private EmailTemplateDto GetFinalWarningTemplate(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "final_warning",
                Subject = $"🚨 ÚLTIMO DÍA: Tu suscripción a {vars["BusinessName"]} expira mañana",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p><strong>ÚLTIMO AVISO:</strong> Tu suscripción expira mañana.</p>
                <p>Para evitar la interrupción del servicio, renueva ahora:</p>
                <p><a href='{vars.GetValueOrDefault("RenewalLink", "")}' style='background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>RENOVAR AHORA</a></p>
                <p>Si no renuevas, perderás el acceso mañana.</p>"
            };
        }

        private EmailTemplateDto GetExpiredTemplate(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "expired",
                Subject = $"Tu acceso a {vars["BusinessName"]} ha expirado",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p>Tu suscripción a {vars["BusinessName"]} ha expirado.</p>
                <p>Tus datos están seguros y guardados durante 30 días. Puedes reactivar tu acceso en cualquier momento.</p>
                <p><a href='{vars["LoginUrl"]}' style='background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Reactivar suscripción</a></p>
                <p>¡Te esperamos de vuelta!</p>"
            };
        }

        private EmailTemplateDto GetRecoveryTemplate(Dictionary<string, string> vars)
        {
            return new EmailTemplateDto
            {
                Template = "recovery",
                Subject = $"¿Nos extrañas? Regresa a {vars["BusinessName"]} con descuento",
                Body = $@"
                <h1>¡Hola {vars["FirstName"]}!</h1>
                <p>Te extrañamos en {vars["BusinessName"]}. Tus datos siguen seguros y listos para cuando regreses.</p>
                <p><strong>Oferta especial:</strong> Regresa hoy y obtén un 20% de descuento en tu primera renovación.</p>
                <p><a href='{vars.GetValueOrDefault("ReactivationLink", "")}' style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Reactivar con descuento</a></p>
                <p>Esta oferta es por tiempo limitado.</p>"
            };
        }

        private async Task<bool> SendEmailAsync(string to, string subject, string body)
        {
            try
            {
                // TODO: Implement actual email sending (SMTP, SendGrid, etc.)
                // For now, just log the email
                _logger.LogInformation("Email would be sent to {Email} with subject: {Subject}", to, subject);
                
                // Simulate successful sending
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending email to {Email}", to);
                return false;
            }
        }

        #endregion
    }
}