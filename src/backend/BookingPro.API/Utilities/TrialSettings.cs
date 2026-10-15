using Microsoft.Extensions.Configuration;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Reglas de la prueba gratis que se cambian por configuración, sin tocar código.
    ///
    /// Trial:RequireCard (default false): con true, la prueba queda detrás de dejar la tarjeta en
    /// Mercado Pago (alta → /empezar, SubscriptionMiddleware devuelve 402 CARD_REQUIRED y el panel
    /// rebota a /empezar). Con false, la cuenta nueva entra directo al onboarding y al panel con la
    /// prueba activa; dejar la tarjeta / pagar sigue disponible, pero es opcional hasta que vence.
    /// En DigitalOcean se pisa con la variable de entorno Trial__RequireCard.
    /// </summary>
    public static class TrialSettings
    {
        public const string RequireCardKey = "Trial:RequireCard";

        public static bool RequireCard(IConfiguration configuration) =>
            configuration.GetValue(RequireCardKey, false);
    }
}
