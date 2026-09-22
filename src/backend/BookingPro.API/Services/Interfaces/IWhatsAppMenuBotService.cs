using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Asistente de WhatsApp por menú (add-on FeatureCodes.MenuBot): los clientes reservan, ven y
    /// cancelan turnos y consultan servicios respondiendo con números, sin IA ni tokens.
    /// </summary>
    public interface IWhatsAppMenuBotService
    {
        /// <summary>Add-on vigente y switch del negocio prendido.</summary>
        Task<bool> IsActiveAsync(Guid tenantId);

        Task<MenuBotSettings> GetOrCreateSettingsAsync(Guid tenantId);

        /// <summary>
        /// Procesa un mensaje entrante y manda la respuesta por la línea del negocio.
        /// Devuelve el texto respondido, o null si no correspondía contestar (bot pausado, etc.).
        /// </summary>
        Task<string?> HandleIncomingMessageAsync(Guid tenantId, string phone, string? contactName, string text, CancellationToken ct = default);
    }
}
