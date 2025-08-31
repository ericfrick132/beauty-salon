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
    }
}