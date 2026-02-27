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

        public WhatsAppConnectionService(
            ApplicationDbContext context,
            ILogger<WhatsAppConnectionService> logger,
            IConfiguration configuration,
            IHttpClientFactory httpFactory,
            ITenantService tenantService)
        {
            _context = context;
            _logger = logger;
            _tenantService = tenantService;
            _http = httpFactory.CreateClient();
            _baseUrl = configuration["EvolutionApi:BaseUrl"]?.TrimEnd('/') ?? "";
            _apiKey = configuration["EvolutionApi:ApiKey"] ?? "";
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

        public async Task<ServiceResult<string>> SendTextAsync(Guid tenantId, string phone, string text)
        {
            try
            {
                var connection = await _context.TenantWhatsAppConnections
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Status == "open");

                if (connection == null)
                    return ServiceResult<string>.Fail("No active WhatsApp connection for this tenant");

                // Normalize phone: remove "whatsapp:", "+", spaces, dashes
                var normalizedPhone = phone
                    .Replace("whatsapp:", "")
                    .Replace("+", "")
                    .Replace(" ", "")
                    .Replace("-", "")
                    .Trim();

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

                return ServiceResult<string>.Ok(messageId, "Message sent");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp text to {Phone}", phone);
                return ServiceResult<string>.Fail("Error sending message: " + ex.Message);
            }
        }

        public async Task<TenantWhatsAppConnection?> GetConnectionByTenantIdAsync(Guid tenantId)
        {
            return await _context.TenantWhatsAppConnections
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);
        }
    }
}
