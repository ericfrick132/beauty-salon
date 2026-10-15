namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Teléfonos a formato internacional según el país del negocio. Un número "local" (sin + ni
    /// código de país) se completa con el código del país; uno que ya trae código se respeta.
    /// Argentina conserva la regla de siempre: se agrega el 9 de móvil si falta (54 11... → 549 11...),
    /// que es como WhatsApp identifica el número.
    /// </summary>
    public static class PhoneNumbers
    {
        /// <summary>Dígitos del número nacional sin prefijo de larga distancia, por país.</summary>
        private static int NationalMinLength(CountryProfile p) => p.Code switch
        {
            "AR" => 10, // 11 2345 6789
            "UY" => 8,  // 94 123 456 / 2 123 4567
            "MX" => 10, // 55 1234 5678
            "ES" => 9,  // 612 34 56 78
            _ => 8,
        };

        /// <summary>
        /// Solo dígitos con código de país (sin "+"), o null si no parece un teléfono.
        /// </summary>
        public static string? ToDigits(string? raw, string? country)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var s = raw.Replace("whatsapp:", "", StringComparison.OrdinalIgnoreCase).Trim();
            var international = s.StartsWith("+");
            var digits = new string(s.Where(char.IsDigit).ToArray());
            if (digits.StartsWith("00")) { digits = digits[2..]; international = true; }

            if (!international && !HasCountryCode(digits, CountryProfile.Get(country)))
            {
                var profile = CountryProfile.Get(country);
                digits = digits.TrimStart('0'); // "011 2345 6789" → "1123456789"; "099 123 456" → "99123456"
                if (digits.Length < 8) return null;
                digits = profile.DialCode + digits;
            }

            if (digits.StartsWith("54") && !digits.StartsWith("549") && digits.Length >= 12)
                digits = "549" + digits[2..];

            if (digits.Length < 9 || digits.Length > 16) return null;
            return digits;
        }

        /// <summary>Formato E.164 ("+5491123456789") o null.</summary>
        public static string? ToE164(string? raw, string? country)
        {
            var d = ToDigits(raw, country);
            return d == null ? null : "+" + d;
        }

        /// <summary>
        /// Para enviar por WhatsApp: si el número ya trae código de país (con o sin "+") se manda
        /// tal cual (solo dígitos, como siempre); si es local, se le antepone el código del país del negocio.
        /// </summary>
        public static string ForWhatsApp(string phone, string? country)
        {
            var cleaned = phone
                .Replace("whatsapp:", "")
                .Replace("+", "")
                .Replace(" ", "")
                .Replace("-", "")
                .Trim();
            var international = phone.TrimStart().StartsWith("+") || cleaned.StartsWith("00");
            var digits = new string(cleaned.Where(char.IsDigit).ToArray());
            if (international || digits.Length == 0) return cleaned;
            if (CountryProfile.All.Any(p => HasCountryCode(digits, p))) return cleaned;
            return ToDigits(digits, country) ?? cleaned;
        }

        private static bool HasCountryCode(string digits, CountryProfile p) =>
            digits.StartsWith(p.DialCode) && digits.Length - p.DialCode.Length >= NationalMinLength(p);
    }
}
