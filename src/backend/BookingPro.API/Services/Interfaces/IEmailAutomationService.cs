using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Service for automated email campaigns based on user lifecycle
    /// </summary>
    public interface IEmailAutomationService
    {
        /// <summary>
        /// Send welcome email to new demo users
        /// </summary>
        Task<ServiceResult<bool>> SendWelcomeEmailAsync(EndUser endUser);
        
        /// <summary>
        /// Send demo day 3 engagement email
        /// </summary>
        Task<ServiceResult<bool>> SendDay3EmailAsync(EndUser endUser);
        
        /// <summary>
        /// Send demo day 5 urgency email
        /// </summary>
        Task<ServiceResult<bool>> SendDay5EmailAsync(EndUser endUser);
        
        /// <summary>
        /// Send demo day 7 conversion email
        /// </summary>
        Task<ServiceResult<bool>> SendDay7EmailAsync(EndUser endUser);
        
        /// <summary>
        /// Send renewal reminder email (3 days before expiry)
        /// </summary>
        Task<ServiceResult<bool>> SendRenewalReminderEmailAsync(EndUser endUser, string renewalPaymentLink);
        
        /// <summary>
        /// Send final renewal warning (1 day before expiry)
        /// </summary>
        Task<ServiceResult<bool>> SendFinalRenewalWarningAsync(EndUser endUser, string renewalPaymentLink);
        
        /// <summary>
        /// Send expiration notice email
        /// </summary>
        Task<ServiceResult<bool>> SendExpirationNoticeAsync(EndUser endUser);
        
        /// <summary>
        /// Send recovery email to expired users
        /// </summary>
        Task<ServiceResult<bool>> SendRecoveryEmailAsync(EndUser endUser, string reactivationLink);
        
        /// <summary>
        /// Process all scheduled emails for today
        /// </summary>
        Task<ServiceResult<int>> ProcessScheduledEmailsAsync();
        
        /// <summary>
        /// Send custom email to end user
        /// </summary>
        Task<ServiceResult<bool>> SendCustomEmailAsync(Guid endUserId, EmailTemplateDto template);
        
        /// <summary>
        /// Get email statistics for a tenant
        /// </summary>
        Task<ServiceResult<EmailStatsDto>> GetEmailStatsAsync(Guid tenantId, DateTime? from = null, DateTime? to = null);
    }

    /// <summary>
    /// Email statistics DTO
    /// </summary>
    public class EmailStatsDto
    {
        public int TotalEmailsSent { get; set; }
        public int WelcomeEmails { get; set; }
        public int EngagementEmails { get; set; }
        public int ConversionEmails { get; set; }
        public int RenewalReminders { get; set; }
        public int RecoveryEmails { get; set; }
        public double OpenRate { get; set; }
        public double ClickRate { get; set; }
        public double ConversionRate { get; set; }
    }
}