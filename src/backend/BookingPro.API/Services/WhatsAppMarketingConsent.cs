using System.Text.RegularExpressions;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Casillero de consentimiento de marketing por WhatsApp que manda cada alta del dueño (web, iOS,
    /// Android). Opcional: si no viene, es false. La política de WhatsApp exige opt-in explícito antes de
    /// mandarle plantillas de marketing por la Cloud API.
    /// </summary>
    public interface IWhatsAppMarketingOptInSource
    {
        bool WhatsAppMarketingOptIn { get; }
        /// <summary>"web" | "ios" | "android".</summary>
        string? WhatsAppMarketingOptInSource { get; }
    }

    public static class WhatsAppMarketingConsent
    {
        /// <summary>
        /// Guarda el opt-in en el tenant si vino tildado. Si no vino tildado no toca nada (nunca baja un
        /// consentimiento ya dado). La fuente que no venga o venga rara cae en <paramref name="defaultSource"/>.
        /// </summary>
        public static void Apply(Tenant tenant, bool optIn, string? source, string defaultSource = "web", DateTime? at = null)
        {
            if (!optIn) return;
            tenant.WhatsAppMarketingOptIn = true;
            tenant.WhatsAppMarketingOptInAt = at ?? DateTime.UtcNow;
            tenant.WhatsAppMarketingOptInSource = NormalizeSource(source) ?? defaultSource;
        }

        public static void Apply(Tenant tenant, IWhatsAppMarketingOptInSource? src, string defaultSource = "web", DateTime? at = null)
        {
            if (src == null) return;
            Apply(tenant, src.WhatsAppMarketingOptIn, src.WhatsAppMarketingOptInSource, defaultSource, at);
        }

        /// <summary>Minúsculas, solo [a-z0-9_-], hasta 30 caracteres; null si no queda nada.</summary>
        public static string? NormalizeSource(string? source)
        {
            if (string.IsNullOrWhiteSpace(source)) return null;
            var s = Regex.Replace(source.Trim().ToLowerInvariant(), @"[^a-z0-9_-]", "");
            if (s.Length > 30) s = s.Substring(0, 30);
            return s.Length == 0 ? null : s;
        }
    }
}
