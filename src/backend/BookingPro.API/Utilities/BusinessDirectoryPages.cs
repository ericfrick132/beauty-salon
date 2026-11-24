using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using Rubro = BookingPro.API.Utilities.BusinessDirectoryRules.Rubro;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Un negocio del directorio público. Solo lleva lo que el negocio ya muestra en su página de reservas:
    /// nombre, rubro, dirección y nombres de servicios. Sin teléfono, mail, dueño ni precios.
    /// </summary>
    public sealed class DirectoryBusiness
    {
        public required string Name { get; init; }
        public required string Subdomain { get; init; }
        public required string City { get; init; }
        public required string CitySlug { get; init; }
        public string? Address { get; init; }
        public string Country { get; init; } = "AR";
        /// <summary>null = "Otros": aparece en la página de su ciudad, sin página de rubro.</summary>
        public Rubro? Rubro { get; init; }
        /// <summary>Servicios activos, los más reservados primero.</summary>
        public IReadOnlyList<string> Services { get; init; } = Array.Empty<string>();

        /// <summary>La ficha del negocio es su página de reservas: el directorio no tiene una propia.</summary>
        public string BookingUrl => $"https://{Subdomain}.turnos-pro.com/book";
    }

    public sealed record DirectoryPage(string Title, string Description, string Canonical, string Html);

    /// <summary>
    /// HTML del directorio público (/negocios/, /negocios/&lt;ciudad&gt;/ y /negocios/&lt;ciudad&gt;/&lt;rubro&gt;/) y su
    /// sitemap. Funciones puras sobre la lista de negocios ya filtrada: no tocan la base ni el request.
    /// Devuelven null cuando no hay nada que mostrar (el controller responde 404: no hay páginas vacías).
    /// </summary>
    public static class BusinessDirectoryPages
    {
        public const string BaseUrl = "https://turnos-pro.com";
        public const string DirectoryPath = "/negocios";
        private const string DirectoryUrl = BaseUrl + DirectoryPath;
        private const int MaxRelatedLinks = 12;

        private static readonly StringComparer ByName = StringComparer.Create(CultureInfo.GetCultureInfo("es-AR"), ignoreCase: true);

        private static readonly JsonSerializerOptions JsonLdOptions = new()
        {
            // Deja las tildes legibles y sigue escapando <, > y & (el JSON va dentro de un <script>).
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private sealed record CityGroup(string Slug, string Name, List<DirectoryBusiness> Businesses);
        private sealed record RubroGroup(Rubro? Rubro, List<DirectoryBusiness> Businesses);

        public static string CityPath(string citySlug) => $"{DirectoryPath}/{citySlug}/";
        public static string RubroPath(string citySlug, string rubroSlug) => $"{DirectoryPath}/{citySlug}/{rubroSlug}/";

        // ---------- Agrupado ----------

        private static List<CityGroup> Cities(IReadOnlyList<DirectoryBusiness> all) =>
            all.GroupBy(b => b.CitySlug, StringComparer.Ordinal)
                .Select(g => new CityGroup(
                    g.Key,
                    BusinessDirectoryRules.PickCityName(g.Select(b => b.City)),
                    g.OrderBy(b => b.Name, ByName).ThenBy(b => b.Subdomain, StringComparer.Ordinal).ToList()))
                .OrderByDescending(c => c.Businesses.Count)
                .ThenBy(c => c.Name, ByName)
                .ToList();

        private static int RubroOrder(Rubro? rubro)
        {
            if (rubro == null) return int.MaxValue; // "Otros" siempre al final
            for (var i = 0; i < BusinessDirectoryRules.Rubros.Count; i++)
                if (BusinessDirectoryRules.Rubros[i] == rubro) return i;
            return int.MaxValue - 1;
        }

        private static List<RubroGroup> RubroGroups(IEnumerable<DirectoryBusiness> businesses) =>
            businesses.GroupBy(b => b.Rubro)
                .Select(g => new RubroGroup(g.Key, g.ToList()))
                .OrderBy(g => g.Rubro == null ? 1 : 0)
                .ThenByDescending(g => g.Businesses.Count)
                .ThenBy(g => RubroOrder(g.Rubro))
                .ToList();

        /// <summary>
        /// Ciudad con un solo rubro y nadie en "Otros": su página lista lo mismo que la del rubro. Para que
        /// no compitan por "peluquerías en &lt;ciudad&gt;", la canónica de la ciudad es la página del rubro y la
        /// ciudad no va al sitemap.
        /// </summary>
        private static Rubro? OnlyRubro(List<RubroGroup> groups) => groups.Count == 1 ? groups[0].Rubro : null;

        // ---------- Páginas ----------

        public static DirectoryPage? Index(IReadOnlyList<DirectoryBusiness> all)
        {
            var cities = Cities(all);
            if (cities.Count == 0) return null;

            var rubros = RubroGroups(all).Where(g => g.Rubro != null).ToList();
            var url = DirectoryUrl + "/";
            var total = all.Count;
            var counts = $"{Count(total, "negocio", "negocios")} con turnos online en {Count(cities.Count, "ciudad", "ciudades")}";
            var rubrosText = ListText(rubros.Select(g => g.Rubro!.PluralLower).ToList(), 3);

            const string title = "Negocios para reservar turno online por ciudad | TurnosPro";
            var description = FitDescription(
                rubros.Count > 0 && total > 1 ? $"{counts}: {rubrosText}. Elegí tu ciudad y reservá desde el celular, sin llamar." : null,
                $"{counts}. Elegí tu ciudad y reservá desde el celular, sin llamar.");

            var body = new StringBuilder();
            body.Append("<nav class=\"crumbs\"><a href=\"/\">TurnosPro</a> › <span>Negocios</span></nav>");
            body.Append("<h1>Negocios para reservar turno online, por ciudad y rubro</h1>");
            body.Append($"<p class=\"lead\">{Count(total, "negocio", "negocios")} de {Count(cities.Count, "ciudad", "ciudades")} {(total == 1 ? "toma" : "toman")} turnos online con TurnosPro. Elegí tu ciudad o un rubro, mirá los servicios de cada negocio y reservá desde el celular, sin llamar ni mandar mensajes.</p>");

            body.Append("<h2>Ciudades</h2><ul class=\"cols\">");
            foreach (var c in cities)
                body.Append($"<li><a href=\"{CityPath(c.Slug)}\">{H(c.Name)}</a> <span class=\"muted\">({Count(c.Businesses.Count, "negocio", "negocios")})</span></li>");
            body.Append("</ul>");

            if (rubros.Count > 0)
            {
                body.Append("<h2>Rubros</h2>");
                foreach (var g in rubros)
                {
                    body.Append($"<h3>{H(g.Rubro!.Plural)}</h3><ul class=\"cols\">");
                    foreach (var c in cities)
                    {
                        var n = c.Businesses.Count(b => b.Rubro == g.Rubro);
                        if (n == 0) continue;
                        body.Append($"<li><a href=\"{RubroPath(c.Slug, g.Rubro.Slug)}\">{H(g.Rubro.Plural)} en {H(c.Name)}</a> <span class=\"muted\">({n})</span></li>");
                    }
                    body.Append("</ul>");
                }
            }

            body.Append(HowItWorks());
            body.Append(OwnerBlock(null));

            var ld = new List<object>
            {
                Breadcrumb(("Inicio", BaseUrl + "/"), ("Negocios", url)),
                new Dictionary<string, object?>
                {
                    ["@type"] = "ItemList",
                    ["name"] = "Ciudades con negocios que toman turnos online",
                    ["numberOfItems"] = cities.Count,
                    ["itemListElement"] = cities.Select((c, i) => new Dictionary<string, object?>
                    {
                        ["@type"] = "ListItem", ["position"] = i + 1, ["name"] = c.Name, ["url"] = BaseUrl + CityPath(c.Slug)
                    }).ToList()
                }
            };
            return new DirectoryPage(title, description, url, Shell(title, description, url, body.ToString(), ld));
        }

        public static DirectoryPage? City(IReadOnlyList<DirectoryBusiness> all, string citySlug)
        {
            var cities = Cities(all);
            var city = cities.FirstOrDefault(c => c.Slug == citySlug);
            if (city == null) return null;

            var groups = RubroGroups(city.Businesses);
            var named = groups.Where(g => g.Rubro != null).ToList();
            var n = city.Businesses.Count;
            var url = BaseUrl + CityPath(city.Slug);
            var only = OnlyRubro(groups);
            var canonical = only != null ? BaseUrl + RubroPath(city.Slug, only.Slug) : url;

            var rubroNames = named.Select(g => g.Rubro!.PluralLower).ToList();
            var title = FitTitle(
                rubroNames.Count > 0 ? $"Turnos online en {city.Name}: {ListText(rubroNames, rubroNames.Count)} | TurnosPro" : null,
                rubroNames.Count > 2 ? $"Turnos online en {city.Name}: {ListText(rubroNames, 2)} | TurnosPro" : null,
                rubroNames.Count > 1 ? $"Turnos online en {city.Name}: {ListText(rubroNames, 1)} | TurnosPro" : null,
                $"Turnos online en {city.Name} | TurnosPro",
                $"Turnos online en {city.Name}");

            var breakdown = JoinY(groups.Select(g => g.Rubro != null
                ? Count(g.Businesses.Count, g.Rubro.SingularLower, g.Rubro.PluralLower)
                : g.Businesses.Count == 1 ? "1 de otro rubro" : $"{g.Businesses.Count} de otros rubros").ToList());
            var first = city.Businesses[0];

            var description = n == 1
                ? FitDescription(
                    $"1 negocio de {city.Name} con turnos online: {first.Name}. Mirá sus servicios y su dirección y reservá desde el celular, sin llamar.",
                    $"1 negocio de {city.Name} con turnos online. Mirá sus servicios y su dirección y reservá desde el celular, sin llamar.")
                : FitDescription(
                    $"{n} negocios de {city.Name} con turnos online: {breakdown}. Mirá servicios y dirección, y reservá desde el celular, sin llamar.",
                    rubroNames.Count > 0 ? $"{n} negocios de {city.Name} con turnos online: {ListText(rubroNames, 3)}. Mirá servicios y dirección, y reservá desde el celular, sin llamar." : null,
                    rubroNames.Count > 2 ? $"{n} negocios de {city.Name} con turnos online: {ListText(rubroNames, 2)}. Mirá servicios y dirección, y reservá desde el celular, sin llamar." : null,
                    $"{n} negocios de {city.Name} con turnos online. Mirá servicios y dirección, y reservá desde el celular, sin llamar.");

            var body = new StringBuilder();
            body.Append($"<nav class=\"crumbs\"><a href=\"/\">TurnosPro</a> › <a href=\"{DirectoryPath}/\">Negocios</a> › <span>{H(city.Name)}</span></nav>");
            body.Append($"<h1>Turnos online en {H(city.Name)}</h1>");
            body.Append(n == 1
                ? $"<p class=\"lead\">Por ahora hay 1 negocio de {H(city.Name)} con turnos online en TurnosPro: {H(first.Name)}{(first.Rubro != null ? ", " + H(first.Rubro.SingularLower) : "")}. Mirá sus servicios y su dirección y reservá desde el celular, sin llamar ni mandar mensajes.</p>"
                : $"<p class=\"lead\">{n} negocios de {H(city.Name)} toman turnos online con TurnosPro: {H(breakdown)}. Elegí uno, mirá sus servicios y reservá desde el celular, sin llamar ni mandar mensajes.</p>");

            foreach (var g in groups)
            {
                var heading = g.Rubro != null
                    ? $"{g.Rubro.Plural} en {city.Name}"
                    : named.Count == 0 ? $"Negocios en {city.Name}" : $"Otros negocios en {city.Name}";
                body.Append($"<h2>{H(heading)}</h2><div class=\"grid\">");
                foreach (var b in g.Businesses) body.Append(Card(b, city.Name));
                body.Append("</div>");
                if (g.Rubro != null)
                    body.Append($"<p><a href=\"{RubroPath(city.Slug, g.Rubro.Slug)}\">Ver {H(g.Rubro.PluralLower)} en {H(city.Name)}</a></p>");
            }

            body.Append(HowItWorks());

            var others = cities.Where(c => c.Slug != city.Slug).Take(MaxRelatedLinks).ToList();
            if (others.Count > 0)
            {
                body.Append("<h2>Otras ciudades</h2><ul class=\"cols\">");
                foreach (var c in others)
                    body.Append($"<li><a href=\"{CityPath(c.Slug)}\">{H(c.Name)}</a> <span class=\"muted\">({Count(c.Businesses.Count, "negocio", "negocios")})</span></li>");
                body.Append("</ul>");
            }
            body.Append($"<p><a href=\"{DirectoryPath}/\">Ver todas las ciudades y rubros</a></p>");
            body.Append(OwnerBlock(null));

            var ld = new List<object>
            {
                Breadcrumb(("Inicio", BaseUrl + "/"), ("Negocios", DirectoryUrl + "/"), (city.Name, url)),
                BusinessList($"Negocios con turnos online en {city.Name}", city.Businesses, city.Name)
            };
            return new DirectoryPage(title, description, canonical, Shell(title, description, canonical, body.ToString(), ld));
        }

        public static DirectoryPage? CityRubro(IReadOnlyList<DirectoryBusiness> all, string citySlug, string rubroSlug)
        {
            var rubro = BusinessDirectoryRules.RubroBySlug(rubroSlug);
            if (rubro == null) return null;
            var cities = Cities(all);
            var city = cities.FirstOrDefault(c => c.Slug == citySlug);
            if (city == null) return null;
            var list = city.Businesses.Where(b => b.Rubro == rubro).ToList();
            if (list.Count == 0) return null;

            var n = list.Count;
            var url = BaseUrl + RubroPath(city.Slug, rubro.Slug);
            var where = $"{rubro.Plural} en {city.Name}";

            var title = FitTitle(
                $"{where}: reservá tu turno online | TurnosPro",
                $"{where}: reservá turno online | TurnosPro",
                $"{where}: turnos online | TurnosPro",
                $"{where} | TurnosPro",
                where);

            const string closing = "Mirá servicios y dirección, y reservá desde el celular, sin llamar ni mandar mensajes.";
            var description = FitDescription(
                $"{where} con turnos online: {NamesText(list, 3)}. {closing}",
                $"{where} con turnos online: {NamesText(list, 1)}. {closing}",
                $"{Count(n, rubro.SingularLower, rubro.PluralLower)} en {city.Name} con turnos online. {closing}",
                $"{where} con turnos online. Reservá desde el celular, sin llamar.");

            var body = new StringBuilder();
            body.Append($"<nav class=\"crumbs\"><a href=\"/\">TurnosPro</a> › <a href=\"{DirectoryPath}/\">Negocios</a> › <a href=\"{CityPath(city.Slug)}\">{H(city.Name)}</a> › <span>{H(rubro.Plural)}</span></nav>");
            body.Append($"<h1>{H(where)}: reservá tu turno online</h1>");
            body.Append(n == 1
                ? $"<p class=\"lead\">Por ahora hay 1 {H(rubro.SingularLower)} de {H(city.Name)} con turnos online en TurnosPro: {H(list[0].Name)}. Mirá sus servicios y su dirección y reservá desde el celular, sin llamar ni mandar mensajes.</p>"
                : $"<p class=\"lead\">{n} {H(rubro.PluralLower)} de {H(city.Name)} toman turnos online con TurnosPro. Mirá los servicios y la dirección de cada negocio y reservá desde el celular, sin llamar ni mandar mensajes.</p>");

            body.Append("<div class=\"grid\">");
            foreach (var b in list) body.Append(Card(b, city.Name));
            body.Append("</div>");

            body.Append(HowItWorks());

            var otherGroups = RubroGroups(city.Businesses).Where(g => g.Rubro != rubro).ToList();
            if (otherGroups.Count > 0)
            {
                body.Append($"<h2>Más negocios en {H(city.Name)}</h2><ul>");
                foreach (var g in otherGroups)
                {
                    body.Append(g.Rubro != null
                        ? $"<li><a href=\"{RubroPath(city.Slug, g.Rubro.Slug)}\">{H(g.Rubro.Plural)} en {H(city.Name)}</a> <span class=\"muted\">({g.Businesses.Count})</span></li>"
                        : $"<li><a href=\"{CityPath(city.Slug)}\">Otros negocios en {H(city.Name)}</a> <span class=\"muted\">({g.Businesses.Count})</span></li>");
                }
                body.Append($"<li><a href=\"{CityPath(city.Slug)}\">Todos los negocios de {H(city.Name)}</a></li></ul>");
            }

            var sameRubro = cities
                .Where(c => c.Slug != city.Slug)
                .Select(c => (City: c, Count: c.Businesses.Count(b => b.Rubro == rubro)))
                .Where(x => x.Count > 0)
                .OrderByDescending(x => x.Count)
                .Take(MaxRelatedLinks)
                .ToList();
            if (sameRubro.Count > 0)
            {
                body.Append($"<h2>{H(rubro.Plural)} en otras ciudades</h2><ul class=\"cols\">");
                foreach (var x in sameRubro)
                    body.Append($"<li><a href=\"{RubroPath(x.City.Slug, rubro.Slug)}\">{H(rubro.Plural)} en {H(x.City.Name)}</a> <span class=\"muted\">({x.Count})</span></li>");
                body.Append("</ul>");
            }
            body.Append($"<p><a href=\"{DirectoryPath}/\">Ver todas las ciudades y rubros</a></p>");
            body.Append(OwnerBlock(rubro));

            var ld = new List<object>
            {
                Breadcrumb(("Inicio", BaseUrl + "/"), ("Negocios", DirectoryUrl + "/"), (city.Name, BaseUrl + CityPath(city.Slug)), (rubro.Plural, url)),
                BusinessList($"{where} con turnos online", list, city.Name)
            };
            return new DirectoryPage(title, description, url, Shell(title, description, url, body.ToString(), ld));
        }

        /// <summary>Solo URLs con contenido: el índice, cada ciudad y cada rubro de cada ciudad que tenga negocios.</summary>
        public static string Sitemap(IReadOnlyList<DirectoryBusiness> all)
        {
            var sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
            var cities = Cities(all);
            if (cities.Count > 0) sb.Append($"  <url><loc>{DirectoryUrl}/</loc></url>\n");
            foreach (var city in cities)
            {
                var groups = RubroGroups(city.Businesses);
                // Si la ciudad tiene un solo rubro, su canónica es la página del rubro: va esa sola.
                if (OnlyRubro(groups) == null) sb.Append($"  <url><loc>{BaseUrl}{CityPath(city.Slug)}</loc></url>\n");
                foreach (var g in groups.Where(g => g.Rubro != null))
                    sb.Append($"  <url><loc>{BaseUrl}{RubroPath(city.Slug, g.Rubro!.Slug)}</loc></url>\n");
            }
            sb.Append("</urlset>\n");
            return sb.ToString();
        }

        public static string NotFound()
        {
            const string title = "Página no encontrada | TurnosPro";
            const string description = "Esa ciudad o ese rubro no está en el directorio de negocios de TurnosPro.";
            var body = $"<h1>No encontramos esa página</h1><p class=\"lead\">Esa ciudad o ese rubro no tiene negocios en el directorio. <a href=\"{DirectoryPath}/\">Ver todas las ciudades y rubros</a> o <a href=\"/\">volver a TurnosPro</a>.</p>";
            return Shell(title, description, DirectoryUrl + "/", body, Array.Empty<object>(), noindex: true);
        }

        // ---------- Fragmentos ----------

        private static string Card(DirectoryBusiness b, string cityName)
        {
            var sb = new StringBuilder("<article class=\"card\">");
            sb.Append($"<h3><a href=\"{H(b.BookingUrl)}\">{H(b.Name)}</a></h3>");
            if (b.Rubro != null) sb.Append($"<p class=\"tag\">{H(b.Rubro.Label)}</p>");
            sb.Append($"<p class=\"muted\">{H(string.IsNullOrWhiteSpace(b.Address) ? cityName : b.Address)}</p>");
            if (b.Services.Count > 0)
            {
                var extra = b.Services.Count - BusinessDirectoryRules.MaxServicesPerCard;
                sb.Append($"<p class=\"svc\"><strong>Servicios:</strong> {H(string.Join(" · ", b.Services.Take(BusinessDirectoryRules.MaxServicesPerCard)))}{(extra > 0 ? $" y {extra} más" : "")}</p>");
            }
            sb.Append($"<a class=\"cta\" href=\"{H(b.BookingUrl)}\">Reservar turno</a>");
            sb.Append("</article>");
            return sb.ToString();
        }

        // Los pasos son los de la página de reservas (src/frontend/src/pages/public/BookingPage.tsx):
        // Servicio, Profesional, Fecha y hora, Tus datos, Pago (solo si el servicio pide seña) y Confirmación.
        private static string HowItWorks() =>
            "<h2>Cómo se reserva</h2>" +
            "<p>Cada negocio de este directorio toma sus turnos con TurnosPro. Con «Reservar turno» entrás a su página de reservas: elegís el servicio, el profesional y el día y horario que te queden bien, completás tus datos y confirmás. Si el servicio pide seña, la pagás online antes de confirmar. No hace falta llamar ni esperar que te contesten.</p>";

        private static string OwnerBlock(Rubro? rubro)
        {
            var link = rubro?.LandingPath != null
                ? $"<a href=\"{rubro.LandingPath}\">Sistema de turnos para {H(rubro.PluralLower)}</a>"
                : "<a href=\"/\">Conocé TurnosPro</a>";
            return "<h2>¿Tenés un negocio que da turnos?</h2>" +
                   $"<p>Con TurnosPro tus clientes reservan online desde tu propio link, y tu negocio puede aparecer en este directorio cuando empieza a recibir turnos. Hay un plan Gratuito para siempre, sin tarjeta. {link}.</p>" +
                   "<p class=\"muted\">¿Tu negocio ya usa TurnosPro y no querés que aparezca acá? Lo apagás desde tu panel, en Configuración → General.</p>";
        }

        private static Dictionary<string, object?> BusinessList(string name, List<DirectoryBusiness> businesses, string cityName) => new()
        {
            ["@type"] = "ItemList",
            ["name"] = name,
            ["numberOfItems"] = businesses.Count,
            ["itemListElement"] = businesses.Select((b, i) => new Dictionary<string, object?>
            {
                ["@type"] = "ListItem",
                ["position"] = i + 1,
                ["item"] = new Dictionary<string, object?>
                {
                    ["@type"] = b.Rubro?.SchemaType ?? "LocalBusiness",
                    ["name"] = b.Name,
                    ["url"] = b.BookingUrl,
                    ["address"] = new Dictionary<string, object?>
                    {
                        ["@type"] = "PostalAddress",
                        ["streetAddress"] = string.IsNullOrWhiteSpace(b.Address) ? null : b.Address,
                        ["addressLocality"] = cityName,
                        ["addressCountry"] = b.Country
                    },
                    ["potentialAction"] = new Dictionary<string, object?> { ["@type"] = "ReserveAction", ["target"] = b.BookingUrl }
                }
            }).ToList()
        };

        private static Dictionary<string, object?> Breadcrumb(params (string Name, string Url)[] items) => new()
        {
            ["@type"] = "BreadcrumbList",
            ["itemListElement"] = items.Select((it, i) => new Dictionary<string, object?>
            {
                ["@type"] = "ListItem", ["position"] = i + 1, ["name"] = it.Name, ["item"] = it.Url
            }).ToList()
        };

        // ---------- Texto ----------

        private static string Count(int n, string singular, string plural) => $"{n} {(n == 1 ? singular : plural)}";

        /// <summary>"a", "a y b", "a, b y c".</summary>
        private static string JoinY(IReadOnlyList<string> items) => items.Count switch
        {
            0 => "",
            1 => items[0],
            _ => string.Join(", ", items.Take(items.Count - 1)) + " y " + items[^1]
        };

        /// <summary>Hasta <paramref name="max"/> ítems; si hay más, "a, b y más".</summary>
        private static string ListText(IReadOnlyList<string> items, int max) =>
            items.Count <= max ? JoinY(items) : string.Join(", ", items.Take(max)) + " y más";

        private static string NamesText(List<DirectoryBusiness> list, int max)
        {
            var names = list.Select(b => b.Name).ToList();
            return names.Count <= max
                ? JoinY(names)
                : string.Join(", ", names.Take(max)) + $" y {names.Count - max} más";
        }

        // Google corta el title cerca de los 60 caracteres: la primera variante que entra; si ninguna, la más corta.
        private static string FitTitle(params string?[] candidates)
        {
            var list = candidates.Where(c => !string.IsNullOrEmpty(c)).Select(c => c!).ToList();
            return list.FirstOrDefault(t => t.Length <= 60) ?? list.MinBy(t => t.Length)!;
        }

        // Meta description de hasta 160: la primera variante que entra; si ninguna, la más corta cortada en una palabra.
        private static string FitDescription(params string?[] candidates)
        {
            var list = candidates.Where(c => !string.IsNullOrEmpty(c)).Select(c => c!).ToList();
            var fit = list.FirstOrDefault(d => d.Length <= 160);
            if (fit != null) return fit;
            var cut = list.MinBy(d => d.Length)![..159];
            var space = cut.LastIndexOf(' ');
            return (space > 100 ? cut[..space] : cut).TrimEnd(',', ';', ':', '.', ' ') + "…";
        }

        // Alcanza para texto y para atributos entre comillas dobles, y deja las tildes como están (el title
        // que se mide es el que se escribe).
        private static string H(string? s) => string.IsNullOrEmpty(s)
            ? ""
            : s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;").Replace("'", "&#39;");

        // ---------- Plantilla ----------

        // Mismo papel, tinta y tipografías que el sitio (src/marketing-next/app/(lib)/theme.ts), sin frameworks.
        private static string Shell(string title, string description, string canonical, string body, IReadOnlyCollection<object> jsonLd, bool noindex = false)
        {
            var ld = jsonLd.Count == 0
                ? ""
                : "<script type=\"application/ld+json\">" + JsonSerializer.Serialize(
                    new Dictionary<string, object?> { ["@context"] = "https://schema.org", ["@graph"] = jsonLd }, JsonLdOptions) + "</script>";
            var robots = noindex ? "<meta name=\"robots\" content=\"noindex\">" : "";

            return $$"""
                <!DOCTYPE html>
                <html lang="es-AR">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>{{H(title)}}</title>
                <meta name="description" content="{{H(description)}}">
                {{robots}}
                <link rel="canonical" href="{{canonical}}">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="TurnosPro">
                <meta property="og:locale" content="es_AR">
                <meta property="og:title" content="{{H(title)}}">
                <meta property="og:description" content="{{H(description)}}">
                <meta property="og:url" content="{{canonical}}">
                <meta property="og:image" content="{{BaseUrl}}/og-turnospro.jpg">
                <link rel="icon" href="/favicon.ico">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&amp;family=Space+Grotesk:wght@400;500;600&amp;display=swap" rel="stylesheet">
                <style>
                :root{--paper:#F4EFE6;--soft:#FAF7F0;--ink:#171410;--ink-soft:#5C5347;--mute:#8C8275;--forest:#1E5E3F;--forest-deep:#143F2B;--coral:#E8593C;--amber:#F4C038}
                *{box-sizing:border-box}
                body{margin:0;background:var(--paper);color:var(--ink);font-family:"Space Grotesk",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.65;overflow-wrap:anywhere}
                a{color:var(--forest)}
                .top{border-bottom:1.5px solid var(--ink);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap}
                .brand{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:1.35rem;letter-spacing:-.02em;color:var(--ink);text-decoration:none}
                .brand i{color:var(--coral)}
                .top nav a{color:var(--ink);text-decoration:none;margin-left:18px;font-size:.92rem}
                .top nav a:first-child{margin-left:0}
                .wrap{max-width:920px;margin:0 auto;padding:28px 20px 64px}
                h1,h2,h3{font-family:Fraunces,Georgia,serif;font-weight:500;letter-spacing:-.025em;line-height:1.08}
                h1{font-size:2.3rem;margin:10px 0 14px}
                h2{font-size:1.55rem;margin:40px 0 12px}
                h3{font-size:1.2rem;margin:18px 0 6px}
                .lead{font-size:1.08rem;color:var(--ink-soft)}
                .muted{color:var(--mute);font-size:.9rem}
                .crumbs{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
                .crumbs a{color:var(--mute);text-decoration:none}
                .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
                .card{background:var(--soft);border:1.5px solid var(--ink);border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:4px}
                .card h3{margin:0}
                .card h3 a{color:var(--ink);text-decoration:none}
                .card h3 a:hover{text-decoration:underline}
                .card p{margin:0}
                .tag{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--coral)}
                .svc{font-size:.92rem;color:var(--ink-soft);padding-top:6px}
                .cta{display:inline-block;align-self:flex-start;margin-top:12px;background:var(--forest);color:var(--paper);font-weight:600;padding:10px 16px;border-radius:6px;text-decoration:none}
                .cta:hover{background:var(--forest-deep)}
                .cols{columns:2;padding-left:20px}
                .cols li{break-inside:avoid;margin-bottom:4px}
                footer{background:var(--ink);color:rgba(244,239,230,.7);padding:26px 20px;font-size:.88rem}
                footer a{color:var(--paper)}
                @media(max-width:600px){
                h1{font-size:1.8rem}
                .cols{columns:1}
                .top nav a{margin-left:12px}
                }
                </style>
                {{ld}}
                </head>
                <body>
                <header class="top"><a class="brand" href="/">Turnos<i>Pro</i></a><nav><a href="{{DirectoryPath}}/">Negocios</a><a href="/">Para tu negocio</a><a href="/blog/">Blog</a></nav></header>
                <main class="wrap">
                {{body}}
                </main>
                <footer>© {{DateTime.UtcNow.Year}} TurnosPro · Turnos online para peluquerías, barberías, centros de estética y consultorios · <a href="{{DirectoryPath}}/">Directorio de negocios</a> · <a href="/">Sistema de turnos para tu negocio</a> · <a href="/blog/">Blog</a> · <a href="/ayuda">Centro de ayuda</a></footer>
                </body>
                </html>
                """;
        }
    }
}
