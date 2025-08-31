using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Common;

namespace BookingPro.API.Services.Interfaces
{
    public interface IMercadoPagoService
    {
        // Payment preference methods
        Task<ServiceResult<CreatePaymentResponseDto>> CreatePaymentPreferenceAsync(CreatePaymentDto dto);
        Task<ServiceResult<PaymentPreferenceResponseDto>> CreateDepositPreferenceAsync(
            Guid bookingId, 
            decimal amount, 
            string title, 
            string description);
        
        // OAuth methods
        Task<ServiceResult<string>> GetAuthorizationUrlAsync(string tenantId);
        Task<ServiceResult<bool>> ExchangeCodeForTokenAsync(Guid tenantId, string code);
        Task<ServiceResult<bool>> ProcessOAuthCallbackAsync(string code, string state);
        Task<ServiceResult<MercadoPagoConfiguration>> GetConfigurationAsync(string tenantId);
        Task<ServiceResult<bool>> UpdateConfigurationAsync(string tenantId, UpdateMercadoPagoConfigDto dto);
        Task<ServiceResult<bool>> DisconnectAsync(string tenantId);
        Task<ServiceResult<bool>> RefreshTokenAsync(string tenantId);
        Task<ServiceResult<PaymentLinkResponseDto>> CreatePaymentLinkAsync(string tenantId, CreatePaymentLinkDto dto);
        Task<ServiceResult<MercadoPagoConfigurationDto>> GetMercadoPagoConfigurationAsync(Guid tenantId);
        
        // Webhook processing
        Task<ServiceResult<bool>> ProcessWebhookNotificationAsync(string tenantId, Dictionary<string, object> data);
        
        // Legacy configuration methods (for backward compatibility)
        Task<ServiceResult<PaymentConfiguration>> GetPaymentConfigurationAsync();
        Task<ServiceResult<bool>> UpdatePaymentConfigurationAsync(UpdatePaymentConfigurationDto dto);
        
        // Deposit calculation
        Task<ServiceResult<DepositCalculationResultDto>> CalculateDepositAsync(
            Guid serviceId,
            Guid? customerId,
            DateTime bookingDate);
    }
}