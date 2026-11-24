using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Reglas del directorio público de negocios (/negocios): qué negocios quedan afuera por ser de prueba,
    /// de qué ciudad es cada uno y bajo qué rubro se publica. No toca la base: lo usa
    /// BusinessDirectoryController y se puede probar suelto.
    /// </summary>
    public static class BusinessDirectoryRules
    {
        /// <summary>Un negocio entra si tiene turnos no cancelados con fecha en esta ventana o más adelante (cuentas de prueba afuera).</summary>
        public const int RecentBookingDays = 90;

        /// <summary>
        /// Cuántos turnos no cancelados tiene que tener en la ventana. Con 1 alcanzaba el turno de prueba de
        /// alguien que se registró para mirar; 5 es un negocio que lo está usando.
        /// </summary>
        public const int MinRecentBookings = 5;

        public const int MaxServicesPerCard = 5;

        /// <summary>
        /// Países que se listan. Las páginas están escritas en voseo y hablan de "turnos" (Argentina y
        /// Uruguay); México y España usan "citas" y tuteo, y sus direcciones no pasan por la lista de
        /// provincias de abajo.
        /// </summary>
        public static readonly IReadOnlySet<string> ListedCountries =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "AR", "UY" };

        // ---------- Rubros ----------

        /// <param name="Slug">Tramo de la URL: /negocios/&lt;ciudad&gt;/&lt;slug&gt;/.</param>
        /// <param name="Plural">Para el title y el H1: "Peluquerías".</param>
        /// <param name="PluralLower">Dentro de una frase: "peluquerías".</param>
        /// <param name="SingularLower">Dentro de una frase: "peluquería".</param>
        /// <param name="Label">Etiqueta de la tarjeta de cada negocio: "Peluquería".</param>
        /// <param name="SchemaType">Tipo de schema.org del negocio.</param>
        /// <param name="LandingPath">Landing de TurnosPro para dueños de ese rubro, si existe.</param>
        public sealed record Rubro(
            string Slug,
            string Plural,
            string PluralLower,
            string SingularLower,
            string Label,
            string SchemaType,
            string? LandingPath);

        private static readonly Rubro Barberias = new("barberias", "Barberías", "barberías", "barbería", "Barbería", "HairSalon", "/sistema-de-turnos-para-barberias");
        private static readonly Rubro Peluquerias = new("peluquerias", "Peluquerías", "peluquerías", "peluquería", "Peluquería", "HairSalon", "/sistema-de-turnos-para-peluquerias");
        private static readonly Rubro Estetica = new("centros-de-estetica", "Centros de estética", "centros de estética", "centro de estética", "Centro de estética", "BeautySalon", "/sistema-de-turnos-para-centros-de-estetica");
        private static readonly Rubro Spa = new("spa", "Spas", "spas", "spa", "Spa", "DaySpa", "/sistema-de-turnos-para-spa");
        private static readonly Rubro Manicuras = new("manicuras", "Manicuras", "salones de manicura", "salón de manicura", "Manicura y uñas", "NailSalon", "/sistema-de-turnos-para-manicuras");
        private static readonly Rubro PeluqueriasCaninas = new("peluquerias-caninas", "Peluquerías caninas", "peluquerías caninas", "peluquería canina", "Peluquería canina", "LocalBusiness", null);
        private static readonly Rubro Consultorios = new("consultorios", "Consultorios", "consultorios", "consultorio", "Consultorio", "LocalBusiness", "/sistema-de-turnos-para-consultorios");
        private static readonly Rubro Depilacion = new("centros-de-depilacion", "Centros de depilación", "centros de depilación", "centro de depilación", "Centro de depilación", "BeautySalon", null);
        private static readonly Rubro Lavaderos = new("lavaderos-de-autos", "Lavaderos de autos", "lavaderos de autos", "lavadero de autos", "Lavadero de autos", "AutoWash", null);

        /// <summary>Todos los rubros con página propia, en el orden en que se muestran cuando empatan en cantidad.</summary>
        public static readonly IReadOnlyList<Rubro> Rubros = new[]
        {
            Peluquerias, Barberias, Estetica, Manicuras, Spa, PeluqueriasCaninas, Consultorios, Depilacion, Lavaderos
        };

        // Tenant.BusinessKind: lo que el dueño contestó en "¿Qué tipo de negocio tenés?" del onboarding
        // (src/frontend/src/config/onboardingConfig.tsx). "otro" no está: va a "Otros".
        private static readonly Dictionary<string, Rubro> ByBusinessKind = new(StringComparer.OrdinalIgnoreCase)
        {
            ["barberia"] = Barberias,
            ["salon_belleza"] = Peluquerias,
            ["estetica"] = Estetica,
            ["spa"] = Spa,
            ["manicuria"] = Manicuras,
            ["peluqueria_canina"] = PeluqueriasCaninas,
        };

        // Vertical.Code (ApplicationDbContextSeed). En producción hoy existen barbershop, peluqueria,
        // aesthetics y nailsalon; el resto solo está en el seed. "sports" (canchas) no tiene rubro acá.
        // "barbershop" no está a propósito: es el vertical que le queda a quien eligió el template "en blanco"
        // (el primero de la tabla), así que sin BusinessKind no se sabe si es una barbería. Va a "Otros".
        private static readonly Dictionary<string, Rubro> ByVerticalCode = new(StringComparer.OrdinalIgnoreCase)
        {
            ["peluqueria"] = Peluquerias,
            ["aesthetics"] = Estetica,
            ["nailsalon"] = Manicuras,
            ["depilation"] = Depilacion,
            ["consulting"] = Consultorios,
            ["carwash"] = Lavaderos,
        };

        /// <summary>
        /// Rubro con el que se publica el negocio, o null si va bajo "Otros" (sin página de rubro).
        /// Manda lo que el dueño declaró en el onboarding (BusinessKind), que es también lo que usa su página
        /// de reservas. El vertical solo se mira cuando no hay BusinessKind: el template "en blanco" le asigna
        /// al negocio el primer vertical de la tabla (TenantProvisioningService.ApplyTemplateAsync), así que
        /// hay salones con vertical "barbershop". Si el dueño eligió "Otro", va a "Otros" aunque tenga vertical.
        /// </summary>
        public static Rubro? ResolveRubro(string? businessKind, string? verticalCode)
        {
            if (!string.IsNullOrWhiteSpace(businessKind))
                return ByBusinessKind.TryGetValue(businessKind.Trim(), out var declared) ? declared : null;
            return !string.IsNullOrWhiteSpace(verticalCode) && ByVerticalCode.TryGetValue(verticalCode.Trim(), out var byVertical)
                ? byVertical
                : null;
        }

        public static Rubro? RubroBySlug(string? slug) =>
            Rubros.FirstOrDefault(r => string.Equals(r.Slug, slug, StringComparison.Ordinal));

        // ---------- Quién queda afuera ----------

        // Subdominios que nunca van al directorio aunque cumplan el resto (la demo de revisión de Apple y
        // Google está también en ReviewDemoTenants). Si alguno resulta ser un negocio real, sacarlo de acá.
        private static readonly HashSet<string> ExcludedSubdomains = new(StringComparer.OrdinalIgnoreCase)
        {
            "estudio-malva", "test", "demo", "prueba", "admin", "app", "www", "api"
        };

        // test, test1234, demo2, prueba-eric, mi-test, salon-demo: la palabra suelta o separada por guiones,
        // con o sin número. No matchea "testa" ni "de-moda".
        private static readonly Regex TestSubdomain = new(
            @"(^|-)(test|tests|testing|testeo|demo|demos|prueba|pruebas|probando|ejemplo|example|sample|fake|borrar|temp|tmp|qa|staging|dev)\d*(-|$)",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        // pruebaeric, pruebapeluqueria: ningún negocio real empieza con "prueba".
        private static readonly Regex TestSubdomainPrefix = new(@"^pruebas?[a-z0-9]", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        // Alta sin nombre de negocio: el subdominio queda "negocio" + 4 dígitos (RegistrationController).
        private static readonly Regex PlaceholderSubdomain = new(@"^negocio\d{3,}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static readonly Regex TestName = new(
            @"\b(test|tests|testing|testeo|prueba|pruebas|probando|demo|ejemplo|example|borrar|asd|asdf|asdasd|qwe|qwerty|xxx)\b",
            RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

        private static readonly Regex ValidSubdomain = new(@"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        // Mails del equipo (mismo criterio que HubMetricsController): no son clientes.
        private static readonly string[] TeamEmailDomains = { "@efcloud.tech", ReviewDemoTenants.OwnerEmailDomain };

        /// <summary>
        /// true si el negocio es de prueba, demo, del equipo o un alta que nunca cargó su nombre. El mail del
        /// dueño solo se usa para este filtro; no se publica.
        /// </summary>
        public static bool IsExcluded(string? subdomain, string? businessName, string? ownerEmail)
        {
            var sub = (subdomain ?? "").Trim().ToLowerInvariant();
            if (!ValidSubdomain.IsMatch(sub)) return true;
            if (ExcludedSubdomains.Contains(sub)) return true;
            if (TestSubdomain.IsMatch(sub) || TestSubdomainPrefix.IsMatch(sub) || PlaceholderSubdomain.IsMatch(sub)) return true;

            var name = (businessName ?? "").Trim();
            if (name.Length < 2) return true;
            // "Mi negocio" es el nombre provisorio de las altas por email que no completaron el onboarding.
            if (string.Equals(name, "Mi negocio", StringComparison.OrdinalIgnoreCase)) return true;
            if (TestName.IsMatch(name)) return true;

            var email = (ownerEmail ?? "").Trim();
            return TeamEmailDomains.Any(d => email.EndsWith(d, StringComparison.OrdinalIgnoreCase));
        }

        // ---------- Ciudad ----------

        private static readonly string[] ArProvinces =
        {
            "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa",
            "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
            "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
        };

        // Clave sin tildes ni mayúsculas → nombre bien escrito. Sirve para reconocer la provincia al final de
        // una dirección y para ponerle la tilde a "Neuquen" o "Cordoba" cuando son la ciudad.
        private static readonly Dictionary<string, string> ProvinceByPlain = BuildProvinces();

        private static Dictionary<string, string> BuildProvinces()
        {
            var map = ArProvinces.ToDictionary(Plain, p => p);
            map["bs as"] = "Buenos Aires";
            map["bsas"] = "Buenos Aires";
            return map;
        }

        // La ciudad de Buenos Aires escrita de sus varias formas: se publica como "Buenos Aires".
        private static readonly HashSet<string> CabaAliases = new()
        {
            "caba", "c a b a", "capital federal", "cap fed", "ciudad autonoma de buenos aires",
            "ciudad de buenos aires", "buenos aires capital", "autonomous city of buenos aires"
        };

        private static readonly HashSet<string> CountryNames = new()
        {
            "argentina", "republica argentina", "arg", "ar", "uruguay", "republica oriental del uruguay", "uy", "rou"
        };

        // Tramos que no son una localidad. Primero los que arrancan como una calle, un barrio o una división
        // administrativa; después los que tienen en cualquier lugar una palabra de local o de esquina
        // ("Primer piso", "San Martín y Belgrano", "San Martín s/n").
        private static readonly Regex NotAPlace = new(
            @"^(calle|av|avda|avenida|bv|boulevard|bulevar|diagonal|pje|pasaje|ruta|rn|rp|km|loc|departamento|of|paseo|shopping|barrio|bo|b|entre|casi|frente|zona|comuna|distrito|partido|municipio|cp|capital)( |$)" +
            @"|(^| )(piso|local|depto|dpto|dto|oficina|galeria|planta|pb|pa|esq|esquina|s n|y|e)( |$)" +
            @"|^(centro|microcentro)$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static readonly Regex AddressSeparators = new(@"[,;|()\r\n]|\s[-–—]\s", RegexOptions.Compiled);

        // "Plottier 8316", "Neuquén Q8300": código postal pegado a la localidad. Solo se saca de los tramos que
        // vienen después del primero, porque en el primero es la altura de la calle ("Belgrano 1234").
        private static readonly Regex TrailingPostalCode = new(@"\s+(cp\s*)?[a-z]?\d{4}[a-z]{0,3}$", RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

        // Ciudades con una fecha por nombre: "9 de Julio", "25 de Mayo". Son las únicas que llevan números.
        private static readonly Regex DateNamedCity = new(
            @"^\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
        private static readonly Regex ProvincePrefix = new(@"^(provincia|pcia|prov)( de)? ", RegexOptions.Compiled | RegexOptions.CultureInvariant);
        private static readonly Regex Spaces = new(@"\s+", RegexOptions.Compiled);

        /// <summary>Minúsculas, sin tildes y con guiones: "San Martín de los Andes" → "san-martin-de-los-andes".</summary>
        public static string Slugify(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            // Sin string.Normalize ni culturas: el contenedor de producción corre .NET en modo
            // "globalization-invariant" (sin ICU), donde Normalize no descompone nada y pedir la cultura
            // es-AR tira CultureNotFoundException. Las tildes se sacan con la tabla de Fold, que da lo mismo
            // con o sin ICU.
            var sb = new StringBuilder(value.Length);
            foreach (var ch in value)
            {
                // Tilde suelta de un texto que ya vino descompuesto (a + ´).
                if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
                var c = char.ToLowerInvariant(Fold(ch));
                sb.Append((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') ? c : '-');
            }
            var slug = sb.ToString();
            while (slug.Contains("--")) slug = slug.Replace("--", "-");
            return slug.Trim('-');
        }

        private static char Fold(char c) => c switch
        {
            'á' or 'à' or 'ä' or 'â' or 'ã' or 'å' or 'Á' or 'À' or 'Ä' or 'Â' or 'Ã' or 'Å' => 'a',
            'é' or 'è' or 'ë' or 'ê' or 'É' or 'È' or 'Ë' or 'Ê' => 'e',
            'í' or 'ì' or 'ï' or 'î' or 'Í' or 'Ì' or 'Ï' or 'Î' => 'i',
            'ó' or 'ò' or 'ö' or 'ô' or 'õ' or 'Ó' or 'Ò' or 'Ö' or 'Ô' or 'Õ' => 'o',
            'ú' or 'ù' or 'ü' or 'û' or 'Ú' or 'Ù' or 'Ü' or 'Û' => 'u',
            'ñ' or 'Ñ' => 'n',
            'ç' or 'Ç' => 'c',
            _ => c
        };

        private static string Plain(string value) => Slugify(value).Replace('-', ' ');

        /// <summary>
        /// Ciudad con la que se publica el negocio, o null si no se puede saber (ese negocio no entra).
        /// Usa el campo City si el negocio lo cargó; si no, la deduce de la dirección.
        /// </summary>
        public static string? EffectiveCity(string? city, string? address, string? country) =>
            CleanCity(city) ?? CityFromAddress(address, country);

        /// <summary>
        /// La dirección es texto libre. Formatos que se ven: "Uruguay 963, Plottier, Neuquen." (calle, ciudad,
        /// provincia), "Av. Argentina 1400, Neuquén" (calle, ciudad) y "Belgrano 50, Local 3, Cipolletti".
        /// Se descartan los tramos con números (calle, piso, código postal), los que arrancan como una calle
        /// o un local y el país; de lo que queda, la ciudad es el último tramo, salvo que sea una provincia y
        /// haya otro antes ("Plottier, Neuquén" → Plottier; "Av. Argentina 1400, Neuquén" → Neuquén).
        /// Sin coma ni otro separador no se adivina: el dueño puede cargar la ciudad en su panel.
        /// </summary>
        public static string? CityFromAddress(string? address, string? country)
        {
            if (string.IsNullOrWhiteSpace(address)) return null;

            var parts = AddressSeparators.Split(address)
                .Select(p => p.Trim().Trim('.', '-', ' '))
                .Where(p => p.Length > 0)
                .ToList();
            if (parts.Count < 2) return null;

            var isArgentina = string.IsNullOrWhiteSpace(country) || string.Equals(country.Trim(), "AR", StringComparison.OrdinalIgnoreCase);
            var places = new List<(string Text, bool IsProvince)>();
            for (var i = 0; i < parts.Count; i++)
            {
                var part = i == 0 ? parts[i] : TrailingPostalCode.Replace(parts[i], "").Trim();
                if (part.Any(char.IsDigit) && !DateNamedCity.IsMatch(part)) continue;
                var plain = Plain(part);
                if (plain.Length == 0 || CountryNames.Contains(plain)) continue;
                if (CabaAliases.Contains(plain)) return "Buenos Aires";
                if (NotAPlace.IsMatch(plain)) continue;
                var withoutPrefix = ProvincePrefix.Replace(plain, "");
                var isProvince = isArgentina && ProvinceByPlain.ContainsKey(withoutPrefix);
                // "Provincia de Neuquén" es solo la provincia, nunca la ciudad.
                if (isProvince && withoutPrefix != plain) continue;
                places.Add((part, isProvince));
            }
            if (places.Count == 0) return null;

            var pick = places[^1];
            if (pick.IsProvince && places.Count >= 2) pick = places[^2];
            return CleanCity(pick.Text);
        }

        /// <summary>
        /// Deja presentable el nombre de una ciudad, o null si no parece una ciudad: "plottier" → "Plottier",
        /// "NEUQUEN CAPITAL" → "Neuquén", "CABA" → "Buenos Aires", "Plottier, Neuquén" → "Plottier".
        /// </summary>
        public static string? CleanCity(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var value = Spaces.Replace(raw.Split(',')[0], " ").Trim().Trim('.', '-', ' ');
            if (value.Length < 2 || value.Length > 40) return null;
            if (DateNamedCity.IsMatch(value)) return TitleCase(value);
            if (value.Any(char.IsDigit)) return null;
            if (value.Any(c => !(char.IsLetter(c) || c == ' ' || c == '\'' || c == '.' || c == '-'))) return null;
            if (value.Count(char.IsLetter) < 2 || value.Split(' ').Length > 6) return null;

            var plain = Plain(value);
            if (CabaAliases.Contains(plain)) return "Buenos Aires";
            if (CountryNames.Contains(plain)) return null;

            // "Neuquén Capital", "Ciudad de Córdoba", "Mendoza ciudad" → la capital, con el nombre de la provincia.
            var core = plain;
            if (core.StartsWith("ciudad de ")) core = core["ciudad de ".Length..];
            if (core.EndsWith(" capital")) core = core[..^" capital".Length];
            if (core.EndsWith(" ciudad")) core = core[..^" ciudad".Length];
            if (ProvinceByPlain.TryGetValue(core, out var proper)) return proper;

            var letters = value.Where(char.IsLetter).ToList();
            return letters.All(char.IsLower) || letters.All(char.IsUpper) ? TitleCase(value) : value;
        }

        private static string TitleCase(string value)
        {
            var words = value.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            for (var i = 0; i < words.Length; i++)
            {
                var w = words[i];
                var afterDe = i > 0 && words[i - 1].Equals("de", StringComparison.OrdinalIgnoreCase);
                if (i > 0 && (w is "de" or "del" or "y" || (afterDe && w is "la" or "el" or "las" or "los"))) continue;
                words[i] = char.ToUpperInvariant(w[0]) + w[1..];
            }
            return string.Join(' ', words);
        }

        /// <summary>
        /// Varios negocios de la misma ciudad la escriben distinto ("Neuquen", "Neuquén"): se muestra la
        /// versión con más tildes y, si empatan, la más usada.
        /// </summary>
        public static string PickCityName(IEnumerable<string> variants) =>
            variants.GroupBy(v => v, StringComparer.Ordinal)
                .OrderByDescending(g => g.Key.Count(c => c > 127))
                .ThenByDescending(g => g.Count())
                .ThenBy(g => g.Key, StringComparer.Ordinal)
                .Select(g => g.Key)
                .First();
    }
}
