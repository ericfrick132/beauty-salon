using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BookingPro.API.Data;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Prueba social de la landing y del login/registro: contadores agregados reales de toda la
    /// plataforma, sin ningún dato personal ni de un negocio en particular. Anónimo y cacheado en
    /// memoria 10 minutos (la home lo pide en cada visita).
    ///
    /// El frontend decide qué mostrar: si un número es bajo (&lt; 20) muestra un texto sin número.
    /// </summary>
    [ApiController]
    [Route("api/public/stats")]
    public class PublicStatsController : ControllerBase
    {
        private const string CacheKey = "public-stats:v1";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<PublicStatsController> _logger;

        public PublicStatsController(ApplicationDbContext context, IMemoryCache cache, ILogger<PublicStatsController> logger)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        public record PublicStatsDto(
            int BookingsLast7Days,
            int BookingsLast30Days,
            int ActiveBusinessesLast30Days,
            DateTime GeneratedAt);

        // GET: api/public/stats
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Get()
        {
            if (_cache.TryGetValue(CacheKey, out PublicStatsDto? cached) && cached != null)
                return Ok(cached);

            try
            {
                var now = DateTime.UtcNow;
                var since7 = now.AddDays(-7);
                var since30 = now.AddDays(-30);
                var cancelled = "cancelled";

                // Booking es tenant-scoped: IgnoreQueryFilters porque acá no hay tenant y queremos el
                // agregado de toda la plataforma. Solo turnos creados (reservados) en la ventana y no
                // cancelados.
                var recent = _context.Bookings
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(b => b.CreatedAt >= since30 && b.Status != cancelled);

                var bookings30 = await recent.CountAsync();
                var bookings7 = await recent.CountAsync(b => b.CreatedAt >= since7);
                // Negocio activo = recibió al menos un turno en los últimos 30 días.
                var activeBusinesses = await recent.Select(b => b.TenantId).Distinct().CountAsync();

                var dto = new PublicStatsDto(bookings7, bookings30, activeBusinesses, now);
                _cache.Set(CacheKey, dto, CacheTtl);
                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculando las estadísticas públicas");
                // Sin números: el frontend muestra el texto sin cifra.
                return StatusCode(503, new { error = "stats_unavailable" });
            }
        }
    }
}
