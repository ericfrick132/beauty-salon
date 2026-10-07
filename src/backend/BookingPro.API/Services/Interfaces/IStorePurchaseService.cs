using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Compras in-app de add-ons y créditos de mensajería (App Store hoy, Google Play después).
    /// Verifica la transacción con la tienda, la registra una sola vez y acredita lo mismo que el
    /// cobro por Mercado Pago (FeatureAddonService.ActivateAsync / CreditMessageWalletAsync).
    /// </summary>
    public interface IStorePurchaseService
    {
        Task<ServiceResult<StorePurchaseResultDto>> ProcessPurchaseAsync(Guid tenantId, StorePurchaseRequestDto dto);

        /// <summary>
        /// REFUND / REVOKE de App Store Server Notifications para una compra de add-on o créditos.
        /// Devuelve true si la transacción era una compra in-app registrada (y la revirtió).
        /// </summary>
        Task<bool> ProcessAppleRefundAsync(string? transactionId);
    }
}
