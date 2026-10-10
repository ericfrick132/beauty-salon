using System.Text.Json;

namespace BookingPro.API.Services
{
    /// <summary>Qué hizo un bot/agente con un mensaje entrante (se guarda en WhatsAppInboundEvent).</summary>
    public record InboundHandleResult(string Status, string? Reason = null, string? Detail = null)
    {
        public static InboundHandleResult Replied(string reply, string? reason = null) => new("replied", reason, Preview(reply));
        public static InboundHandleResult Ignored(string reason, string? detail = null) => new("ignored", reason, detail);
        public static InboundHandleResult Failed(string reason, string? detail = null) => new("failed", reason, Preview(detail));

        public static string? Preview(string? text, int max = 300) =>
            text == null ? null : text.Length <= max ? text : text[..max] + "…";
    }

    /// <summary>
    /// Remitente de un mensaje entrante de Evolution. WhatsApp manda cada vez más chats con
    /// Linked IDs (<c>xxx@lid</c>) que NO son teléfonos: el número real, si WhatsApp lo expone,
    /// viene en <c>senderPn</c>/<c>participantPn</c>/<c>remoteJidAlt</c>.
    /// </summary>
    public static class WhatsAppSender
    {
        public const string LidSuffix = "@lid";
        private const string UserSuffix = "@s.whatsapp.net";

        /// <summary>
        /// Dígitos del teléfono, o el JID @lid completo si no hay teléfono. Null si no es un chat
        /// individual (grupo, estado, canal) o no se puede resolver.
        /// </summary>
        public static string? Resolve(JsonElement key, JsonElement item)
        {
            var remoteJid = GetString(key, "remoteJid") ?? "";
            if (remoteJid.EndsWith(UserSuffix, StringComparison.Ordinal))
                return Digits(remoteJid);
            if (!remoteJid.EndsWith(LidSuffix, StringComparison.Ordinal))
                return null;

            foreach (var alt in new[]
                     {
                         GetString(key, "senderPn"), GetString(key, "participantPn"), GetString(key, "remoteJidAlt"),
                         GetString(item, "senderPn"), GetString(item, "participantPn"),
                     })
            {
                if (string.IsNullOrEmpty(alt) || alt.EndsWith(LidSuffix, StringComparison.Ordinal)) continue;
                var digits = Digits(alt);
                if (digits.Length >= 8) return digits;
            }

            var lidDigits = Digits(remoteJid);
            return lidDigits.Length == 0 ? null : lidDigits + LidSuffix;
        }

        /// <summary>True si el remitente es un @lid sin teléfono: no se le puede responder por número.</summary>
        public static bool IsLid(string phone) => phone.EndsWith(LidSuffix, StringComparison.Ordinal);

        /// <summary>Últimos 8 dígitos: tolera variantes de prefijo AR (549…, 54…, 0…, 15…).</summary>
        public static string Suffix(string? phone)
        {
            if (string.IsNullOrEmpty(phone)) return string.Empty;
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            return digits.Length <= 8 ? digits : digits[^8..];
        }

        private static string Digits(string value)
        {
            var at = value.IndexOf('@');
            var user = at >= 0 ? value[..at] : value;
            // "5491122223333:12@s.whatsapp.net" → el ":12" es el device, no parte del número
            var colon = user.IndexOf(':');
            if (colon >= 0) user = user[..colon];
            return new string(user.Where(char.IsDigit).ToArray());
        }

        private static string? GetString(JsonElement element, string property) =>
            element.ValueKind == JsonValueKind.Object &&
            element.TryGetProperty(property, out var v) && v.ValueKind == JsonValueKind.String
                ? v.GetString()
                : null;
    }
}
