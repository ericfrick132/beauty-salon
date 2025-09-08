using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Enums;
using BookingPro.API.Models.Common;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using MercadoPago.Client.Preference;
using MercadoPago.Config;
using MercadoPago.Resource.Preference;
using MercadoPago.Client.Payment;
using MercadoPago.Resource.Payment;

namespace BookingPro.API.Services
{
    public class MercadoPagoService : IMercadoPagoService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MercadoPagoService> _logger;
        private readonly IConfiguration _configuration;
        private readonly ITenantProvider _tenantProvider;
        private readonly IMercadoPagoOAuthService _oauthService;

        public MercadoPagoService(
            ApplicationDbContext context,
            ILogger<MercadoPagoService> logger,
            IConfiguration configuration,
            ITenantProvider tenantProvider,
            IMercadoPagoOAuthService oauthService)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _tenantProvider = tenantProvider;
            _oauthService = oauthService;
        }

        public async Task<ServiceResult<CreatePaymentResponseDto>> CreatePaymentPreferenceAsync(CreatePaymentDto dto)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    // Para reservas públicas, obtener el tenant del subdominio
                    var tenant = await _context.Tenants
                        .FirstOrDefaultAsync(t => t.Subdomain == dto.Subdomain);
                    
                    if (tenant == null)
                        return ServiceResult<CreatePaymentResponseDto>.Fail("Negocio no encontrado");
                    
                    tenantId = tenant.Id;
                }

                // Obtener configuración de pago del tenant
                var paymentConfig = await _context.Set<PaymentConfiguration>()
                    .FirstOrDefaultAsync(pc => pc.TenantId == tenantId);

                if (paymentConfig == null || !paymentConfig.IsEnabled)
                {
                    return ServiceResult<CreatePaymentResponseDto>.Fail("Pagos no configurados para este negocio");
                }

                if (string.IsNullOrEmpty(paymentConfig.MercadoPagoAccessToken))
                {
                    return ServiceResult<CreatePaymentResponseDto>.Fail("Credenciales de MercadoPago no configuradas");
                }

                // Obtener la reserva
                var booking = await _context.Bookings
                    .Include(b => b.Service)
                    .Include(b => b.Customer)
                    .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.TenantId == tenantId);

                if (booking == null)
                {
                    return ServiceResult<CreatePaymentResponseDto>.Fail("Reserva no encontrada");
                }

                // Obtener el access token OAuth del tenant
                var tokenResult = await _oauthService.GetValidAccessTokenAsync(tenantId);
                if (!tokenResult.Success)
                {
                    // Si no hay OAuth, intentar con credenciales manuales (fallback)
                    if (!string.IsNullOrEmpty(paymentConfig.MercadoPagoAccessToken))
                    {
                        _logger.LogWarning("Using manual MercadoPago credentials for tenant {TenantId}. OAuth is recommended.", tenantId);
                        MercadoPagoConfig.AccessToken = paymentConfig.MercadoPagoAccessToken;
                    }
                    else
                    {
                        return ServiceResult<CreatePaymentResponseDto>.Fail("MercadoPago no está conectado. Por favor, conecte su cuenta de MercadoPago en Configuración.");
                    }
                }
                else
                {
                    // Usar el token OAuth
                    MercadoPagoConfig.AccessToken = tokenResult.Data;
                    _logger.LogInformation("Using OAuth access token for tenant {TenantId}", tenantId);
                }

                // Calcular monto a cobrar
                decimal amountToPay;
                if (dto.PaymentType == "deposit" && dto.Amount > 0)
                {
                    // Respetar monto explícito de seña si viene especificado
                    amountToPay = Math.Min(dto.Amount, booking.Service.Price);
                }
                else
                {
                    amountToPay = CalculateAmountToPay(
                        booking.Service.Price,
                        dto.PaymentType,
                        paymentConfig.MinimumDepositPercentage,
                        paymentConfig.MinimumDepositAmount);
                }

                // Crear preferencia de pago
                var preferenceRequest = new PreferenceRequest
                {
                    Items = new List<PreferenceItemRequest>
                    {
                        new PreferenceItemRequest
                        {
                            Id = booking.Id.ToString(),
                            Title = $"{booking.Service.Name}",
                            Description = $"Reserva para {booking.StartTime:dd/MM/yyyy HH:mm}",
                            Quantity = 1,
                            CurrencyId = paymentConfig.IsSandbox ? "ARS" : "ARS", // Ajustar según moneda del tenant
                            UnitPrice = amountToPay
                        }
                    },
                    Payer = new PreferencePayerRequest
                    {
                        Name = booking.Customer?.FirstName ?? dto.CustomerName,
                        Surname = booking.Customer?.LastName ?? "",
                        Email = booking.Customer?.Email ?? dto.CustomerEmail
                    },
                    BackUrls = new PreferenceBackUrlsRequest
                    {
                        Success = $"{_configuration["BaseUrl"]}/booking-confirmation?status=success&bookingId={booking.Id}",
                        Failure = $"{_configuration["BaseUrl"]}/booking-confirmation?status=failure&bookingId={booking.Id}",
                        Pending = $"{_configuration["BaseUrl"]}/booking-confirmation?status=pending&bookingId={booking.Id}"
                    },
                    AutoReturn = "approved",
                    NotificationUrl = $"{_configuration["BaseUrl"]}/api/webhooks/mercadopago/{tenantId}",
                    ExternalReference = booking.Id.ToString(),
                    Metadata = new Dictionary<string, object>
                    {
                        { "tenant_id", tenantId.ToString() },
                        { "booking_id", booking.Id.ToString() },
                        { "payment_type", dto.PaymentType }
                    }
                };

                var client = new PreferenceClient();
                Preference preference = await client.CreateAsync(preferenceRequest);

                // Crear registro de transacción
                var transaction = new PaymentTransaction
                {
                    TenantId = tenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    MercadoPagoPreferenceId = preference.Id,
                    Amount = amountToPay,
                    Currency = "ARS",
                    Status = PaymentTransactionStatus.Pending,
                    PaymentType = dto.PaymentType,
                    Description = $"Pago por {booking.Service.Name}",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        ServiceName = booking.Service.Name,
                        BookingDate = booking.StartTime,
                        CustomerName = $"{booking.Customer?.FirstName} {booking.Customer?.LastName}".Trim()
                    })
                };

                _context.Set<PaymentTransaction>().Add(transaction);
                await _context.SaveChangesAsync();

                var response = new CreatePaymentResponseDto
                {
                    PreferenceId = preference.Id,
                    InitPoint = preference.InitPoint,
                    SandboxInitPoint = preference.SandboxInitPoint,
                    TransactionId = transaction.Id,
                    Amount = amountToPay,
                    PublicKey = paymentConfig.MercadoPagoPublicKey
                };

                return ServiceResult<CreatePaymentResponseDto>.Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating MercadoPago payment preference");
                return ServiceResult<CreatePaymentResponseDto>.Fail("Error al crear la preferencia de pago");
            }
        }

        public async Task<ServiceResult<bool>> ProcessWebhookNotificationAsync(string tenantId, Dictionary<string, object> data)
        {
            try
            {
                var tenantGuid = Guid.Parse(tenantId);
                
                // Obtener configuración del tenant
                var paymentConfig = await _context.Set<PaymentConfiguration>()
                    .FirstOrDefaultAsync(pc => pc.TenantId == tenantGuid);

                if (paymentConfig == null)
                {
                    _logger.LogWarning("Payment configuration not found for tenant {TenantId}", tenantId);
                    return ServiceResult<bool>.Fail("Configuration not found");
                }

                // Obtener el access token OAuth del tenant
                var tokenResult = await _oauthService.GetValidAccessTokenAsync(tenantGuid);
                if (!tokenResult.Success)
                {
                    // Si no hay OAuth, intentar con credenciales manuales (fallback)
                    if (!string.IsNullOrEmpty(paymentConfig.MercadoPagoAccessToken))
                    {
                        _logger.LogWarning("Using manual MercadoPago credentials for webhook processing. OAuth is recommended.");
                        MercadoPagoConfig.AccessToken = paymentConfig.MercadoPagoAccessToken;
                    }
                    else
                    {
                        return ServiceResult<bool>.Fail("MercadoPago not connected");
                    }
                }
                else
                {
                    MercadoPagoConfig.AccessToken = tokenResult.Data;
                }

                // Procesar notificación según el tipo
                if (data.ContainsKey("type") && data["type"]?.ToString() == "payment")
                {
                    var paymentId = data["data"]?
                        .GetType()
                        .GetProperty("id")?
                        .GetValue(data["data"], null)?
                        .ToString();

                    if (!string.IsNullOrEmpty(paymentId))
                    {
                        await ProcessPaymentNotificationAsync(tenantGuid, long.Parse(paymentId));
                    }
                }

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing webhook notification");
                return ServiceResult<bool>.Fail("Error processing notification");
            }
        }

        private async Task ProcessPaymentNotificationAsync(Guid tenantId, long paymentId)
        {
            try
            {
                // Obtener información del pago desde MercadoPago
                var paymentClient = new PaymentClient();
                MercadoPago.Resource.Payment.Payment payment = await paymentClient.GetAsync(paymentId);

                // Buscar la transacción por external_reference (booking ID)
                var bookingId = Guid.Parse(payment.ExternalReference);
                var transaction = await _context.Set<PaymentTransaction>()
                    .FirstOrDefaultAsync(t => t.BookingId == bookingId && t.TenantId == tenantId);

                if (transaction != null)
                {
                    // Actualizar estado de la transacción
                    transaction.MercadoPagoPaymentId = payment.Id.ToString();
                    transaction.Status = MapMercadoPagoStatus(payment.Status);
                    transaction.PaymentMethod = payment.PaymentMethodId;
                    transaction.ProcessedAt = payment.DateApproved ?? DateTime.UtcNow;
                    transaction.ProcessorResponseCode = payment.Status;
                    transaction.ProcessorResponseMessage = payment.StatusDetail;
                    transaction.UpdatedAt = DateTime.UtcNow;

                    // Si el pago fue aprobado, actualizar la reserva
                    if (payment.Status == "approved")
                    {
                        var booking = await _context.Bookings
                            .FirstOrDefaultAsync(b => b.Id == bookingId);
                        
                        if (booking != null)
                        {
                            booking.Status = "confirmed";
                            booking.UpdatedAt = DateTime.UtcNow;
                            
                            // Aquí podrías enviar email de confirmación, SMS, etc.
                        }
                    }

                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment notification for payment {PaymentId}", paymentId);
                throw;
            }
        }

        private decimal CalculateAmountToPay(decimal servicePrice, string paymentType, decimal? depositPercentage, decimal? minimumDeposit)
        {
            if (paymentType == "full")
                return servicePrice;

            if (paymentType == "deposit")
            {
                decimal calculatedDeposit = servicePrice;
                
                if (depositPercentage.HasValue)
                {
                    calculatedDeposit = servicePrice * (depositPercentage.Value / 100);
                }
                
                if (minimumDeposit.HasValue && calculatedDeposit < minimumDeposit.Value)
                {
                    calculatedDeposit = minimumDeposit.Value;
                }

                return Math.Min(calculatedDeposit, servicePrice);
            }

            return servicePrice;
        }

        private PaymentTransactionStatus MapMercadoPagoStatus(string? mpStatus)
        {
            return mpStatus?.ToLower() switch
            {
                "approved" => PaymentTransactionStatus.Approved,
                "pending" => PaymentTransactionStatus.Pending,
                "authorized" => PaymentTransactionStatus.Pending,
                "in_process" => PaymentTransactionStatus.Processing,
                "in_mediation" => PaymentTransactionStatus.Pending,
                "rejected" => PaymentTransactionStatus.Rejected,
                "cancelled" => PaymentTransactionStatus.Cancelled,
                "refunded" => PaymentTransactionStatus.Refunded,
                "charged_back" => PaymentTransactionStatus.Refunded,
                _ => PaymentTransactionStatus.Pending
            };
        }

        public async Task<ServiceResult<PaymentConfiguration>> GetPaymentConfigurationAsync()
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                    return ServiceResult<PaymentConfiguration>.Fail("Tenant no encontrado");

                var config = await _context.Set<PaymentConfiguration>()
                    .FirstOrDefaultAsync(pc => pc.TenantId == tenantId);

                if (config == null)
                {
                    // Crear configuración por defecto
                    config = new PaymentConfiguration
                    {
                        TenantId = tenantId,
                        IsEnabled = false,
                        IsSandbox = true
                    };
                    _context.Set<PaymentConfiguration>().Add(config);
                    await _context.SaveChangesAsync();
                }

                return ServiceResult<PaymentConfiguration>.Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment configuration");
                return ServiceResult<PaymentConfiguration>.Fail("Error obteniendo configuración de pago");
            }
        }

        public async Task<ServiceResult<bool>> UpdatePaymentConfigurationAsync(UpdatePaymentConfigurationDto dto)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                    return ServiceResult<bool>.Fail("Tenant no encontrado");

                var config = await _context.Set<PaymentConfiguration>()
                    .FirstOrDefaultAsync(pc => pc.TenantId == tenantId);

                if (config == null)
                {
                    config = new PaymentConfiguration
                    {
                        TenantId = tenantId
                    };
                    _context.Set<PaymentConfiguration>().Add(config);
                }

                // Actualizar configuración
                config.MercadoPagoPublicKey = dto.MercadoPagoPublicKey;
                config.MercadoPagoAccessToken = dto.MercadoPagoAccessToken; // En producción, encriptar esto
                config.IsEnabled = dto.IsEnabled;
                config.IsSandbox = dto.IsSandbox;
                config.RequireImmediatePayment = dto.RequireImmediatePayment;
                config.MinimumDepositPercentage = dto.MinimumDepositPercentage;
                config.MinimumDepositAmount = dto.MinimumDepositAmount;
                config.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating payment configuration");
                return ServiceResult<bool>.Fail("Error actualizando configuración de pago");
            }
        }

        // OAuth Methods for MercadoPago Integration
        public async Task<ServiceResult<string>> GetAuthorizationUrlAsync(string tenantId)
        {
            try
            {
                var clientId = _configuration["MercadoPago:ClientId"];
                var redirectUri = _configuration["MercadoPago:RedirectUri"];

                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<string>.Fail("Invalid tenant ID");
                }

                // Generate state and PKCE, persist to OAuth state table
                var state = GenerateStateParameter(tenantGuid);
                var pkce = GeneratePkce();

                var oauthState = new MercadoPagoOAuthState
                {
                    TenantId = tenantGuid,
                    State = state,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                    CodeVerifier = pkce.CodeVerifier,
                    CodeChallenge = pkce.CodeChallenge,
                    CodeChallengeMethod = pkce.CodeChallengeMethod
                };
                _context.Set<MercadoPagoOAuthState>().Add(oauthState);
                await _context.SaveChangesAsync();

                var url = $"https://auth.mercadopago.com/authorization?client_id={Uri.EscapeDataString(clientId)}&response_type=code&platform_id=mp&redirect_uri={Uri.EscapeDataString(redirectUri)}&state={Uri.EscapeDataString(state)}&code_challenge={Uri.EscapeDataString(pkce.CodeChallenge)}&code_challenge_method={Uri.EscapeDataString(pkce.CodeChallengeMethod)}";
                oauthState.AuthorizationUrl = url;
                await _context.SaveChangesAsync();

                return ServiceResult<string>.Ok(url);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating authorization URL");
                return ServiceResult<string>.Fail("Error generating authorization URL");
            }
        }

        public async Task<ServiceResult<bool>> ExchangeCodeForTokenAsync(Guid tenantId, string code, string? codeVerifier = null)
        {
            try
            {
                var httpClient = new HttpClient();
                var clientId = _configuration["MercadoPago:ClientId"];
                var clientSecret = _configuration["MercadoPago:ClientSecret"];
                var redirectUri = _configuration["MercadoPago:RedirectUri"];
                
                var tokenRequest = new Dictionary<string, string>
                {
                    ["grant_type"] = "authorization_code",
                    ["client_id"] = clientId,
                    ["client_secret"] = clientSecret,
                    ["code"] = code,
                    ["redirect_uri"] = redirectUri
                };
                if (!string.IsNullOrWhiteSpace(codeVerifier))
                {
                    tokenRequest["code_verifier"] = codeVerifier;
                }
                
                var response = await httpClient.PostAsync(
                    "https://api.mercadopago.com/oauth/token",
                    new FormUrlEncodedContent(tokenRequest));
                
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var tokenData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
                    
                    // Save or update MercadoPago configuration
                    var mpConfig = await _context.MercadoPagoConfigurations
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId);
                        
                    if (mpConfig == null)
                    {
                        mpConfig = new MercadoPagoConfiguration
                        {
                            TenantId = tenantId,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.MercadoPagoConfigurations.Add(mpConfig);
                    }
                    
                    string GetStr(string key)
                    {
                        if (!tokenData.ContainsKey(key)) return string.Empty;
                        var el = tokenData[key];
                        return el.ValueKind == JsonValueKind.String
                            ? (el.GetString() ?? string.Empty)
                            : el.ValueKind == JsonValueKind.Number
                                ? (el.TryGetInt64(out var n) ? n.ToString() : el.GetRawText())
                                : el.GetRawText();
                    }

                    mpConfig.AccessToken = GetStr("access_token");
                    mpConfig.RefreshToken = GetStr("refresh_token");
                    mpConfig.PublicKey = GetStr("public_key");
                    mpConfig.UserId = GetStr("user_id");
                    mpConfig.IsActive = true;
                    mpConfig.ConnectedAt = DateTime.UtcNow;
                    mpConfig.UpdatedAt = DateTime.UtcNow;
                    
                    if (tokenData.ContainsKey("expires_in"))
                    {
                        var expiresIn = tokenData["expires_in"].GetInt32();
                        mpConfig.TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                    }
                    
                    await _context.SaveChangesAsync();
                    return ServiceResult<bool>.Ok(true);
                }
                // Surface MercadoPago error details to help troubleshooting
                var errorBody = await response.Content.ReadAsStringAsync();
                try
                {
                    var errJson = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(errorBody);
                    string? mpError = null;
                    if (errJson != null)
                    {
                        if (errJson.TryGetValue("error_description", out var errDesc)) mpError = errDesc.GetString();
                        else if (errJson.TryGetValue("message", out var msg)) mpError = msg.GetString();
                        else if (errJson.TryGetValue("error", out var err)) mpError = err.GetString();
                    }
                    var msgText = string.IsNullOrWhiteSpace(mpError) ? "Failed to exchange code for token" : $"Failed to exchange code for token: {mpError}";
                    _logger.LogError("MercadoPago token exchange failed. Status: {Status} Body: {Body}", (int)response.StatusCode, errorBody);
                    return ServiceResult<bool>.Fail(msgText);
                }
                catch
                {
                    _logger.LogError("MercadoPago token exchange failed. Status: {Status} Body: {Body}", (int)response.StatusCode, errorBody);
                    return ServiceResult<bool>.Fail("Failed to exchange code for token");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging code for token");
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> ProcessOAuthCallbackAsync(string code, string state)
        {
            try
            {
                Guid tenantId;
                string? codeVerifier = null;

                // New format: tenant_{tenantId}_{random}
                if (state.StartsWith("tenant_"))
                {
                    var parts = state.Split('_');
                    if (parts.Length >= 3 && Guid.TryParse(parts[1], out var parsedTenant))
                    {
                        tenantId = parsedTenant;
                        var oauthState = await _context.Set<MercadoPagoOAuthState>()
                            .IgnoreQueryFilters()
                            .FirstOrDefaultAsync(s => s.State == state && s.TenantId == tenantId);
                        if (oauthState == null)
                        {
                            return ServiceResult<bool>.Fail("Invalid or expired state");
                        }
                        if (oauthState.ExpiresAt < DateTime.UtcNow)
                        {
                            oauthState.IsExpired = true;
                            await _context.SaveChangesAsync();
                            return ServiceResult<bool>.Fail("State expired");
                        }
                        codeVerifier = oauthState.CodeVerifier;
                    }
                    else
                    {
                        return ServiceResult<bool>.Fail("Invalid state parameter");
                    }
                }
                else if (!Guid.TryParse(state, out tenantId))
                {
                    return ServiceResult<bool>.Fail("Invalid state parameter");
                }

                return await ExchangeCodeForTokenAsync(tenantId, code, codeVerifier);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing OAuth callback");
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        // Backward-compatible signature (interface requires this)
        public async Task<ServiceResult<bool>> ExchangeCodeForTokenAsync(Guid tenantId, string code)
            => await ExchangeCodeForTokenAsync(tenantId, code, null);

        private string GenerateStateParameter(Guid tenantId)
        {
            var randomBytes = new byte[16];
            RandomNumberGenerator.Fill(randomBytes);
            var randomString = Convert.ToBase64String(randomBytes).Replace("+", "").Replace("/", "").Replace("=", "")[..10];
            return $"tenant_{tenantId}_{randomString}";
        }

        private (string CodeVerifier, string CodeChallenge, string CodeChallengeMethod) GeneratePkce()
        {
            // Generate code_verifier (43-128 length), and S256 challenge
            var bytes = new byte[64];
            RandomNumberGenerator.Fill(bytes);
            var verifier = Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
            if (verifier.Length < 43) verifier = verifier.PadRight(43, '0');
            if (verifier.Length > 128) verifier = verifier[..128];

            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.ASCII.GetBytes(verifier));
            var challenge = Convert.ToBase64String(hash)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");

            return (verifier, challenge, "S256");
        }

        public async Task<ServiceResult<MercadoPagoConfiguration>> GetConfigurationAsync(string tenantId)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<MercadoPagoConfiguration>.Fail("Invalid tenant ID");
                }
                
                var config = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantGuid && c.IsActive);
                    
                if (config != null)
                {
                    return ServiceResult<MercadoPagoConfiguration>.Ok(config);
                }
                
                return ServiceResult<MercadoPagoConfiguration>.Ok(null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting MercadoPago configuration");
                return ServiceResult<MercadoPagoConfiguration>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> UpdateConfigurationAsync(string tenantId, UpdateMercadoPagoConfigDto dto)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<bool>.Fail("Invalid tenant ID");
                }
                
                var config = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantGuid);
                    
                if (config != null)
                {
                    config.PaymentExpirationMinutes = dto.PaymentExpirationMinutes;
                    config.UpdatedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    return ServiceResult<bool>.Ok(true);
                }
                
                return ServiceResult<bool>.Fail("Configuration not found");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating MercadoPago configuration");
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<PaymentLinkResponseDto>> CreatePaymentLinkAsync(string tenantId, CreatePaymentLinkDto dto)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<PaymentLinkResponseDto>.Fail("Invalid tenant ID");
                }
                
                var config = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantGuid && c.IsActive);
                    
                if (config == null || string.IsNullOrEmpty(config.AccessToken))
                {
                    return ServiceResult<PaymentLinkResponseDto>.Fail("MercadoPago not configured");
                }
                
                // Create preference using MercadoPago SDK or API
                // Calculate marketplace fee (5% commission for the platform)
                var marketplaceFee = dto.Amount * 0.05m;
                
                var preferenceRequest = new
                {
                    items = new[]
                    {
                        new
                        {
                            title = dto.Title,
                            description = dto.Description,
                            quantity = 1,
                            currency_id = "ARS",
                            unit_price = dto.Amount
                        }
                    },
                    payer = new
                    {
                        name = dto.CustomerName,
                        email = dto.CustomerEmail
                    },
                    payment_methods = new
                    {
                        excluded_payment_types = new[]
                        {
                            new { id = "ticket" },
                            new { id = "atm" }
                        }
                    },
                    marketplace_fee = marketplaceFee, // 5% commission for the platform
                    expires = true,
                    expiration_date_to = DateTime.UtcNow.AddMinutes(config.PaymentExpirationMinutes),
                    back_urls = new
                    {
                        success = $"{_configuration["FrontendUrl"]}/booking-success",
                        failure = $"{_configuration["FrontendUrl"]}/booking-failed",
                        pending = $"{_configuration["FrontendUrl"]}/booking-pending"
                    },
                    auto_return = "approved"
                };
                
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.AccessToken);
                
                var jsonContent = JsonSerializer.Serialize(preferenceRequest);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");
                
                var response = await httpClient.PostAsync(
                    "https://api.mercadopago.com/checkout/preferences",
                    content);
                    
                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    var preferenceResponse = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(jsonResponse);
                    
                    var responseDto = new PaymentLinkResponseDto
                    {
                        PaymentLink = preferenceResponse["init_point"].GetString() ?? "",
                        PreferenceId = preferenceResponse["id"].GetString() ?? "",
                        ExpiresAt = DateTime.UtcNow.AddMinutes(config.PaymentExpirationMinutes)
                    };
                    
                    return ServiceResult<PaymentLinkResponseDto>.Ok(responseDto);
                }
                
                return ServiceResult<PaymentLinkResponseDto>.Fail("Failed to create payment link");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment link");
                return ServiceResult<PaymentLinkResponseDto>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> RefreshTokenAsync(string tenantId)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<bool>.Fail("Invalid tenant ID");
                }
                
                var mpConfig = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantGuid);
                    
                if (mpConfig == null || string.IsNullOrEmpty(mpConfig.RefreshToken))
                {
                    return ServiceResult<bool>.Fail("No refresh token available");
                }
                
                var httpClient = new HttpClient();
                var tokenRequest = new Dictionary<string, string>
                {
                    ["grant_type"] = "refresh_token",
                    ["client_id"] = _configuration["MercadoPago:ClientId"],
                    ["client_secret"] = _configuration["MercadoPago:ClientSecret"],
                    ["refresh_token"] = mpConfig.RefreshToken
                };
                
                var response = await httpClient.PostAsync(
                    "https://api.mercadopago.com/oauth/token",
                    new FormUrlEncodedContent(tokenRequest));
                    
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var tokenData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
                    
                    mpConfig.AccessToken = tokenData["access_token"].GetString();
                    mpConfig.RefreshToken = tokenData["refresh_token"].GetString();
                    mpConfig.UpdatedAt = DateTime.UtcNow;
                    
                    if (tokenData.ContainsKey("expires_in"))
                    {
                        var expiresIn = tokenData["expires_in"].GetInt32();
                        mpConfig.TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                    }
                    
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation($"Successfully refreshed MercadoPago token for tenant {tenantId}");
                    return ServiceResult<bool>.Ok(true);
                }
                
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Failed to refresh token: {errorContent}");
                return ServiceResult<bool>.Fail("Failed to refresh token");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing MercadoPago token");
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> DisconnectAsync(string tenantId)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<bool>.Fail("Invalid tenant ID");
                }
                
                var mpConfig = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantGuid);
                    
                if (mpConfig != null)
                {
                    mpConfig.IsActive = false;
                    mpConfig.DisconnectedAt = DateTime.UtcNow;
                    mpConfig.UpdatedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    return ServiceResult<bool>.Ok(true);
                }
                
                return ServiceResult<bool>.Fail("Configuration not found");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting MercadoPago");
                return ServiceResult<bool>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<MercadoPagoConfigurationDto>> GetMercadoPagoConfigurationAsync(Guid tenantId)
        {
            try
            {
                var mpConfig = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId);
                    
                if (mpConfig == null)
                {
                    return ServiceResult<MercadoPagoConfigurationDto>.Fail("Configuration not found");
                }
                
                var dto = new MercadoPagoConfigurationDto
                {
                    Id = mpConfig.Id,
                    IsActive = mpConfig.IsActive,
                    ConnectedAt = mpConfig.ConnectedAt,
                    PaymentExpirationMinutes = mpConfig.PaymentExpirationMinutes,
                    UserEmail = mpConfig.UserId // You might want to fetch actual email from MP API
                };
                
                return ServiceResult<MercadoPagoConfigurationDto>.Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting MercadoPago configuration");
                return ServiceResult<MercadoPagoConfigurationDto>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<PaymentPreferenceResponseDto>> CreateDepositPreferenceAsync(
            Guid bookingId, 
            decimal amount, 
            string title, 
            string description)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                // Obtener el access token OAuth del tenant
                var tokenResult = await _oauthService.GetValidAccessTokenAsync(tenantId);
                if (!tokenResult.Success)
                {
                    // Verificar si hay configuración manual como fallback
                    var mpConfig = await _context.MercadoPagoConfigurations
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);
                    
                    if (mpConfig == null || string.IsNullOrEmpty(mpConfig.AccessToken))
                    {
                        return ServiceResult<PaymentPreferenceResponseDto>.Fail("MercadoPago no está conectado. Por favor, conecte su cuenta.");
                    }
                    
                    _logger.LogWarning("Using manual MercadoPago credentials for deposit preference. OAuth is recommended.");
                    MercadoPagoConfig.AccessToken = mpConfig.AccessToken;
                }
                else
                {
                    MercadoPagoConfig.AccessToken = tokenResult.Data;
                }
                
                var preferenceRequest = new PreferenceRequest
                {
                    Items = new List<PreferenceItemRequest>
                    {
                        new PreferenceItemRequest
                        {
                            Id = bookingId.ToString(),
                            Title = title,
                            Description = description,
                            Quantity = 1,
                            CurrencyId = "ARS",
                            UnitPrice = amount
                        }
                    },
                    ExternalReference = bookingId.ToString(),
                    NotificationUrl = $"{_configuration["BaseUrl"]}/api/webhooks/mercadopago/{tenantId}",
                    BackUrls = new PreferenceBackUrlsRequest
                    {
                        Success = $"{_configuration["FrontendUrl"]}/booking-confirmed",
                        Failure = $"{_configuration["FrontendUrl"]}/booking-failed",
                        Pending = $"{_configuration["FrontendUrl"]}/booking-pending"
                    },
                    AutoReturn = "approved"
                    // ExpirationDateTo se puede configurar si es necesario
                };
                
                var client = new PreferenceClient();
                var preference = await client.CreateAsync(preferenceRequest);
                
                // Generate deep link for mobile
                var deepLink = $"mercadopago://checkout/v1/redirect?preference_id={preference.Id}";
                
                var response = new PaymentPreferenceResponseDto
                {
                    Id = preference.Id,
                    InitPoint = preference.InitPoint,
                    SandboxInitPoint = preference.SandboxInitPoint,
                    DeepLink = deepLink,
                    ExpiresAt = preference.ExpirationDateTo ?? DateTime.UtcNow.AddMinutes(30) // Default 30 minutos
                };
                
                return ServiceResult<PaymentPreferenceResponseDto>.Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating deposit preference");
                return ServiceResult<PaymentPreferenceResponseDto>.Fail($"Error: {ex.Message}");
            }
        }

        public async Task<ServiceResult<DepositCalculationResultDto>> CalculateDepositAsync(
            Guid serviceId,
            Guid? customerId,
            DateTime bookingDate)
        {
            try
            {
                var service = await _context.Services
                    .FirstOrDefaultAsync(s => s.Id == serviceId);
                    
                if (service == null)
                {
                    return ServiceResult<DepositCalculationResultDto>.Fail("Service not found");
                }
                
                var result = new DepositCalculationResultDto
                {
                    RequiresDeposit = false,
                    Amount = 0,
                    Reason = "No deposit required"
                };
                
                if (!service.RequiresDeposit)
                {
                    return ServiceResult<DepositCalculationResultDto>.Ok(result);
                }
                
                // Check deposit policy
                bool shouldRequireDeposit = false;
                string reason = "";
                
                switch (service.DepositPolicy)
                {
                    case "AllCustomers":
                        shouldRequireDeposit = true;
                        reason = "Deposit required for all customers";
                        break;
                        
                    case "NewCustomersOnly":
                        if (customerId.HasValue)
                        {
                            var isNewCustomer = !await _context.Bookings
                                .AnyAsync(b => b.CustomerId == customerId.Value && 
                                             b.Status == "completed" &&
                                             b.CreatedAt < DateTime.UtcNow.AddDays(-30));
                            shouldRequireDeposit = isNewCustomer;
                            reason = isNewCustomer ? "Deposit required for new customers" : "Regular customer, no deposit required";
                        }
                        else
                        {
                            shouldRequireDeposit = true;
                            reason = "Deposit required for new customers";
                        }
                        break;
                        
                    case "AdvanceBookingOnly":
                        var daysInAdvance = (bookingDate - DateTime.UtcNow).Days;
                        shouldRequireDeposit = daysInAdvance >= (service.DepositAdvanceDays ?? 0);
                        reason = shouldRequireDeposit ? 
                            $"Deposit required for bookings {service.DepositAdvanceDays} days in advance" : 
                            "Booking too close, no deposit required";
                        break;
                }
                
                if (shouldRequireDeposit)
                {
                    decimal depositAmount = 0;
                    
                    if (service.DepositFixedAmount.HasValue)
                    {
                        depositAmount = service.DepositFixedAmount.Value;
                    }
                    else if (service.DepositPercentage.HasValue)
                    {
                        depositAmount = service.Price * (service.DepositPercentage.Value / 100);
                    }
                    
                    // Ensure deposit doesn't exceed service price
                    depositAmount = Math.Min(depositAmount, service.Price);
                    
                    result.RequiresDeposit = true;
                    result.Amount = depositAmount;
                    result.Reason = reason;
                }
                
                return ServiceResult<DepositCalculationResultDto>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating deposit");
                return ServiceResult<DepositCalculationResultDto>.Fail($"Error: {ex.Message}");
            }
        }
    }
}
