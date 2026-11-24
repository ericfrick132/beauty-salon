using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BookingPro.API.Data;
using BookingPro.API.Utilities;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Directorio público de negocios para SEO: /negocios/, /negocios/{ciudad}/ y /negocios/{ciudad}/{rubro}/
    /// ("Peluquerías en Plottier"). Devuelve HTML completo, como /blog. No hay ficha por negocio: cada tarjeta
    /// enlaza a la página de reservas del negocio (https://&lt;subdominio&gt;.turnos-pro.com/book), que es la que
    /// ya posiciona por su nombre.
    ///
    /// El ingress de DO tiene que enrutar el prefijo /negocios al backend (igual que /api y /blog); en el
    /// subdominio de un negocio, Program.cs lo manda con 301 a turnos-pro.com.
    ///
    /// Entra un negocio si (todas): está activo, no se ocultó (Tenant.IsListed), es de un país listado, no
    /// es de prueba ni del equipo, se le puede sacar una ciudad, tiene al menos un servicio y un profesional
    /// activos y tuvo turnos en los últimos 90 días. Las reglas que no son de base están en
    /// BusinessDirectoryRules y el HTML en BusinessDirectoryPages. Caché en memoria de 10 minutos.
    ///
    /// Tenant.IsDemo NO se mira: todo alta por la web nace con IsDemo = true (RegistrationController,
    /// SelfRegistrationController) y nada lo apaga, así que no distingue una demo de un cliente. Las cuentas
    /// de prueba quedan afuera por la actividad mínima y por BusinessDirectoryRules.IsExcluded.
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    [ApiExplorerSettings(IgnoreApi = true)]
    [Route("negocios")]
    public class BusinessDirectoryController : ControllerBase
    {
        /// <summary>TenantController la borra cuando un negocio cambia su ciudad, su dirección o si se lista.</summary>
        public const string CacheKey = "business-directory:v1";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);
        // Una sola carga a la vez: si el caché vence con varios bots pidiendo páginas, los demás esperan esa.
        private static readonly SemaphoreSlim LoadGate = new(1, 1);

        private readonly ApplicationDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly ILogger<BusinessDirectoryController> _logger;

        public BusinessDirectoryController(ApplicationDbContext db, IMemoryCache cache, ILogger<BusinessDirectoryController> logger)
        {
            _db = db;
            _cache = cache;
            _logger = logger;
        }

        // ---------- Rutas ----------

        [HttpGet("")]
        [HttpHead("")]
        public Task<IActionResult> Index(CancellationToken ct) =>
            Serve(BusinessDirectoryPages.Index, ct);

        [HttpGet("sitemap.xml")]
        [HttpHead("sitemap.xml")]
        public async Task<IActionResult> Sitemap(CancellationToken ct)
        {
            IReadOnlyList<DirectoryBusiness> all;
            try
            {
                all = await GetBusinessesAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                return Unavailable(ex);
            }
            Response.Headers.CacheControl = "public, max-age=600";
            return Content(BusinessDirectoryPages.Sitemap(all), "application/xml; charset=utf-8");
        }

        [HttpGet("{city}")]
        [HttpHead("{city}")]
        public Task<IActionResult> City(string city, CancellationToken ct) =>
            Serve(all => BusinessDirectoryPages.City(all, city.ToLowerInvariant()), ct);

        [HttpGet("{city}/{rubro}")]
        [HttpHead("{city}/{rubro}")]
        public Task<IActionResult> CityRubro(string city, string rubro, CancellationToken ct) =>
            Serve(all => BusinessDirectoryPages.CityRubro(all, city.ToLowerInvariant(), rubro.ToLowerInvariant()), ct);

        // ---------- Respuestas ----------

        private async Task<IActionResult> Serve(Func<IReadOnlyList<DirectoryBusiness>, DirectoryPage?> build, CancellationToken ct)
        {
            IReadOnlyList<DirectoryBusiness> all;
            try
            {
                all = await GetBusinessesAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                return Unavailable(ex);
            }

            var page = build(all);
            if (page == null)
            {
                // Ciudad o rubro sin negocios: 404, nada de páginas vacías.
                Response.Headers["X-Robots-Tag"] = "noindex";
                return new ContentResult { Content = BusinessDirectoryPages.NotFound(), ContentType = "text/html; charset=utf-8", StatusCode = StatusCodes.Status404NotFound };
            }

            // La misma página responde con o sin barra final y en mayúsculas; la canónica (minúsculas, con
            // barra) va en el HTML. No se redirige: si el ingress normalizara la barra, sería un loop.
            Response.Headers.CacheControl = "public, max-age=600";
            return Content(page.Html, "text/html; charset=utf-8");
        }

        /// <summary>
        /// Si la base falla no se responde 404 (Google daría de baja todas las páginas del directorio): 503 y
        /// que vuelva a probar.
        /// </summary>
        private IActionResult Unavailable(Exception ex)
        {
            _logger.LogError(ex, "Directorio de negocios: no se pudo armar el listado");
            Response.Headers.RetryAfter = "300";
            Response.Headers["X-Robots-Tag"] = "noindex";
            return new ContentResult { Content = "El directorio no está disponible en este momento.", ContentType = "text/plain; charset=utf-8", StatusCode = StatusCodes.Status503ServiceUnavailable };
        }

        // ---------- Datos ----------

        private async Task<IReadOnlyList<DirectoryBusiness>> GetBusinessesAsync(CancellationToken ct)
        {
            if (_cache.TryGetValue(CacheKey, out IReadOnlyList<DirectoryBusiness>? cached) && cached != null) return cached;

            await LoadGate.WaitAsync(ct);
            try
            {
                if (_cache.TryGetValue(CacheKey, out cached) && cached != null) return cached;
                var loaded = await LoadAsync(ct);
                _cache.Set(CacheKey, loaded, CacheTtl);
                return loaded;
            }
            finally
            {
                LoadGate.Release();
            }
        }

        /// <summary>
        /// Cuatro consultas en total, no una por negocio. Servicios, profesionales y turnos son tablas
        /// compartidas con TenantId y filtro global por tenant (no hay un esquema por negocio: Tenant.SchemaName
        /// quedó de una versión anterior), así que se leen con IgnoreQueryFilters, como PublicStatsController
        /// y HubMetricsController.
        /// </summary>
        private async Task<IReadOnlyList<DirectoryBusiness>> LoadAsync(CancellationToken ct)
        {
            var tenants = await _db.Tenants.IgnoreQueryFilters().AsNoTracking()
                // Activo: los mismos estados con los que TenantService resuelve el subdominio. Suspendidos y
                // cancelados quedan afuera; el plan no se mira (el Gratuito cuenta).
                .Where(t => (t.Status == "active" || t.Status == "trial")
                    && t.IsListed
                    && ((t.City != null && t.City != "") || (t.BusinessAddress != null && t.BusinessAddress != "")))
                .Select(t => new
                {
                    t.Id, t.Subdomain, t.BusinessName, t.BusinessAddress, t.City, t.Country, t.BusinessKind, t.OwnerEmail,
                    VerticalCode = t.Vertical != null ? t.Vertical.Code : null
                })
                .ToListAsync(ct);

            var candidates = new List<(Guid Id, DirectoryBusiness Business)>();
            foreach (var t in tenants)
            {
                try
                {
                    var country = string.IsNullOrWhiteSpace(t.Country) ? "AR" : t.Country.Trim().ToUpperInvariant();
                    if (!BusinessDirectoryRules.ListedCountries.Contains(country)) continue;
                    if (BusinessDirectoryRules.IsExcluded(t.Subdomain, t.BusinessName, t.OwnerEmail)) continue;

                    var city = BusinessDirectoryRules.EffectiveCity(t.City, t.BusinessAddress, country);
                    var citySlug = BusinessDirectoryRules.Slugify(city);
                    if (city == null || citySlug.Length == 0) continue;

                    candidates.Add((t.Id, new DirectoryBusiness
                    {
                        Name = OneLine(t.BusinessName),
                        Subdomain = t.Subdomain.Trim().ToLowerInvariant(),
                        City = city,
                        CitySlug = citySlug,
                        Address = string.IsNullOrWhiteSpace(t.BusinessAddress) ? null : OneLine(t.BusinessAddress),
                        Country = country,
                        Rubro = BusinessDirectoryRules.ResolveRubro(t.BusinessKind, t.VerticalCode)
                    }));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Directorio de negocios: se saltea {Subdomain}", t.Subdomain);
                }
            }
            if (candidates.Count == 0)
            {
                _logger.LogInformation("Directorio de negocios: {Base} activos con dirección, 0 con ciudad y sin exclusiones", tenants.Count);
                return Array.Empty<DirectoryBusiness>();
            }

            var ids = candidates.Select(c => c.Id).ToList();

            // Los mismos profesionales que ofrece la página de reservas (PublicController.GetPublicEmployees).
            var withStaff = (await _db.Employees.IgnoreQueryFilters().AsNoTracking()
                    .Where(e => ids.Contains(e.TenantId) && e.IsActive && e.CanPerformServices)
                    .Select(e => e.TenantId)
                    .Distinct()
                    .ToListAsync(ct))
                .ToHashSet();

            var services = (await _db.Services.IgnoreQueryFilters().AsNoTracking()
                    .Where(s => ids.Contains(s.TenantId) && s.IsActive)
                    .Select(s => new { s.TenantId, s.Id, s.Name })
                    .ToListAsync(ct))
                .ToLookup(s => s.TenantId);

            // Turnos no cancelados con fecha dentro de la ventana o más adelante (un turno sacado en estos días
            // siempre cae ahí, y StartTime tiene índice). De acá sale si el negocio tiene actividad real y
            // cuáles son sus servicios más pedidos.
            var since = DateTime.UtcNow.AddDays(-BusinessDirectoryRules.RecentBookingDays);
            var recent = (await _db.Bookings.IgnoreQueryFilters().AsNoTracking()
                    .Where(b => ids.Contains(b.TenantId) && b.Status != "cancelled" && b.StartTime >= since)
                    .GroupBy(b => new { b.TenantId, b.ServiceId })
                    .Select(g => new { g.Key.TenantId, g.Key.ServiceId, Count = g.Count() })
                    .ToListAsync(ct))
                .ToLookup(r => r.TenantId);

            var listed = new List<DirectoryBusiness>();
            foreach (var (id, business) in candidates)
            {
                try
                {
                    if (!withStaff.Contains(id)) continue;

                    var bookingsByService = recent[id].ToDictionary(r => r.ServiceId, r => r.Count);
                    if (bookingsByService.Values.Sum() < BusinessDirectoryRules.MinRecentBookings) continue;

                    var names = services[id]
                        .Select(s => (Name: OneLine(s.Name), Bookings: bookingsByService.GetValueOrDefault(s.Id)))
                        .Where(s => s.Name.Length > 0)
                        .GroupBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
                        .Select(g => (Name: g.First().Name, Bookings: g.Sum(s => s.Bookings)))
                        .OrderByDescending(s => s.Bookings)
                        .ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
                        .Select(s => s.Name)
                        .ToList();
                    if (names.Count == 0) continue;

                    listed.Add(new DirectoryBusiness
                    {
                        Name = business.Name,
                        Subdomain = business.Subdomain,
                        City = business.City,
                        CitySlug = business.CitySlug,
                        Address = business.Address,
                        Country = business.Country,
                        Rubro = business.Rubro,
                        Services = names
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Directorio de negocios: se saltea {Subdomain}", business.Subdomain);
                }
            }
            // Solo conteos (sin nombres): sirve para ver en qué etapa queda afuera la mayoría.
            _logger.LogInformation(
                "Directorio de negocios: {Base} activos con dirección, {Candidates} con ciudad y sin exclusiones, {Staff} con profesional activo, {Listed} listados (mínimo {Min} turnos en {Days} días)",
                tenants.Count, candidates.Count, candidates.Count(c => withStaff.Contains(c.Id)), listed.Count,
                BusinessDirectoryRules.MinRecentBookings, BusinessDirectoryRules.RecentBookingDays);
            return listed;
        }

        private static string OneLine(string? value) =>
            string.Join(' ', (value ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }
}
