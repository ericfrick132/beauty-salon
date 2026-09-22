namespace BookingPro.API.Models.Constants
{
    public static class FeatureCodes
    {
        public const string ConfirmationBot = "confirmation_bot";
        public const string AiAgent = "ai_agent";
        /// <summary>Detección de transferencias: las señas que llegan a Mercado Pago se acreditan solas en el turno.</summary>
        public const string TransferDetection = "transfer_detection";
        /// <summary>Asistente de WhatsApp por menú: los clientes reservan, consultan y cancelan turnos solos, sin IA.</summary>
        public const string MenuBot = "menu_bot";
    }
}
