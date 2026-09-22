using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;

namespace BookingPro.API.Services.Interfaces
{
    public interface IWhatsAppConnectionService
    {
        Task<ServiceResult<WhatsAppConnectResultDto>> ConnectAsync();
        Task<ServiceResult<WhatsAppStatusDto>> GetStatusAsync();
        Task<ServiceResult<string>> RefreshQrAsync();
        Task<ServiceResult<bool>> DisconnectAsync();
        /// <summary>
        /// Manda por la línea del negocio pasando por el freno por tenant (<see cref="WhatsAppSendGate"/>).
        /// Un envío retenido devuelve Success=false con Reason="throttled" o "quiet_hours": el
        /// caller no debe contarlo como fallo definitivo, se reintenta en el próximo tick.
        /// </summary>
        Task<ServiceResult<string>> SendTextAsync(Guid tenantId, string phone, string text,
            WaSendKind kind = WaSendKind.Outbound, string section = "generic", bool respectQuietHours = false);
        Task<TenantWhatsAppConnection?> GetConnectionByTenantIdAsync(Guid tenantId);
        Task EnsureInboundWebhookAsync(Guid tenantId);
    }
}
