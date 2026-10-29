namespace BookingPro.API.Utilities
{
    public static class TenantLogo
    {
        /// <summary>
        /// Los logos viejos se guardaban en wwwroot/uploads del contenedor: se borran en cada deploy y /uploads
        /// ni siquiera llega a la API, así que esa URL siempre da imagen rota. Se tratan como "sin logo" hasta
        /// que el negocio lo vuelva a subir (ahora va a Spaces o queda como data URI).
        /// </summary>
        public static string? Usable(string? logoUrl) =>
            string.IsNullOrWhiteSpace(logoUrl) || logoUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)
                ? null
                : logoUrl;
    }
}
