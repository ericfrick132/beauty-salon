using System.Collections.Concurrent;
using System.Globalization;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Montos para mensajes al cliente (WhatsApp, mails, push) según la moneda y la cultura del negocio.
    /// ARS sale exactamente como antes: "$" + miles con punto y sin decimales ("$15.000").
    /// </summary>
    public static class MoneyFormat
    {
        private static readonly ConcurrentDictionary<string, CultureInfo> Cultures = new();

        public static string Format(decimal amount, Tenant? tenant)
        {
            var profile = CountryProfile.For(tenant);
            return Format(amount, CountryProfile.CurrencyFor(tenant), profile.Culture);
        }

        public static string Format(decimal amount, string? currency, string? culture = null)
        {
            var code = string.IsNullOrWhiteSpace(currency) ? "ARS" : currency.Trim().ToUpperInvariant();
            var ci = Culture(culture ?? CultureForCurrency(code));
            var whole = decimal.Truncate(amount) == amount;

            switch (code)
            {
                case "ARS":
                    return "$" + amount.ToString("N0", Culture("es-AR"));
                case "UYU":
                case "MXN":
                case "CLP":
                case "COP":
                    return "$" + amount.ToString(whole ? "N0" : "N2", ci);
                case "EUR":
                    // En España el símbolo va después: "1.500 €".
                    return amount.ToString(whole ? "N0" : "N2", ci) + " €";
                case "USD":
                    return "US$" + amount.ToString(whole ? "N0" : "N2", ci);
                case "BRL":
                    return "R$ " + amount.ToString(whole ? "N0" : "N2", ci);
                case "PEN":
                    return "S/ " + amount.ToString(whole ? "N0" : "N2", ci);
                default:
                    return code + " " + amount.ToString(whole ? "N0" : "N2", ci);
            }
        }

        /// <summary>Cultura del negocio (es-AR, es-UY, es-MX, es-ES) para fechas en mensajes.</summary>
        public static CultureInfo CultureFor(Tenant? tenant) => Culture(CountryProfile.For(tenant).Culture);

        private static string CultureForCurrency(string code) => code switch
        {
            "UYU" => "es-UY",
            "MXN" => "es-MX",
            "EUR" => "es-ES",
            _ => "es-AR",
        };

        private static CultureInfo Culture(string name) => Cultures.GetOrAdd(name, n =>
        {
            try { return new CultureInfo(n); }
            catch { return new CultureInfo("es-AR"); }
        });
    }
}
