namespace BookingPro.API.Services
{
    /// <summary>
    /// Hora local del negocio. Tenant.TimeZone guarda dos formatos según de dónde vino el
    /// alta: un offset en horas ("-3") o un id IANA ("America/Argentina/Buenos_Aires").
    /// Acá se resuelven los dos; si no se entiende, Argentina (-3).
    /// </summary>
    public static class TenantClock
    {
        public static TimeZoneInfo ZoneFor(string? timeZone)
        {
            if (string.IsNullOrWhiteSpace(timeZone)) return Fixed(-3);
            var tz = timeZone.Trim();
            if (int.TryParse(tz, out var hours) && hours >= -12 && hours <= 14) return Fixed(hours);
            if (string.Equals(tz, "UTC", StringComparison.OrdinalIgnoreCase)) return TimeZoneInfo.Utc;
            try { return TimeZoneInfo.FindSystemTimeZoneById(tz); }
            catch { return Fixed(-3); }
        }

        public static DateTime NowLocal(string? timeZone) =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ZoneFor(timeZone));

        public static DateTime ToLocal(DateTime utc, string? timeZone) =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), ZoneFor(timeZone));

        /// <summary>Medianoche local de una fecha, expresada en UTC. Sirve para acotar consultas.</summary>
        public static DateTime LocalDateToUtc(DateTime localDate, string? timeZone) =>
            TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified), ZoneFor(timeZone));

        /// <summary>
        /// Horario en el que un negocio puede iniciar conversaciones. Sólo aplica a lo que
        /// arrancamos nosotros y puede esperar; una respuesta a un cliente sale siempre.
        /// Config: WhatsAppThrottle:ActiveFromHour / ActiveToHour (default 8 a 22).
        /// </summary>
        public static bool WithinActiveHours(string? timeZone, IConfiguration config)
        {
            var from = config.GetValue<int?>("WhatsAppThrottle:ActiveFromHour") ?? 8;
            var to = config.GetValue<int?>("WhatsAppThrottle:ActiveToHour") ?? 22;
            var hour = NowLocal(timeZone).Hour;
            return hour >= from && hour < to;
        }

        private static TimeZoneInfo Fixed(int hours)
        {
            var id = $"UTC{(hours >= 0 ? "+" : "")}{hours}";
            return TimeZoneInfo.CreateCustomTimeZone(id, TimeSpan.FromHours(hours), id, id);
        }
    }
}
