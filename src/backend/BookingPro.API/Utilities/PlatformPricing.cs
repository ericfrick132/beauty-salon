namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Precios de la plataforma fuera de Argentina: equivalente en dólares del precio en ARS (UY se cobra en
    /// USD, MX en MXN, ES en EUR). Solo se usa para completar los precios que falten al arrancar; después
    /// los edita el super admin y no se recalculan.
    /// </summary>
    public static class PlatformPricing
    {
        /// <summary>Tipo de cambio de referencia (octubre 2026): ARS 1300 = USD 1.</summary>
        public const decimal ArsPerUsd = 1300m;
        public const decimal MxnPerUsd = 17.5m;
        public const decimal EurPerUsd = 0.92m;

        /// <summary>Monedas en las que cobra Stripe la suscripción (las de CountryProfile.PlatformCurrency fuera de AR).</summary>
        public static readonly string[] StripeCurrencies = { "USD", "MXN", "EUR" };

        /// <summary>
        /// Convierte un precio en ARS a la moneda pedida y lo redondea a un número "lindo": USD y EUR al entero
        /// más cercano, MXN a la decena más cercana. Nunca menos de 1 (USD/EUR) o 10 (MXN).
        /// </summary>
        public static decimal FromArs(decimal ars, string currency)
        {
            var usd = ars / ArsPerUsd;
            return currency.ToUpperInvariant() switch
            {
                "USD" => Friendly(usd, 1m),
                "EUR" => Friendly(usd * EurPerUsd, 1m),
                "MXN" => Friendly(usd * MxnPerUsd, 10m),
                _ => throw new ArgumentOutOfRangeException(nameof(currency), currency, "Moneda sin precio de plataforma"),
            };
        }

        private static decimal Friendly(decimal value, decimal step) =>
            Math.Max(step, Math.Round(value / step, MidpointRounding.AwayFromZero) * step);

        /// <summary>Monto en la unidad mínima de Stripe (centavos). USD, MXN y EUR tienen 2 decimales.</summary>
        public static long ToStripeAmount(decimal amount) => (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);

        public static decimal FromStripeAmount(long? minor) => (minor ?? 0) / 100m;
    }
}
