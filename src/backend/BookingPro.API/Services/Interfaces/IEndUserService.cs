using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Service for managing end users and their memberships (B2C)
    /// </summary>
    public interface IEndUserService
    {
        /// <summary>
        /// Registers a new end user and starts their 7-day demo
        /// </summary>
        Task<ServiceResult<EndUserResponseDto>> RegisterEndUserAsync(RegisterEndUserDto dto);
        
        /// <summary>
        /// Gets end user status and access information
        /// </summary>
        Task<ServiceResult<EndUserStatusDto>> GetEndUserStatusAsync(string email);
        
        /// <summary>
        /// Creates subscription payment for end user after demo period
        /// </summary>
        Task<ServiceResult<EndUserSubscriptionResponseDto>> CreateEndUserSubscriptionAsync(CreateEndUserSubscriptionDto dto);
        
        /// <summary>
        /// Creates renewal payment link for existing end user
        /// </summary>
        Task<ServiceResult<RenewalPaymentResponseDto>> CreateRenewalPaymentAsync(CreateRenewalPaymentDto dto);
        
        /// <summary>
        /// Processes payment webhook for end user payments
        /// </summary>
        Task<ServiceResult<bool>> ProcessEndUserPaymentWebhookAsync(string tenantId, string paymentId);
        
        /// <summary>
        /// Updates end user status based on business logic
        /// </summary>
        Task<ServiceResult<bool>> UpdateEndUserStatusAsync(Guid endUserId, string newStatus);
        
        /// <summary>
        /// Gets all end users for a tenant with pagination
        /// </summary>
        Task<ServiceResult<List<EndUserResponseDto>>> GetTenantEndUsersAsync(int page = 1, int pageSize = 50);
        
        /// <summary>
        /// Checks if end user has active access (demo or paid)
        /// </summary>
        Task<ServiceResult<bool>> HasActiveAccessAsync(string email);
        
        /// <summary>
        /// Gets end users that need renewal reminders
        /// </summary>
        Task<ServiceResult<List<EndUserResponseDto>>> GetUsersNeedingRenewalRemindersAsync(int daysBeforeExpiry = 3);
        
        /// <summary>
        /// Gets end users whose demo period is ending today
        /// </summary>
        Task<ServiceResult<List<EndUserResponseDto>>> GetDemoExpiringTodayAsync();
        
        /// <summary>
        /// Gets end users whose membership expired and need recovery emails
        /// </summary>
        Task<ServiceResult<List<EndUserResponseDto>>> GetUsersNeedingRecoveryEmailsAsync();
    }
}