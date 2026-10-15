using BookingPro.API.Models.Entities;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Datos por país de los negocios (moneda, zona horaria IANA, cultura, código telefónico,
    /// etiqueta del documento y features que solo existen en Argentina). Todo lo que no tiene país
    /// es Argentina: los negocios existentes siguen funcionando igual.
    /// </summary>
    public sealed record CountryProfile(
        string Code,
        string Name,
        string Currency,
        string TimeZoneId,
        string Culture,
        string DialCode,
        string DocumentLabel,
        string PhonePlaceholder,
        bool ArcaInvoicing,
        bool Chytapay,
        bool TransferDetection)
    {
        public const string DefaultCode = "AR";

        /// <summary>
        /// Cómo conecta el negocio su Mercado Pago para cobrar señas: "oauth" (app de la plataforma, solo
        /// Argentina), "credentials" (pega el Access Token de su propia cuenta MP local: Uruguay y México) o
        /// "none" (no hay Mercado Pago: España cobra con Stripe Connect).
        /// </summary>
        public string MercadoPagoConnect { get; init; } = MercadoPagoConnectModes.OAuth;

        /// <summary>Señas con Stripe Connect (cuenta Express del negocio). Hoy solo España.</summary>
        public bool StripeDeposits { get; init; }

        /// <summary>Con qué cobra la plataforma la suscripción: "mercadopago" (Argentina, ARS) o "stripe".</summary>
        public string PlatformBilling { get; init; } = PlatformBillingProviders.MercadoPago;

        /// <summary>Moneda de la suscripción a la plataforma (UY se cobra en USD).</summary>
        public string PlatformCurrency { get; init; } = "ARS";

        public static readonly CountryProfile Argentina = new(
            "AR", "Argentina", "ARS", "America/Argentina/Buenos_Aires", "es-AR", "54", "DNI",
            "11 2345 6789", ArcaInvoicing: true, Chytapay: true, TransferDetection: true);

        public static readonly CountryProfile Uruguay = new(
            "UY", "Uruguay", "UYU", "America/Montevideo", "es-UY", "598", "CI",
            "94 123 456", ArcaInvoicing: false, Chytapay: false, TransferDetection: false)
        {
            MercadoPagoConnect = MercadoPagoConnectModes.Credentials,
            PlatformBilling = PlatformBillingProviders.Stripe,
            PlatformCurrency = "USD",
        };

        public static readonly CountryProfile Mexico = new(
            "MX", "México", "MXN", "America/Mexico_City", "es-MX", "52", "CURP",
            "55 1234 5678", ArcaInvoicing: false, Chytapay: false, TransferDetection: false)
        {
            MercadoPagoConnect = MercadoPagoConnectModes.Credentials,
            PlatformBilling = PlatformBillingProviders.Stripe,
            PlatformCurrency = "MXN",
        };

        public static readonly CountryProfile Spain = new(
            "ES", "España", "EUR", "Europe/Madrid", "es-ES", "34", "DNI/NIE",
            "612 34 56 78", ArcaInvoicing: false, Chytapay: false, TransferDetection: false)
        {
            MercadoPagoConnect = MercadoPagoConnectModes.None,
            StripeDeposits = true,
            PlatformBilling = PlatformBillingProviders.Stripe,
            PlatformCurrency = "EUR",
        };

        public static readonly IReadOnlyList<CountryProfile> All = new[] { Argentina, Uruguay, Mexico, Spain };

        public bool IsArgentina => Code == "AR";

        /// <summary>True si la suscripción a la plataforma se cobra con Stripe (todo lo que no es Argentina).</summary>
        public bool BillsWithStripe => PlatformBilling == PlatformBillingProviders.Stripe;

        /// <summary>Perfil del país (código ISO-2, sin importar mayúsculas). Desconocido o vacío → Argentina.</summary>
        public static CountryProfile Get(string? code)
        {
            if (string.IsNullOrWhiteSpace(code)) return Argentina;
            var c = code.Trim().ToUpperInvariant();
            return All.FirstOrDefault(p => p.Code == c) ?? Argentina;
        }

        /// <summary>True si el código es uno de los países soportados.</summary>
        public static bool IsSupported(string? code) =>
            !string.IsNullOrWhiteSpace(code) && All.Any(p => p.Code == code.Trim().ToUpperInvariant());

        /// <summary>País por código de discado ("+598 ...", "598", "+34"). Null si no coincide ninguno.</summary>
        public static CountryProfile? FromDialCode(string? dialOrPhone)
        {
            if (string.IsNullOrWhiteSpace(dialOrPhone)) return null;
            var digits = new string(dialOrPhone.Where(char.IsDigit).ToArray());
            if (digits.StartsWith("00")) digits = digits[2..];
            // El más largo primero: 598 antes que 5x.
            return All.OrderByDescending(p => p.DialCode.Length)
                      .FirstOrDefault(p => digits.StartsWith(p.DialCode));
        }

        /// <summary>
        /// País del alta: el elegido si es soportado; si no, el del código internacional del teléfono
        /// ("+598 ..."); si no, Argentina.
        /// </summary>
        public static CountryProfile Resolve(string? country, string? phone)
        {
            if (IsSupported(country)) return Get(country);
            var raw = phone?.Trim();
            if (!string.IsNullOrEmpty(raw) && (raw.StartsWith("+") || raw.StartsWith("00")))
                return FromDialCode(raw) ?? Argentina;
            return Argentina;
        }

        /// <summary>Perfil del negocio (Tenant.Country; null → Argentina).</summary>
        public static CountryProfile For(Tenant? tenant) => Get(tenant?.Country);

        /// <summary>
        /// Moneda con la que el negocio cobra a sus clientes. En Argentina es siempre ARS: hay negocios
        /// creados por invitación con el default viejo "USD" que nunca se usó, y no queremos que de golpe
        /// vean dólares. En el resto de los países, la moneda guardada o la del país.
        /// </summary>
        public static string CurrencyFor(Tenant? tenant)
        {
            var profile = For(tenant);
            if (profile.IsArgentina) return profile.Currency;
            return string.IsNullOrWhiteSpace(tenant?.Currency) ? profile.Currency : tenant!.Currency!.Trim().ToUpperInvariant();
        }

        /// <summary>Zona horaria IANA efectiva del negocio (acepta offsets viejos "-3").</summary>
        public static string TimeZoneIdFor(Tenant? tenant) => TenantTime.ResolveId(tenant?.TimeZone, tenant?.Country);
    }

    public static class MercadoPagoConnectModes
    {
        public const string OAuth = "oauth";
        public const string Credentials = "credentials";
        public const string None = "none";
    }

    public static class PlatformBillingProviders
    {
        public const string MercadoPago = "mercadopago";
        public const string Stripe = "stripe";
    }
}
