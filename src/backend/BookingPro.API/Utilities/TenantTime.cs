using System.Collections.Concurrent;
using BookingPro.API.Models;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Hora local del negocio. Tenant.TimeZone se guardaba de dos formas: offsets en horas desde
    /// Configuración ("-3", "+1", "0") y zonas IANA desde el alta ("America/Argentina/Buenos_Aires").
    /// Además las invitaciones dejaban "UTC" como "sin configurar". Este helper acepta todo y
    /// devuelve siempre una zona IANA; lo que no se entiende cae en la zona del país (Argentina
    /// si no hay país), que es como se comportaba antes la mayoría del código (default -3).
    /// </summary>
    public static class TenantTime
    {
        private static readonly ConcurrentDictionary<string, TimeZoneInfo> Cache = new();

        /// <summary>Offsets viejos de Configuración → zona IANA razonable.</summary>
        private static readonly Dictionary<int, string> LegacyOffsets = new()
        {
            [-8] = "America/Los_Angeles",
            [-6] = "America/Mexico_City",
            [-5] = "America/Bogota",
            [-4] = "America/La_Paz",
            [-3] = "America/Argentina/Buenos_Aires",
            [-2] = "America/Noronha",
            [0] = "Europe/London",
            [1] = "Europe/Madrid",
            [2] = "Europe/Athens",
        };

        /// <summary>
        /// Zona IANA efectiva para un valor guardado + país del negocio.
        /// "-3" con país UY → America/Montevideo (mismo offset que el país); "-3" sin país → Buenos Aires.
        /// </summary>
        public static string ResolveId(string? stored, string? country)
        {
            var profile = CountryProfile.Get(country);
            var value = stored?.Trim();
            if (string.IsNullOrEmpty(value) || value.Equals("UTC", StringComparison.OrdinalIgnoreCase))
                return profile.TimeZoneId;

            if (TryParseOffset(value, out var hours))
            {
                // Si el offset coincide con el del país, la zona del país (respeta su horario de verano).
                var countryTz = Find(profile.TimeZoneId);
                if (countryTz != null && countryTz.BaseUtcOffset == TimeSpan.FromHours(hours))
                    return profile.TimeZoneId;
                if (LegacyOffsets.TryGetValue(hours, out var mapped)) return mapped;
                // Etc/GMT tiene el signo invertido (Etc/GMT+5 = UTC-5).
                return hours == 0 ? "Etc/UTC" : $"Etc/GMT{(hours > 0 ? "-" : "+")}{Math.Abs(hours)}";
            }

            return Find(value) != null ? value : profile.TimeZoneId;
        }

        public static TimeZoneInfo Get(string? stored, string? country) =>
            Find(ResolveId(stored, country)) ?? ArgentinaFallback();

        public static TimeZoneInfo For(Tenant? tenant) => Get(tenant?.TimeZone, tenant?.Country);

        public static TimeZoneInfo For(TenantInfo? tenant) => Get(tenant?.TimeZone, tenant?.Country);

        /// <summary>UTC → hora local del negocio. Un DateTime sin Kind se toma como UTC (así vienen de Postgres).</summary>
        public static DateTime ToLocal(DateTime utc, TimeZoneInfo tz)
        {
            var u = utc.Kind == DateTimeKind.Local ? utc.ToUniversalTime() : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
            return DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(u, tz), DateTimeKind.Unspecified);
        }

        /// <summary>Hora local del negocio → UTC. Las horas que no existen (salto de verano) se corren una hora.</summary>
        public static DateTime ToUtc(DateTime local, TimeZoneInfo tz)
        {
            var l = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
            if (tz.IsInvalidTime(l)) l = l.AddHours(1);
            return TimeZoneInfo.ConvertTimeToUtc(l, tz);
        }

        public static DateTime NowLocal(TimeZoneInfo tz) => ToLocal(DateTime.UtcNow, tz);

        /// <summary>Offset entero en horas en ese instante (para el código que trabaja con horas: -3 en Argentina).</summary>
        public static int OffsetHours(TimeZoneInfo tz, DateTime? utc = null)
        {
            var at = DateTime.SpecifyKind(utc ?? DateTime.UtcNow, DateTimeKind.Utc);
            return (int)Math.Round(tz.GetUtcOffset(at).TotalHours);
        }

        private static bool TryParseOffset(string value, out int hours)
        {
            hours = 0;
            if (!int.TryParse(value, System.Globalization.NumberStyles.AllowLeadingSign,
                    System.Globalization.CultureInfo.InvariantCulture, out var h)) return false;
            if (h < -12 || h > 14) return false;
            hours = h;
            return true;
        }

        private static TimeZoneInfo? Find(string id)
        {
            if (Cache.TryGetValue(id, out var cached)) return cached;
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(id);
                Cache[id] = tz;
                return tz;
            }
            catch
            {
                if (id == "America/Argentina/Buenos_Aires")
                {
                    var ar = ArgentinaFallback();
                    Cache[id] = ar;
                    return ar;
                }
                return null;
            }
        }

        private static TimeZoneInfo ArgentinaFallback() =>
            TimeZoneInfo.CreateCustomTimeZone("ART", TimeSpan.FromHours(-3), "ART", "ART");
    }
}
