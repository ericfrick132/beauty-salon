using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    // --- DTOs ---
    public class PlatformWhatsAppStatusDto
    {
        public string Status { get; set; } = "disconnected"; // disconnected, connecting, open, close
        public string? ConnectedPhone { get; set; }
        public string? ProfileName { get; set; }
        public string? InstanceName { get; set; }
        public DateTime? ConnectedAt { get; set; }
    }

    public class PlatformWhatsAppConnectResultDto
    {
        public bool Success { get; set; }
        public string? QrCodeBase64 { get; set; }
        public string? Status { get; set; }
        public string? Error { get; set; }
    }

    public interface IPlatformWhatsAppService
    {
        Task<PlatformWhatsAppStatusDto> GetStatusAsync();
        Task<PlatformWhatsAppConnectResultDto> ConnectAsync();
        Task<PlatformWhatsAppConnectResultDto> RefreshQrAsync();
        Task<(bool Success, string? Message)> DisconnectAsync();
    }

    /// <summary>
    /// Manages the platform-level WhatsApp connection (the number that sends signup/login OTPs).
    /// Ported from GymHero's SuperAdminWhatsAppService. The instance name comes from
    /// EVOLUTION_API_INSTANCE so this screen controls the SAME instance the OTP sender uses.
    /// </summary>
    public class PlatformWhatsAppService : IPlatformWhatsAppService
    {
        private readonly ApplicationDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<PlatformWhatsAppService> _logger;

        public PlatformWhatsAppService(
            ApplicationDbContext db,
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            ILogger<PlatformWhatsAppService> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        // Evolution config — same keys the OTP sender (RegistrationController) reads.
        private string BaseUrl => (_config["EVOLUTION_API_BASE_URL"] ?? "http://64.227.3.140:8080").TrimEnd('/');
        private string ApiKey => _config["EVOLUTION_API_KEY"] ?? "";
        private string InstanceName => _config["EVOLUTION_API_INSTANCE"] ?? "turnospro-platform";

        private HttpClient CreateClient()
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.TryAddWithoutValidation("apikey", ApiKey);
            return client;
        }

        public async Task<PlatformWhatsAppStatusDto> GetStatusAsync()
        {
            var conn = await _db.PlatformWhatsAppConnections.FirstOrDefaultAsync();
            if (conn == null)
                return new PlatformWhatsAppStatusDto { Status = "disconnected", InstanceName = InstanceName };

            try
            {
                var liveStatus = await FetchInstanceStatusAsync(conn.InstanceName);
                if (liveStatus != null && liveStatus != conn.Status)
                {
                    conn.Status = liveStatus;
                    if (liveStatus == "open" && conn.ConnectedAt == null)
                    {
                        conn.ConnectedAt = DateTime.UtcNow;
                        await TryUpdateProfileAsync(conn);
                    }
                    else if (liveStatus == "close")
                    {
                        conn.DisconnectedAt = DateTime.UtcNow;
                    }
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch live status for platform instance {Instance}", conn.InstanceName);
            }

            return new PlatformWhatsAppStatusDto
            {
                Status = conn.Status,
                ConnectedPhone = conn.ConnectedPhone,
                ProfileName = conn.ProfileName,
                InstanceName = conn.InstanceName,
                ConnectedAt = conn.ConnectedAt
            };
        }

        public async Task<PlatformWhatsAppConnectResultDto> ConnectAsync()
        {
            var conn = await _db.PlatformWhatsAppConnections.FirstOrDefaultAsync();
            if (conn?.Status == "open")
                return new PlatformWhatsAppConnectResultDto { Success = true, Status = "open" };

            if (conn == null)
            {
                var createResult = await CreateInstanceAsync(InstanceName);
                if (!createResult.success && !createResult.alreadyExists)
                    return new PlatformWhatsAppConnectResultDto { Success = false, Error = createResult.error ?? "Failed to create instance" };

                conn = new PlatformWhatsAppConnection
                {
                    InstanceName = InstanceName,
                    InstanceToken = createResult.token,
                    Status = "connecting"
                };
                _db.PlatformWhatsAppConnections.Add(conn);
                await _db.SaveChangesAsync();
            }
            else
            {
                var createResult = await CreateInstanceAsync(conn.InstanceName);
                conn.Status = "connecting";
                if (!string.IsNullOrEmpty(createResult.token))
                    conn.InstanceToken = createResult.token;
                await _db.SaveChangesAsync();
            }

            var qrResult = await GetQrCodeAsync(conn.InstanceName);
            if (qrResult.success)
                return new PlatformWhatsAppConnectResultDto { Success = true, QrCodeBase64 = qrResult.qrBase64, Status = "connecting" };

            var liveStatus = await FetchInstanceStatusAsync(conn.InstanceName);
            if (liveStatus == "open")
            {
                conn.Status = "open";
                conn.ConnectedAt = DateTime.UtcNow;
                await TryUpdateProfileAsync(conn);
                await _db.SaveChangesAsync();
                return new PlatformWhatsAppConnectResultDto { Success = true, Status = "open" };
            }

            return new PlatformWhatsAppConnectResultDto { Success = false, Error = qrResult.error ?? "Failed to get QR code" };
        }

        public async Task<PlatformWhatsAppConnectResultDto> RefreshQrAsync()
        {
            var conn = await _db.PlatformWhatsAppConnections.FirstOrDefaultAsync();
            if (conn == null)
                return new PlatformWhatsAppConnectResultDto { Success = false, Error = "No hay conexión. Conectá primero." };

            var liveStatus = await FetchInstanceStatusAsync(conn.InstanceName);
            if (liveStatus == "open")
            {
                conn.Status = "open";
                conn.ConnectedAt ??= DateTime.UtcNow;
                await TryUpdateProfileAsync(conn);
                await _db.SaveChangesAsync();
                return new PlatformWhatsAppConnectResultDto { Success = true, Status = "open" };
            }

            var qrResult = await GetQrCodeAsync(conn.InstanceName);
            return new PlatformWhatsAppConnectResultDto
            {
                Success = qrResult.success,
                QrCodeBase64 = qrResult.qrBase64,
                Status = "connecting",
                Error = qrResult.error
            };
        }

        public async Task<(bool Success, string? Message)> DisconnectAsync()
        {
            var conn = await _db.PlatformWhatsAppConnections.FirstOrDefaultAsync();
            if (conn == null)
                return (true, "No hay conexión");

            try
            {
                var client = CreateClient();
                var resp = await client.DeleteAsync($"{BaseUrl}/instance/logout/{conn.InstanceName}");
                var body = await resp.Content.ReadAsStringAsync();
                _logger.LogInformation("Evolution logout for platform {Instance}: {Status} - {Body}", conn.InstanceName, resp.StatusCode, body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error logging out platform Evolution instance {Instance}", conn.InstanceName);
            }

            conn.Status = "close";
            conn.DisconnectedAt = DateTime.UtcNow;
            conn.ConnectedPhone = null;
            conn.ProfileName = null;
            conn.ConnectedAt = null;
            await _db.SaveChangesAsync();
            return (true, "WhatsApp desconectado");
        }

        // --- Evolution API helpers ---

        private async Task<(bool success, bool alreadyExists, string? token, string? error)> CreateInstanceAsync(string instanceName)
        {
            try
            {
                var client = CreateClient();
                var payload = new { instanceName, integration = "WHATSAPP-BAILEYS", qrcode = true };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var resp = await client.PostAsync($"{BaseUrl}/instance/create", content);
                var body = await resp.Content.ReadAsStringAsync();

                if (resp.IsSuccessStatusCode)
                {
                    string? token = null;
                    try
                    {
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("hash", out var hashProp))
                            token = hashProp.GetString();
                        else if (doc.RootElement.TryGetProperty("instance", out var instProp) &&
                                 instProp.TryGetProperty("instanceId", out var idProp))
                            token = idProp.GetString();
                    }
                    catch { }
                    _logger.LogInformation("Evolution platform instance created: {Name}", instanceName);
                    return (true, false, token, null);
                }
                if ((int)resp.StatusCode == 409)
                {
                    _logger.LogInformation("Evolution platform instance already exists: {Name}", instanceName);
                    return (true, true, null, null);
                }
                _logger.LogWarning("Evolution platform create failed: {Status} - {Body}", resp.StatusCode, body);
                return (false, false, null, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating platform Evolution instance {Name}", instanceName);
                return (false, false, null, ex.Message);
            }
        }

        private async Task<(bool success, string? qrBase64, string? error)> GetQrCodeAsync(string instanceName)
        {
            try
            {
                var client = CreateClient();
                var resp = await client.GetAsync($"{BaseUrl}/instance/connect/{instanceName}");
                var body = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Evolution platform connect/QR failed: {Status} - {Body}", resp.StatusCode, body);
                    return (false, null, body);
                }

                try
                {
                    using var doc = JsonDocument.Parse(body);
                    string? qr = null;
                    if (doc.RootElement.TryGetProperty("base64", out var b64Prop))
                        qr = b64Prop.GetString();
                    else if (doc.RootElement.TryGetProperty("qrcode", out var qrProp))
                        qr = qrProp.GetString();

                    if (!string.IsNullOrEmpty(qr))
                        return (true, qr, null);

                    if (doc.RootElement.TryGetProperty("instance", out var instProp) &&
                        instProp.TryGetProperty("state", out var stateProp) &&
                        stateProp.GetString() == "open")
                        return (false, null, "already_connected");
                }
                catch { }

                return (false, null, "No se pudo leer el QR de la respuesta");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting QR for platform Evolution instance {Name}", instanceName);
                return (false, null, ex.Message);
            }
        }

        private async Task<string?> FetchInstanceStatusAsync(string instanceName)
        {
            try
            {
                var client = CreateClient();
                var resp = await client.GetAsync($"{BaseUrl}/instance/fetchInstances?instanceName={instanceName}");
                if (!resp.IsSuccessStatusCode) return null;

                var body = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);

                JsonElement el;
                if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                    el = doc.RootElement[0];
                else if (doc.RootElement.ValueKind == JsonValueKind.Object)
                    el = doc.RootElement;
                else
                    return null;

                if (el.TryGetProperty("instance", out var instProp) &&
                    instProp.TryGetProperty("state", out var stateProp))
                    return stateProp.GetString();
                if (el.TryGetProperty("connectionStatus", out var connStatusProp))
                    return connStatusProp.GetString();
                if (el.TryGetProperty("state", out var directStateProp))
                    return directStateProp.GetString();
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching platform instance status for {Name}", instanceName);
                return null;
            }
        }

        private async Task TryUpdateProfileAsync(PlatformWhatsAppConnection conn)
        {
            try
            {
                var client = CreateClient();
                var resp = await client.GetAsync($"{BaseUrl}/instance/fetchInstances?instanceName={conn.InstanceName}");
                if (!resp.IsSuccessStatusCode) return;

                var body = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);

                JsonElement el;
                if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                    el = doc.RootElement[0];
                else if (doc.RootElement.ValueKind == JsonValueKind.Object)
                    el = doc.RootElement;
                else return;

                if (el.TryGetProperty("instance", out var instProp))
                {
                    if (instProp.TryGetProperty("owner", out var ownerProp))
                    {
                        var owner = ownerProp.GetString();
                        if (!string.IsNullOrEmpty(owner))
                            conn.ConnectedPhone = owner.Split('@')[0];
                    }
                    if (instProp.TryGetProperty("profileName", out var nameProp))
                        conn.ProfileName = nameProp.GetString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching profile for platform instance {Name}", conn.InstanceName);
            }
        }
    }
}
