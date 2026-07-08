using System.Text;
using System.Text.Json;
using Anthropic;
using Anthropic.Models.Messages;
using BookingPro.API.Data;
using BookingPro.API.Models;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BookingPro.API.Services
{
    public interface IWhatsAppAgentService
    {
        bool IsEnabled { get; }

        /// <summary>
        /// Procesa un turno del cliente y devuelve el texto de respuesta a enviar por WhatsApp
        /// (o null si el asistente no está configurado). Resuelve el contexto de tenant por sí mismo.
        /// </summary>
        Task<string?> HandleMessageAsync(Guid tenantId, string phone, string text, CancellationToken ct = default);
    }

    /// <summary>
    /// Agente conversacional de WhatsApp para reservar turnos: responde servicios, precios y
    /// disponibilidad y crea reservas reales sobre IPublicService. Loop de tool-use de Claude
    /// (modelo Haiku por defecto, apto para chat de alto volumen). Se activa sólo para tenants
    /// con el add-on "ai_agent" (gating en WebhooksController). Memoria breve por (tenant, teléfono)
    /// en IMemoryCache — sin migraciones.
    /// </summary>
    public class WhatsAppAgentService : IWhatsAppAgentService
    {
        private const int MaxToolIterations = 6;
        private const int MaxHistoryTurns = 12;

        private readonly IPublicService _public;
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IMemoryCache _cache;
        private readonly ILogger<WhatsAppAgentService> _logger;
        private readonly string? _apiKey;
        private AnthropicClient? _client;

        public WhatsAppAgentService(
            IPublicService @public,
            ApplicationDbContext context,
            ITenantService tenantService,
            IHttpContextAccessor httpContextAccessor,
            IMemoryCache cache,
            IConfiguration config,
            ILogger<WhatsAppAgentService> logger)
        {
            _public = @public;
            _context = context;
            _tenantService = tenantService;
            _httpContextAccessor = httpContextAccessor;
            _cache = cache;
            _logger = logger;
            _apiKey = config["Anthropic:ApiKey"] ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
        }

        public bool IsEnabled => !string.IsNullOrWhiteSpace(_apiKey);

        public async Task<string?> HandleMessageAsync(Guid tenantId, string phone, string text, CancellationToken ct = default)
        {
            if (!IsEnabled) return null;

            // Contexto de tenant: el filtro global del DbContext lee HttpContext.Items["TenantId"];
            // el offset horario y el nombre salen de la fila del tenant.
            var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return null;

            var httpCtx = _httpContextAccessor.HttpContext;
            if (httpCtx != null) httpCtx.Items["TenantId"] = tenantId.ToString();
            _tenantService.SetCurrentTenant(new TenantInfo
            {
                Id = tenantId,
                BusinessName = tenant.BusinessName ?? "",
                TimeZone = tenant.TimeZone ?? "-3",
            });

            _client ??= new AnthropicClient { ApiKey = _apiKey };

            var cacheKey = $"waagent:{tenantId}:{phone}";
            var history = _cache.TryGetValue(cacheKey, out List<Turn>? cached) && cached != null ? cached : new List<Turn>();
            var messages = BuildMessages(history);
            messages.Add(new MessageParam { Role = Role.User, Content = text });

            var tools = BuildTools();
            var offsetH = int.TryParse(tenant.TimeZone, out var oh) && oh >= -12 && oh <= 14 ? oh : -3;
            var system = BuildSystemPrompt(tenant.BusinessName ?? "el comercio", DateTime.UtcNow.AddHours(offsetH));

            string finalText = "";
            try
            {
                for (var i = 0; i < MaxToolIterations; i++)
                {
                    var response = await _client.Messages.Create(new MessageCreateParams
                    {
                        Model = Model.ClaudeHaiku4_5,
                        MaxTokens = 1024,
                        System = system,
                        Tools = tools,
                        Messages = messages,
                    }, cancellationToken: ct);

                    var textBlocks = response.Content.Select(b => b.Value).OfType<TextBlock>().Select(t => t.Text).ToList();
                    var toolUses = response.Content.Select(b => b.Value).OfType<ToolUseBlock>().ToList();

                    var assistantContent = new List<ContentBlockParam>();
                    foreach (var t in textBlocks) assistantContent.Add(new TextBlockParam { Text = t });
                    foreach (var tu in toolUses) assistantContent.Add(new ToolUseBlockParam { ID = tu.ID, Name = tu.Name, Input = tu.Input });
                    if (assistantContent.Count > 0)
                        messages.Add(new MessageParam { Role = Role.Assistant, Content = assistantContent });

                    if (toolUses.Count == 0)
                    {
                        finalText = string.Join("\n", textBlocks).Trim();
                        break;
                    }

                    var results = new List<ContentBlockParam>();
                    foreach (var tu in toolUses)
                    {
                        string result;
                        try { result = await ExecuteToolAsync(tu.Name, tu.Input, tenant, phone, ct); }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "WA agent: error ejecutando herramienta {Tool}", tu.Name);
                            result = "Error al ejecutar la acción.";
                        }
                        results.Add(new ToolResultBlockParam { ToolUseID = tu.ID, Content = result });
                    }
                    messages.Add(new MessageParam { Role = Role.User, Content = results });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "WA agent: error en el loop (tenant {TenantId})", tenantId);
            }

            if (string.IsNullOrWhiteSpace(finalText))
                finalText = "Perdoná, no pude procesar eso. ¿Me lo escribís de otra forma?";

            history.Add(new Turn("user", text));
            history.Add(new Turn("assistant", finalText));
            if (history.Count > MaxHistoryTurns) history = history.Skip(history.Count - MaxHistoryTurns).ToList();
            _cache.Set(cacheKey, history, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromMinutes(30) });

            return finalText;
        }

        // ---------------- system prompt ----------------

        private static readonly string[] DiasSemana = { "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado" };

        private static string BuildSystemPrompt(string businessName, DateTime today)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"Sos el asistente de {businessName} por WhatsApp. Ayudás a los clientes a consultar servicios y precios, ver disponibilidad y RESERVAR turnos. Respondé en español rioplatense, breve y claro (es WhatsApp).");
            sb.AppendLine($"Hoy es {DiasSemana[(int)today.DayOfWeek]} {today:dd/MM/yyyy}.");
            sb.AppendLine("REGLAS:");
            sb.AppendLine("- Cuando el cliente diga una fecha relativa ('hoy', 'mañana', 'pasado', 'el sábado', 'la semana que viene'), convertila VOS a la fecha exacta (formato YYYY-MM-DD) tomando como referencia la fecha de hoy. NO le pidas que la escriba en números; interpretala vos.");
            sb.AppendLine("- Si el cliente no elige profesional y le da igual ('el que esté', 'cualquiera'), elegí vos uno y seguí sin trabarte.");
            sb.AppendLine("- Cuando haya varias opciones (servicio, profesional, horario), ofrecé SIEMPRE opciones numeradas (1, 2, 3...) y pedí que respondan con el número.");
            sb.AppendLine("- Para reservar necesitás, EN ESTE ORDEN: 1) servicio, 2) profesional, 3) día, 4) horario, 5) nombre del cliente. Pedí lo que falte de a un paso por vez y no muestres el resumen final hasta tener los 5 datos. Usá list_services, list_professionals y check_availability.");
            sb.AppendLine("- ANTES de crear la reserva, mostrá el resumen (servicio, profesional, día, hora, a nombre de quién) y pedí confirmación. Recién con el 'sí' llamás create_booking.");
            sb.AppendLine("- NUNCA afirmes que reservaste algo si no llamaste create_booking EN ESTE TURNO y recibiste un resultado que empieza con 'OK'. Si no, decí la verdad.");
            sb.AppendLine("- No muestres identificadores técnicos (GUIDs) al cliente; usá nombres y números.");
            sb.AppendLine("- Si te piden algo que no podés hacer con las herramientas (reprogramar, cancelar un turno existente, etc.), decílo con sinceridad y sugerí que respondan al mensaje de confirmación o llamen al comercio.");
            return sb.ToString();
        }

        // ---------------- tools ----------------

        private static List<ToolUnion> BuildTools()
        {
            return new List<ToolUnion>
            {
                Tool("list_services",
                    "Lista los servicios activos del comercio con su precio y duración. Usalo para que el cliente elija uno por número.",
                    "{ \"type\": \"object\", \"properties\": {}, \"additionalProperties\": false }"),
                Tool("list_professionals",
                    "Lista los profesionales que atienden. Usalo para que el cliente elija con quién se atiende.",
                    "{ \"type\": \"object\", \"properties\": {}, \"additionalProperties\": false }"),
                Tool("check_availability",
                    "Devuelve los horarios disponibles de un profesional para un servicio en una fecha. Si no sabés el profesional y hay uno solo, se usa ese.",
                    "{ \"type\": \"object\", \"properties\": { \"serviceId\": { \"type\": \"string\" }, \"date\": { \"type\": \"string\", \"description\": \"fecha en formato YYYY-MM-DD\" }, \"professionalId\": { \"type\": \"string\" } }, \"required\": [\"serviceId\", \"date\"], \"additionalProperties\": false }"),
                Tool("create_booking",
                    "Crea la reserva real. Llamalo sólo después de confirmar con el cliente. La reserva queda a nombre del cliente y con su número de WhatsApp.",
                    "{ \"type\": \"object\", \"properties\": { \"serviceId\": { \"type\": \"string\" }, \"professionalId\": { \"type\": \"string\" }, \"date\": { \"type\": \"string\", \"description\": \"YYYY-MM-DD\" }, \"time\": { \"type\": \"string\", \"description\": \"HH:mm\" }, \"customerName\": { \"type\": \"string\" } }, \"required\": [\"serviceId\", \"professionalId\", \"date\", \"time\", \"customerName\"], \"additionalProperties\": false }"),
            };
        }

        private static Tool Tool(string name, string description, string schemaJson)
        {
            var schema = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(schemaJson)!;
            var props = schema.TryGetValue("properties", out var p)
                ? JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(p.GetRawText())!
                : new Dictionary<string, JsonElement>();
            var required = schema.TryGetValue("required", out var r)
                ? r.EnumerateArray().Select(x => x.GetString()!).ToList()
                : new List<string>();
            return new Tool
            {
                Name = name,
                Description = description,
                InputSchema = new() { Properties = props, Required = required },
            };
        }

        // ---------------- tool execution ----------------

        private async Task<string> ExecuteToolAsync(string name, IReadOnlyDictionary<string, JsonElement> input, Tenant tenant, string phone, CancellationToken ct)
        {
            switch (name)
            {
                case "list_services":
                {
                    var services = (await _public.GetServicesAsync()).ToList();
                    if (services.Count == 0) return "El comercio no tiene servicios cargados.";
                    var list = services.Select((s, i) => new
                    {
                        n = i + 1,
                        id = s.Id.ToString(),
                        name = s.Name,
                        price = s.Price,
                        durationMin = s.DurationMinutes,
                        desc = s.Description,
                    });
                    return JsonSerializer.Serialize(list);
                }
                case "list_professionals":
                {
                    var pros = (await _public.GetEmployeesAsync()).ToList();
                    if (pros.Count == 0) return "El comercio no tiene profesionales cargados.";
                    var list = pros.Select((e, i) => new { n = i + 1, id = e.Id.ToString(), name = e.Name });
                    return JsonSerializer.Serialize(list);
                }
                case "check_availability":
                {
                    if (!Guid.TryParse(GetStr(input, "serviceId"), out var serviceId))
                        return "Falta el servicio. Usá list_services y pedile al cliente que elija uno.";
                    if (!TryParseDate(GetStr(input, "date"), out var date))
                        return "Fecha inválida. Pedila en formato día/mes (la convertís a YYYY-MM-DD).";

                    var proId = GetStr(input, "professionalId");
                    if (!Guid.TryParse(proId, out var professionalId))
                    {
                        var pros = (await _public.GetEmployeesAsync()).ToList();
                        if (pros.Count == 1) professionalId = pros[0].Id;
                        else return "Necesito saber el profesional. Usá list_professionals y pedile al cliente que elija.";
                    }

                    var slots = (await _public.GetAvailableTimeSlotsAsync(professionalId, date, serviceId))
                        .Where(s => !s.StartsWith("PAST:"))
                        .ToList();
                    if (slots.Count == 0) return $"No hay horarios disponibles para el {date:dd/MM}. Probá otro día.";
                    return JsonSerializer.Serialize(new { date = date.ToString("yyyy-MM-dd"), slots });
                }
                case "create_booking":
                {
                    if (!Guid.TryParse(GetStr(input, "serviceId"), out var serviceId)) return "Falta el servicio.";
                    if (!Guid.TryParse(GetStr(input, "professionalId"), out var professionalId)) return "Falta el profesional.";
                    if (!TryParseDate(GetStr(input, "date"), out var date)) return "Fecha inválida.";
                    if (!TimeSpan.TryParse(GetStr(input, "time"), out var ts)) return "Hora inválida (usá HH:mm).";
                    var customerName = GetStr(input, "customerName");
                    if (string.IsNullOrWhiteSpace(customerName)) return "Falta el nombre del cliente.";

                    var service = await _public.GetServiceByIdAsync(serviceId);
                    if (service == null) return "El servicio elegido no existe o no está activo.";
                    var professional = await _public.GetEmployeeByIdAsync(professionalId);
                    if (professional == null) return "El profesional elegido no existe o no atiende.";

                    // El comercio trabaja en hora local (offset del tenant). El sistema guarda StartTime en UTC:
                    // localSlot = fecha + hora local ; StartTime(UTC) = localSlot - offset.
                    var offset = ParseOffsetHours(tenant.TimeZone);
                    var localSlot = date.Date.Add(ts);
                    var startUtc = localSlot.AddHours(-offset);
                    var endUtc = startUtc.AddMinutes(service.DurationMinutes);

                    try
                    {
                        var booking = await _public.CreatePublicBookingAsync(new CreatePublicBookingDto
                        {
                            CustomerName = customerName,
                            CustomerPhone = phone,
                            EmployeeId = professionalId,
                            ServiceId = serviceId,
                            StartTime = startUtc,
                            EndTime = endUtc,
                            Notes = "Reserva creada por el Agente de WhatsApp",
                        });
                        return $"OK. Reserva confirmada: {service.Name} con {professional.Name} el {localSlot:dd/MM} a las {localSlot:HH:mm}, a nombre de {customerName}.";
                    }
                    catch (InvalidOperationException ex)
                    {
                        return $"No se pudo reservar: {ex.Message}. Ofrecé otro horario (usá check_availability).";
                    }
                }
                default:
                    return "Herramienta no implementada.";
            }
        }

        // ---------------- helpers ----------------

        private static int ParseOffsetHours(string? tz)
        {
            // Los tenants guardan el offset como string ("-3"). Si viene un nombre IANA u otro
            // formato no numérico, caemos a -3 (Argentina), que es el default del sistema.
            if (!string.IsNullOrWhiteSpace(tz) && int.TryParse(tz, out var off) && off >= -12 && off <= 14)
                return off;
            return -3;
        }

        private static bool TryParseDate(string s, out DateTime date)
        {
            date = default;
            if (DateTime.TryParse(s, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var d))
            {
                date = DateTime.SpecifyKind(d.Date, DateTimeKind.Unspecified);
                return true;
            }
            return false;
        }

        private static string GetStr(IReadOnlyDictionary<string, JsonElement> input, string key) =>
            input.TryGetValue(key, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

        private record Turn(string Role, string Text);

        private static List<MessageParam> BuildMessages(List<Turn> history)
        {
            var list = new List<MessageParam>();
            foreach (var t in history)
                list.Add(new MessageParam { Role = t.Role == "assistant" ? Role.Assistant : Role.User, Content = t.Text });
            return list;
        }
    }
}
