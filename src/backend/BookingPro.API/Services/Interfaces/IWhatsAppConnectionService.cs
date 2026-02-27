using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    public interface IWhatsAppConnectionService
    {
        Task<ServiceResult<WhatsAppConnectResultDto>> ConnectAsync();
        Task<ServiceResult<WhatsAppStatusDto>> GetStatusAsync();
        Task<ServiceResult<string>> RefreshQrAsync();
        Task<ServiceResult<bool>> DisconnectAsync();
        Task<ServiceResult<string>> SendTextAsync(Guid tenantId, string phone, string text);
        Task<TenantWhatsAppConnection?> GetConnectionByTenantIdAsync(Guid tenantId);
    }
}
