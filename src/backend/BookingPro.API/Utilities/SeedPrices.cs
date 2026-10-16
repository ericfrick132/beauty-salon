namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Precios de los datos de ejemplo que se cargan al crear un negocio (servicios del template, etc.).
    /// Los seeders están escritos en pesos argentinos; para el resto de los países se convierten a la
    /// moneda del negocio al momento de sembrar y se redondean a montos "lindos".
    /// Solo se usa al sembrar: si el negocio cambia de país después, sus datos no se tocan.
    /// </summary>
    public static class SeedPrices
    {
        // Unidades de cada moneda por 1 USD.
        private const decimal ArsPerUsd = 1300m;

        private static readonly IReadOnlyDictionary<string, decimal> PerUsd = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
        {
            ["USD"] = 1m,
            ["UYU"] = 40m,
            ["MXN"] = 17.5m,
            ["EUR"] = 0.92m,
        };

        /// <summary>
        /// Convierte un precio de ejemplo en ARS a la moneda dada. ARS (o moneda desconocida) queda igual.
        /// </summary>
        public static decimal FromArs(decimal ars, string? currency)
        {
            if (ars <= 0 || string.IsNullOrWhiteSpace(currency)) return ars;
            var code = currency.Trim().ToUpperInvariant();
            if (code == "ARS" || !PerUsd.TryGetValue(code, out var rate)) return ars;

            var local = ars / ArsPerUsd * rate;
            return code switch
            {
                "UYU" or "MXN" => RoundTo(local, local >= 1000m ? 100m : 50m),
                _ => local >= 20m ? RoundTo(local, 5m) : RoundTo(local, 1m),
            };
        }

        private static decimal RoundTo(decimal value, decimal step)
        {
            var rounded = Math.Round(value / step, MidpointRounding.AwayFromZero) * step;
            return rounded < step ? step : rounded;
        }
    }
}
