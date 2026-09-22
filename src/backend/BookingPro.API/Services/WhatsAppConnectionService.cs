using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class WhatsAppConnectionService : IWhatsAppConnectionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<WhatsAppConnectionService> _logger;
        private readonly ITenantService _tenantService;
        private readonly HttpClient _http;
        private readonly string _baseUrl;
        private readonly string _apiKey;
        private readonly string _webhookUrl;
        private readonly IConfiguration _configuration;
        private readonly IServiceScopeFactory _scopeFactory;

        // Contactos que ya escribieron, por tenant, con TTL corto: los entrantes nuevos entran
        // en el próximo minuto y no se hace un DISTINCT por cada mensaje que sale.
        private static readonly object KnownLock = new();
        private static readonly Dictionary<Guid, (HashSet<string> suffixes, DateTime at)> KnownCache = new();
        private static readonly TimeSpan KnownTtl = TimeSpan.FromSeconds(60);

        public WhatsAppConnectionService(
            ApplicationDbContext context,
            ILogger<WhatsAppConnectionService> logger,
            IConfiguration configuration,
            IHttpClientFactory httpFactory,
            ITenantService tenantService,
            IServiceScopeFactory scopeFactory)
        {
            _context = context;
            _logger = logger;
            _tenantService = tenantService;
            _configuration = configuration;
            _scopeFactory = scopeFactory;
            _http = httpFactory.CreateClient();
            _baseUrl = configuration["EvolutionApi:BaseUrl"]?.TrimEnd('/') ?? "";
            _apiKey = configuration["EvolutionApi:ApiKey"] ?? "";
            _webhookUrl = $"{configuration["BaseUrl"]}/api/webhooks/evolution";
            _http.DefaultRequestHeaders.Add("apikey", _apiKey);
        }

        public async Task<ServiceResult<WhatsAppConnectResultDto>> ConnectAsync()
        {
            try
            {
                var tenant = _tenantService.GetCurrentTenant();
                if (tenant == null)
                    return ServiceResult<WhatsAppConnectResultDto>.Fail("No tenant context");

                var connection = await _context.TenantWhatsAppConnections.FirstOrDefaultAsync();
                var instanceName = $"app-{tenant.Subdomain}-{tenant.Id.ToString("N")[..8]}";

                if (connection == null)
                {
                    connection = new TenantWhatsAppConnection
                    {
                        TenantId = tenant.Id,
                        InstanceName = instanceName,
                        Status = "connecting"
                    };
                    _context.TenantWhatsAppConnections.Add(connection);
                }
                else
                {
                    instanceName = connection.InstanceName;
                    connection.Status = "connecting";
                    connection.UpdatedAt = DateTime.UtcNow;
                }

                // Create instance in Evolution API
                var createPayload = new
                {
                    instanceName,
                    integration = "WHATSAPP-BAILEYS",
                    qrcode = true
                };
                var createContent = new StringContent(
                    JsonSerializer.Serialize(createPayload),
                    Encoding.UTF8, "application/json");

                var createResponse = await _http.PostAsync($"{_baseUrl}/instance/create", createContent);
                if (!createResponse.IsSuccessStatusCode)
                {
                    var statusCode = (int)createResponse.StatusCode;
                    // 409 = instance already exists, that's fine
                    if (statusCode != 409)
                    {
                        var errorBody = await createResponse.Content.ReadAsStringAsync();
                        _logger.LogWarning("Evolution API create instance failed: {StatusCode} {Body}", statusCode, errorBody);
                    }
                }

                // Set webhook for connection status and message delivery updates
                if (!string.IsNullOrEmpty(_webhookUrl))
                {
                    try
                    {
                        var webhookPayload = new
                        {
                            url = _webhookUrl,
                            webhook_by_events = true,
                            webhook_base64 = false,
                            events = new[] { "CONNECTION_UPDATE", "MESSAGES_UPDATE", "MESSAGES_UPSERT" }
                        };
                        var webhookContent = new StringContent(
                            JsonSerializer.Serialize(webhookPayload),
                            Encoding.UTF8, "application/json");
                        await _http.PostAsync($"{_baseUrl}/webhook/set/{instanceName}", webhookContent);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to set Evolution API webhook for {Instance}", instanceName);
                    }
                }

                // Get QR code
                var qrResponse = await _http.GetAsync($"{_baseUrl}/instance/connect/{instanceName}");
                var qrBody = await qrResponse.Content.ReadAsStringAsync();

                string qrBase64 = "";
                if (qrResponse.IsSuccessStatusCode)
                {
                    try
                    {
                        var qrJson = JsonSerializer.Deserialize<JsonElement>(qrBody);
                        if (qrJson.TryGetProperty("base64", out var b64))
                        {
                            qrBase64 = b64.GetString() ?? "";
                        }
                        else if (qrJson.TryGetProperty("code", out var code))
                        {
                            qrBase64 = code.GetString() ?? "";
                        }
                    }
                    catch
                    {
                        _logger.LogWarning("Could not parse QR response: {Body}", qrBody);
                    }
                }

                await _context.SaveChangesAsync();

                return ServiceResult<WhatsAppConnectResultDto>.Ok(new WhatsAppConnectResultDto
                {
                    QrCodeBase64 = qrBase64,
                    InstanceName = instanceName,
                    Status = "connecting"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting WhatsApp instance");
                return ServiceResult<WhatsAppConnectResultDto>.Fail("Error connecting WhatsApp: " + ex.Message);
            }
        }

        public async Task<ServiceResult<WhatsAppStatusDto>> GetStatusAsync()
        {
            try
            {
                var connection = await _context.TenantWhatsAppConnections.FirstOrDefaultAsync();
                if (connection == null)
                {
                    return ServiceResult<WhatsAppStatusDto>.Ok(new WhatsAppStatusDto
                    {
                        Status = "pending"
                    });
                }

                // If not open, do a live check
                if (connection.Status != "open")
                {
                    try
                    {
                        var response = await _http.GetAsync(
                            $"{_baseUrl}/instance/fetchInstances?instanceName={connection.InstanceName}");
                        if (response.IsSuccessStatusCode)
                        {
                            var body = await response.Content.ReadAsStringAsync();
                            var instances = JsonSerializer.Deserialize<JsonElement>(body);

                            JsonElement instance;
                            if (instances.ValueKind == JsonValueKind.Array && instances.GetArrayLength() > 0)
                            {
                                instance = instances[0];
                            }
                            else
                            {
                                instance = instances;
                            }

                            var state = "close";
                            if (instance.TryGetProperty("instance", out var instObj) &&
                                instObj.TryGetProperty("state", out var stateVal))
                            {
                                state = stateVal.GetString() ?? "close";
                            }
                            else if (instance.TryGetProperty("state", out var directState))
                            {
                                state = directState.GetString() ?? "close";
                            }

                            connection.Status = state;
                            connection.UpdatedAt = DateTime.UtcNow;

                            if (state == "open")
                            {
                                // Try to extract owner phone and profile name
                                if (instance.TryGetProperty("instance", out var instInfo))
                                {
                                    if (instInfo.TryGetProperty("owner", out var owner))
                                    {
                                        connection.ConnectedPhone = owner.GetString();
                                    }
                                    if (instInfo.TryGetProperty("profileName", out var profileName))
                                    {
                                        connection.ProfileName = profileName.GetString();
                                    }
                                }
                                connection.ConnectedAt ??= DateTime.UtcNow;
                            }

                            await _context.SaveChangesAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error fetching Evolution API instance status");
                    }
                }

                return ServiceResult<WhatsAppStatusDto>.Ok(new WhatsAppStatusDto
                {
                    Status = connection.Status,
                    ConnectedPhone = connection.ConnectedPhone,
                    ProfileName = connection.ProfileName,
                    ConnectedAt = connection.ConnectedAt,
                    InstanceName = connection.InstanceName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting WhatsApp status");
                return ServiceResult<WhatsAppStatusDto>.Fail("Error getting status: " + ex.Message);
            }
        }

        public async Task<ServiceResult<string>> RefreshQrAsync()
        {
            try
            {
                var connection = await _context.TenantWhatsAppConnections.FirstOrDefaultAsync();
                if (connection == null)
                    return ServiceResult<string>.Fail("No WhatsApp connection found. Connect first.");

                var response = await _http.GetAsync($"{_baseUrl}/instance/connect/{connection.InstanceName}");
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return ServiceResult<string>.Fail("Failed to refresh QR code");

                string qrBase64 = "";
                try
                {
                    var json = JsonSerializer.Deserialize<JsonElement>(body);
                    if (json.TryGetProperty("base64", out var b64))
                        qrBase64 = b64.GetString() ?? "";
                    else if (json.TryGetProperty("code", out var code))
                        qrBase64 = code.GetString() ?? "";
                }
                catch
                {
                    _logger.LogWarning("Could not parse QR refresh response");
                }

                return ServiceResult<string>.Ok(qrBase64);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing QR");
                return ServiceResult<string>.Fail("Error refreshing QR: " + ex.Message);
            }
        }

        public async Task<ServiceResult<bool>> DisconnectAsync()
        {
            try
            {
                var connection = await _context.TenantWhatsAppConnections.FirstOrDefaultAsync();
                if (connection == null)
                    return ServiceResult<bool>.Fail("No WhatsApp connection found");

                // Logout from Evolution API
                await _http.DeleteAsync($"{_baseUrl}/instance/logout/{connection.InstanceName}");

                connection.Status = "close";
                connection.DisconnectedAt = DateTime.UtcNow;
                connection.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return ServiceResult<bool>.Ok(true, "WhatsApp disconnected");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting WhatsApp");
                return ServiceResult<bool>.Fail("Error disconnecting: " + ex.Message);
            }
        }

        public async Task<ServiceResult<string>> SendTextAsync(Guid tenantId, string phone, string text,
            WaSendKind kind = WaSendKind.Outbound, string section = "generic", bool respectQuietHours = false)
        {
            // Normalize phone: remove "whatsapp:", "+", spaces, dashes
            var normalizedPhone = (phone ?? string.Empty)
                .Replace("whatsapp:", "")
                .Replace("+", "")
                .Replace(" ", "")
                .Replace("-", "")
                .Trim();
            var digits = new string(normalizedPhone.Where(char.IsDigit).ToArray());
            if (digits.Length < 8)
                return Held("Número de WhatsApp inválido", "bad_number");

            // Variación de texto: "[[or]]" elige una versión por envío (anti-plantilla).
            text = WhatsAppLine.PickVariant(text ?? string.Empty);

            try
            {
                var connection = await _context.TenantWhatsAppConnections
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Status == "open");

                if (connection == null)
                    return Held("No active WhatsApp connection for this tenant", "not_connected");

                // Un reply va a alguien que acaba de escribirnos: conocido por definición.
                var known = true;

                if (kind == WaSendKind.Outbound)
                {
                    if (respectQuietHours)
                    {
                        var tz = await _context.Tenants.AsNoTracking()
                            .Where(t => t.Id == tenantId).Select(t => t.TimeZone).FirstOrDefaultAsync();
                        if (!TenantClock.WithinActiveHours(tz, _configuration))
                        {
                            _logger.LogInformation("WhatsApp {Section} retenido por horario (tenant {TenantId})", section, tenantId);
                            return Held("Fuera del horario del negocio: sale más tarde", "quiet_hours");
                        }
                    }

                    // Semáforo: a quien nunca escribió se le manda con cupo chico por día.
                    // Es el grupo que quema números.
                    known = await IsKnownContactAsync(tenantId, digits);
                    if (!known)
                    {
                        var limit = _configuration.GetValue<int?>("WhatsAppThrottle:UnknownDailyLimit") ?? 15;
                        var unknownRecent = await CountUnknownContactsLast24hAsync(tenantId);
                        if (unknownRecent >= limit)
                        {
                            _logger.LogWarning("WhatsApp {Section} retenido: cupo de contactos nuevos ({Limit}/24h) del tenant {TenantId}", section, limit, tenantId);
                            return Held($"Cupo diario de contactos nuevos alcanzado ({limit}/24h)", "throttled");
                        }
                    }
                }

                await EnsureGateSeededAsync(tenantId);

                var (allowed, reason) = await WhatsAppSendGate.TryAcquireAsync(tenantId, kind, _configuration);
                if (!allowed)
                {
                    _logger.LogWarning("WhatsApp {Section} retenido por el freno del tenant {TenantId}: {Reason}", section, tenantId, reason);
                    return Held(reason ?? "Freno de la línea del negocio", "throttled");
                }

                var payload = new { number = normalizedPhone, text };
                var content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8, "application/json");

                var response = await _http.PostAsync(
                    $"{_baseUrl}/message/sendText/{connection.InstanceName}", content);
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Evolution API sendText failed: {StatusCode} {Body}",
                        (int)response.StatusCode, body);
                    await LogOutboundAsync(tenantId, digits, kind, section, false, $"{(int)response.StatusCode} {body}", known);
                    return ServiceResult<string>.Fail("Failed to send message: " + body);
                }

                // Extract message ID from response
                string messageId = "";
                try
                {
                    var json = JsonSerializer.Deserialize<JsonElement>(body);
                    if (json.TryGetProperty("key", out var key) && key.TryGetProperty("id", out var id))
                    {
                        messageId = id.GetString() ?? "";
                    }
                }
                catch
                {
                    _logger.LogWarning("Could not parse sendText response");
                }

                await LogOutboundAsync(tenantId, digits, kind, section, true, null, known);
                return ServiceResult<string>.Ok(messageId, "Message sent");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp text to {Phone}", phone);
                await LogOutboundAsync(tenantId, digits, kind, section, false, ex.Message, true);
                return ServiceResult<string>.Fail("Error sending message: " + ex.Message);
            }
        }

        // ── Semáforo de contacto ──

        private static string Suffix(string digits) => digits.Length <= 8 ? digits : digits[^8..];

        private async Task<bool> IsKnownContactAsync(Guid tenantId, string digits)
        {
            HashSet<string>? suffixes = null;
            lock (KnownLock)
            {
                if (KnownCache.TryGetValue(tenantId, out var hit) && DateTime.UtcNow - hit.at < KnownTtl)
                    suffixes = hit.suffixes;
            }

            if (suffixes == null)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    // Nos escribió alguna vez = hay un entrante suyo. Sufijo de 8 dígitos para
                    // tolerar variantes de prefijo AR (549..., 54..., 0..., 15...).
                    var phones = await db.WhatsAppInboundEvents.AsNoTracking()
                        .Where(e => e.TenantId == tenantId)
                        .Select(e => e.Phone)
                        .Distinct()
                        .ToListAsync();
                    suffixes = phones.Where(p => p.Length >= 8).Select(Suffix).ToHashSet();
                    lock (KnownLock) KnownCache[tenantId] = (suffixes, DateTime.UtcNow);
                }
                catch (Exception ex)
                {
                    // Sin la lista tratamos a todos como conocidos: peor freno, pero nunca
                    // dejamos de mandar por no poder leerla.
                    _logger.LogWarning(ex, "No se pudo cargar los contactos conocidos del tenant {TenantId}", tenantId);
                    return true;
                }
            }

            return suffixes.Contains(Suffix(digits));
        }

        private async Task<int> CountUnknownContactsLast24hAsync(Guid tenantId)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var since = DateTime.UtcNow.AddHours(-24);
                // Contactos distintos, no mensajes: dos mensajes al mismo desconocido son un
                // solo contacto nuevo para WhatsApp.
                return await db.WhatsAppOutboundEvents.AsNoTracking()
                    .Where(e => e.TenantId == tenantId && e.Kind == "outbound" && !e.ToKnownContact && e.SentAt >= since)
                    .Select(e => e.Phone)
                    .Distinct()
                    .CountAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo contar los contactos nuevos del tenant {TenantId}", tenantId);
                return 0;
            }
        }

        // ── Freno: presupuesto que sobrevive a los deploys ──

        private async Task EnsureGateSeededAsync(Guid tenantId)
        {
            if (!WhatsAppSendGate.NeedsSeeding(tenantId)) return;
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var since = DateTime.UtcNow.AddHours(-24);
                var recent = await db.WhatsAppOutboundEvents.AsNoTracking()
                    .Where(e => e.TenantId == tenantId && e.SentAt >= since)
                    .Select(e => e.SentAt)
                    .ToListAsync();
                WhatsAppSendGate.Seed(tenantId, recent);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo reconstruir el presupuesto de WhatsApp del tenant {TenantId}", tenantId);
                WhatsAppSendGate.Seed(tenantId, Array.Empty<DateTime>());
            }
        }

        // ── Registro (scope propio: no pisa lo que el caller tiene a medias en su DbContext) ──

        private async Task LogOutboundAsync(Guid tenantId, string digits, WaSendKind kind, string section, bool ok, string? error, bool known)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.WhatsAppOutboundEvents.Add(new WhatsAppOutboundEvent
                {
                    TenantId = tenantId,
                    Phone = Clip(digits, 100)!,
                    Kind = kind == WaSendKind.Reply ? "reply" : "outbound",
                    Section = Clip(section, 40)!,
                    SentAt = DateTime.UtcNow,
                    Success = ok,
                    Error = Clip(error, 300),
                    ToKnownContact = known,
                });
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Perder el registro de un envío no puede frenar el envío que ya salió.
                _logger.LogWarning(ex, "No se pudo registrar el saliente de WhatsApp del tenant {TenantId}", tenantId);
            }
        }

        // Fallo con código de motivo: "throttled" / "quiet_hours" / "not_connected" / "bad_number".
        // ServiceResult<T> no expone Fail(message, reason).
        private static ServiceResult<string> Held(string message, string reason) =>
            new() { Success = false, Message = message, Reason = reason };

        private static string? Clip(string? s, int max) =>
            string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);

        public async Task<TenantWhatsAppConnection?> GetConnectionByTenantIdAsync(Guid tenantId)
        {
            return await _context.TenantWhatsAppConnections
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);
        }

        // Re-aplica la config de webhook incluyendo MESSAGES_UPSERT. Necesario para
        // instancias conectadas antes de que existiera el bot de confirmación.
        public async Task EnsureInboundWebhookAsync(Guid tenantId)
        {
            if (string.IsNullOrEmpty(_webhookUrl)) return;

            var connection = await GetConnectionByTenantIdAsync(tenantId);
            if (connection == null) return;

            try
            {
                var webhookPayload = new
                {
                    url = _webhookUrl,
                    webhook_by_events = true,
                    webhook_base64 = false,
                    events = new[] { "CONNECTION_UPDATE", "MESSAGES_UPDATE", "MESSAGES_UPSERT" }
                };
                var content = new StringContent(
                    JsonSerializer.Serialize(webhookPayload),
                    Encoding.UTF8, "application/json");
                await _http.PostAsync($"{_baseUrl}/webhook/set/{connection.InstanceName}", content);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to ensure inbound webhook for {Instance}", connection.InstanceName);
            }
        }
    }
}
