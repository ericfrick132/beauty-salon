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

        public static readonly CountryProfile Argentina = new(
            "AR", "Argentina", "ARS", "America/Argentina/Buenos_Aires", "es-AR", "54", "DNI",
            "11 2345 6789", ArcaInvoicing: true, Chytapay: true, TransferDetection: true);

        public static readonly CountryProfile Uruguay = new(
            "UY", "Uruguay", "UYU", "America/Montevideo", "es-UY", "598", "CI",
            "94 123 456", ArcaInvoicing: false, Chytapay: false, TransferDetection: false);

        public static readonly CountryProfile Mexico = new(
            "MX", "México", "MXN", "America/Mexico_City", "es-MX", "52", "CURP",
            "55 1234 5678", ArcaInvoicing: false, Chytapay: false, TransferDetection: false);

        public static readonly CountryProfile Spain = new(
            "ES", "España", "EUR", "Europe/Madrid", "es-ES", "34", "DNI/NIE",
            "612 34 56 78", ArcaInvoicing: false, Chytapay: false, TransferDetection: false);

        public static readonly IReadOnlyList<CountryProfile> All = new[] { Argentina, Uruguay, Mexico, Spain };

        public bool IsArgentina => Code == "AR";

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
}
