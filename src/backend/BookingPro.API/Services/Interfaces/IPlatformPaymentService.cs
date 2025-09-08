using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Service for handling B2B payments from tenants to the platform
    /// </summary>
    public interface IPlatformPaymentService
    {
        /// <summary>
        /// Creates a payment link for a tenant to pay their platform subscription
        /// </summary>
        Task<ServiceResult<TenantSubscriptionPaymentResponseDto>> CreateTenantSubscriptionPaymentAsync(CreateTenantSubscriptionPaymentDto dto);
        
        /// <summary>
        /// Processes webhook notifications for platform payments
        /// </summary>
        Task<ServiceResult<bool>> ProcessPlatformPaymentWebhookAsync(string paymentId);
        
        /// <summary>
        /// Gets the platform MercadoPago configuration
        /// </summary>
        Task<ServiceResult<bool>> IsPlatformConfiguredAsync();
        
        /// <summary>
        /// Sets up or updates platform MercadoPago configuration
        /// </summary>
        Task<ServiceResult<bool>> ConfigurePlatformMercadoPagoAsync(string accessToken, string? refreshToken = null, bool isSandbox = true);
        
        /// <summary>
        /// Gets tenant subscription payment history
        /// </summary>
        Task<ServiceResult<List<TenantSubscriptionPaymentResponseDto>>> GetTenantPaymentHistoryAsync(Guid tenantId);
        
        /// <summary>
        /// Checks if tenant has active subscription period
        /// </summary>
        Task<ServiceResult<bool>> HasActiveSubscriptionAsync(Guid tenantId);
        
        /// <summary>
        /// Gets next payment due date for tenant
        /// </summary>
        Task<ServiceResult<DateTime?>> GetNextPaymentDueDateAsync(Guid tenantId);
        
        /// <summary>
        /// Creates renewal payment link for expired tenants
        /// </summary>
        Task<ServiceResult<TenantSubscriptionPaymentResponseDto>> CreateTenantRenewalPaymentAsync(Guid tenantId, string period);

        // Messaging packages
        Task<ServiceResult<PurchaseMessagePackageResponseDto>> CreateMessagePackagePurchaseAsync(Guid tenantId, Guid packageId);
    }
}
