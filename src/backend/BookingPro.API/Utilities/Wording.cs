using BookingPro.API.Models.Entities;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Cómo le habla TurnosPro al cliente final según el país del negocio. Todo el copy original está en
    /// voseo rioplatense y así sigue para Argentina y Uruguay (el texto voseo se devuelve tal cual, sin
    /// tocar: Argentina sale byte a byte igual que antes). México y España se tutean y cambian algunas
    /// palabras: "turno" → "cita", "seña" → "anticipo" (MX) / "señal" (ES), "celular" → "móvil" (ES).
    ///
    /// Uso: <c>var w = Wording.For(tenant); w.T("Elegí un día", "Elige un día")</c>. Si la frase cambia
    /// distinto en México y en España (por "anticipo"/"señal" o "celular"/"móvil"), la sobrecarga de tres
    /// textos: <c>w.T(voseo, mx, es)</c>. No es un i18n completo: cada mensaje lleva sus variantes al lado.
    /// </summary>
    public sealed class Wording
    {
        public static readonly Wording Argentina = new("AR");

        public string CountryCode { get; }

        private Wording(string countryCode) => CountryCode = countryCode;

        public static Wording For(Tenant? tenant) => ForCountry(tenant?.Country);

        public static Wording ForCountry(string? country)
        {
            var code = CountryProfile.Get(country).Code;
            return code switch
            {
                "AR" => Argentina,
                _ => new Wording(code),
            };
        }

        /// <summary>México y España: tú en lugar de vos.</summary>
        public bool UsesTu => CountryCode is "MX" or "ES";

        public bool IsMexico => CountryCode == "MX";
        public bool IsSpain => CountryCode == "ES";

        /// <summary>Texto en voseo (AR/UY, se devuelve sin cambios) o en tú (MX/ES).</summary>
        public string T(string voseo, string tu) => UsesTu ? tu : voseo;

        /// <summary>Texto en voseo (AR/UY) o la variante de México o la de España.</summary>
        public string T(string voseo, string mexico, string spain) => CountryCode switch
        {
            "MX" => mexico,
            "ES" => spain,
            _ => voseo,
        };

        /// <summary>"turno" / "cita".</summary>
        public string Turno => UsesTu ? "cita" : "turno";

        /// <summary>"turnos" / "citas".</summary>
        public string Turnos => UsesTu ? "citas" : "turnos";

        /// <summary>"seña" / "anticipo" (MX) / "señal" (ES).</summary>
        public string Sena => CountryCode switch
        {
            "MX" => "anticipo",
            "ES" => "señal",
            _ => "seña",
        };

        /// <summary>"Seña" / "Anticipo" / "Señal".</summary>
        public string SenaTitle => CountryCode switch
        {
            "MX" => "Anticipo",
            "ES" => "Señal",
            _ => "Seña",
        };

        /// <summary>"celular" / "móvil" (ES).</summary>
        public string Celular => IsSpain ? "móvil" : "celular";
    }
}
