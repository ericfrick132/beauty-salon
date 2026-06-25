using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    public interface ISubscriptionService
    {
        Task<ServiceResult<SubscriptionResponseDto>> CreateSubscriptionAsync(Guid tenantId, string planCode);
        Task<ServiceResult<SubscriptionResponseDto>> CreateTrialSubscriptionAsync(Guid tenantId);
        Task<ServiceResult<bool>> ProcessSubscriptionWebhookAsync(Dictionary<string, object> data);
        Task<ServiceResult<SubscriptionStatusDto>> GetSubscriptionStatusAsync(Guid tenantId);
        Task<ServiceResult<bool>> CancelSubscriptionAsync(Guid tenantId);
        Task<ServiceResult<List<SubscriptionPlanDto>>> GetAvailablePlansAsync();
        Task<ServiceResult<bool>> InitializePlansAsync();
        Task<ServiceResult<bool>> CheckAndUpdateTrialStatusAsync(Guid tenantId);
        Task<ServiceResult<string>> GeneratePaymentQRCodeAsync(Guid tenantId, string planCode);
        Task<ServiceResult<PaymentQRResultDto>> GeneratePaymentQRWithUrlAsync(Guid tenantId, string planCode);

        /// <summary>
        /// Verify an Apple StoreKit 2 purchase with the App Store Server API and
        /// activate the tenant's subscription accordingly.
        /// </summary>
        Task<ServiceResult<SubscriptionStatusDto>> ActivateAppleSubscriptionAsync(Guid tenantId, string transactionId);

        /// <summary>
        /// Process an App Store Server Notification V2 (renewals, expirations,
        /// refunds) and update the affected subscription.
        /// </summary>
        Task<ServiceResult<bool>> ProcessAppleNotificationAsync(string signedPayload);
    }
}