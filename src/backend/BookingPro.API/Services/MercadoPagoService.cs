using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Enums;
using BookingPro.API.Models.Common;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Utilities;
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
        private readonly IWhatsAppConnectionService _whatsApp;
        private readonly IStripeConnectService _stripeConnect;

        public MercadoPagoService(
            ApplicationDbContext context,
            ILogger<MercadoPagoService> logger,
            IConfiguration configuration,
            ITenantProvider tenantProvider,
            IMercadoPagoOAuthService oauthService,
            IWhatsAppConnectionService whatsApp,
            IStripeConnectService stripeConnect)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _tenantProvider = tenantProvider;
            _oauthService = oauthService;
            _whatsApp = whatsApp;
            _stripeConnect = stripeConnect;
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

                // Obtener configuración opcional de pagos (para mínimos/clave pública)
                var paymentConfig = await _context.Set<PaymentConfiguration>()
                    .FirstOrDefaultAsync(pc => pc.TenantId == tenantId);

                // Obtener la reserva
                var booking = await _context.Bookings
                    .Include(b => b.Service)
                    .Include(b => b.Customer)
                    .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.TenantId == tenantId);

                if (booking == null)
                {
                    return ServiceResult<CreatePaymentResponseDto>.Fail("Reserva no encontrada");
                }

                // España no tiene Mercado Pago: el link de la seña es un Checkout de Stripe en la cuenta
                // conectada del negocio (mismo camino que la reserva pública y mismo webhook de confirmación).
                if (await UsesStripeDepositsAsync(tenantId))
                {
                    var stripeAmount = dto.PaymentType == "deposit" && dto.Amount > 0 ? dto.Amount : booking.Service.Price;
                    var checkout = await _stripeConnect.CreateDepositCheckoutAsync(tenantId, booking.Id, stripeAmount,
                        dto.CustomerEmail, dto.Origin, string.IsNullOrEmpty(dto.PaymentType) ? "deposit" : dto.PaymentType);
                    if (!checkout.Success || checkout.Data == null)
                        return ServiceResult<CreatePaymentResponseDto>.Fail(checkout.Message ?? "No se pudo crear el link de pago");
                    return ServiceResult<CreatePaymentResponseDto>.Ok(new CreatePaymentResponseDto
                    {
                        PreferenceId = checkout.Data.SessionId,
                        InitPoint = checkout.Data.Url,
                        TransactionId = checkout.Data.TransactionId,
                        Amount = checkout.Data.Amount,
                    });
                }

                // Obtener el access token OAuth del tenant
                string accessToken;
                var tokenResult = await _oauthService.GetValidAccessTokenAsync(tenantId);
                if (!tokenResult.Success)
                {
                    // Si no hay OAuth, intentar con credenciales manuales (fallback)
                    if (paymentConfig != null && !string.IsNullOrEmpty(paymentConfig.MercadoPagoAccessToken))
                    {
                        _logger.LogWarning("Using manual MercadoPago credentials for tenant {TenantId}. OAuth is recommended.", tenantId);
                        accessToken = paymentConfig.MercadoPagoAccessToken;
                    }
                    else
                    {
                        return ServiceResult<CreatePaymentResponseDto>.Fail("MercadoPago no está conectado. Por favor, conecte su cuenta de MercadoPago en Configuración.");
                    }
                }
                else
                {
                    // Usar el token OAuth
                    accessToken = tokenResult.Data;
                    _logger.LogInformation("Using OAuth access token for tenant {TenantId}", tenantId);
                }

                // Detect test tokens (TEST- prefix) and warn
                var isTestToken = accessToken.StartsWith("TEST-", StringComparison.OrdinalIgnoreCase);
                if (isTestToken)
                {
                    _logger.LogWarning("Tenant {TenantId} is using a TEST MercadoPago token. Payments will only work with test accounts.", tenantId);
                }

                // Use per-request options instead of static MercadoPagoConfig.AccessToken for thread safety
                var requestOptions = new MercadoPago.Client.RequestOptions { AccessToken = accessToken };

                // Validación: evitar que el comprador sea la misma cuenta del comercio (collector).
                // El email del comercio vive en la config OAuth (AccountEmail); la tabla legacy
                // mercadopago_configurations sólo aplica a tenants con credenciales manuales.
                try
                {
                    var oauthAccount = await _context.Set<MercadoPagoOAuthConfiguration>()
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);
                    var merchantEmail = oauthAccount?.AccountEmail?.Trim().ToLowerInvariant();
                    if (string.IsNullOrEmpty(merchantEmail))
                    {
                        var legacyConfig = await _context.MercadoPagoConfigurations
                            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);
                        merchantEmail = legacyConfig?.UserEmail?.Trim().ToLowerInvariant();
                    }
                    var buyerEmail = (booking.Customer?.Email ?? dto.CustomerEmail ?? string.Empty).Trim().ToLowerInvariant();
                    if (!string.IsNullOrEmpty(merchantEmail) && !string.IsNullOrEmpty(buyerEmail) && merchantEmail == buyerEmail)
                    {
                        return ServiceResult<CreatePaymentResponseDto>.Fail("No se puede pagar con la misma cuenta del comercio. Cerrá sesión en MercadoPago e iniciá con otra cuenta.");
                    }
                }
                catch { /* ignore non-critical check */ }

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
                        paymentConfig?.MinimumDepositPercentage,
                        paymentConfig?.MinimumDepositAmount);
                }

                // Moneda del cobro: la de la cuenta de MP conectada (ARS en Argentina, UYU, MXN...).
                var chargeCurrency = await ResolveChargeCurrencyAsync(tenantId);

                // Enforce MP minimum amount (en la moneda del cobro) to avoid disabled checkout
                var minimumAmount = MinimumChargeAmount(chargeCurrency);
                if (amountToPay < minimumAmount)
                {
                    amountToPay = minimumAmount;
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
                            CurrencyId = chargeCurrency,
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
                        Success = $"{(_configuration["FrontendUrl"] ?? _configuration["BaseUrl"] ?? string.Empty).TrimEnd('/')}/booking-confirmation?status=success&bookingId={booking.Id}",
                        Failure = $"{(_configuration["FrontendUrl"] ?? _configuration["BaseUrl"] ?? string.Empty).TrimEnd('/')}/booking-confirmation?status=failure&bookingId={booking.Id}",
                        Pending = $"{(_configuration["FrontendUrl"] ?? _configuration["BaseUrl"] ?? string.Empty).TrimEnd('/')}/booking-confirmation?status=pending&bookingId={booking.Id}"
                    },
                    AutoReturn = "approved",
                    NotificationUrl = $"{_configuration["BaseUrl"]}/api/webhooks/mercadopago/{tenantId}",
                    ExternalReference = booking.Id.ToString(),
                    Metadata = new Dictionary<string, object>
                    {
                        { "tenant_id", tenantId.ToString() },
                        { "booking_id", booking.Id.ToString() },
                        { "payment_type", dto.PaymentType },
                        { "origin", dto.Origin ?? "web" }
                    }
                };

                var client = new PreferenceClient();
                Preference preference = await client.CreateAsync(preferenceRequest, requestOptions);

                // Crear registro de transacción
                var transaction = new PaymentTransaction
                {
                    TenantId = tenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    MercadoPagoPreferenceId = preference.Id,
                    Amount = amountToPay,
                    Currency = chargeCurrency,
                    Status = PaymentTransactionStatus.Pending,
                    PaymentType = dto.PaymentType,
                    Description = $"Pago por {booking.Service.Name}",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        ServiceName = booking.Service.Name,
                        BookingDate = booking.StartTime,
                        CustomerName = $"{booking.Customer?.FirstName} {booking.Customer?.LastName}".Trim(),
                        // Marca de origen: el webhook solo le avisa al cliente por WhatsApp si es "whatsapp_bot".
                        Origin = dto.Origin
                    })
                };

                _context.Set<PaymentTransaction>().Add(transaction);
                await _context.SaveChangesAsync();

                // Intentar obtener public key
                string? publicKey = paymentConfig?.MercadoPagoPublicKey;
                if (string.IsNullOrEmpty(publicKey))
                {
                    var mpConfig = await _context.MercadoPagoConfigurations
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId);
                    if (mpConfig != null && !string.IsNullOrEmpty(mpConfig.PublicKey))
                    {
                        publicKey = mpConfig.PublicKey;
                    }
                }
                if (string.IsNullOrEmpty(publicKey))
                {
                    // Conexión por credenciales (Uruguay/México): la Public Key la pegó el negocio junto al token.
                    publicKey = await _context.Set<MercadoPagoOAuthConfiguration>()
                        .IgnoreQueryFilters()
                        .AsNoTracking()
                        .Where(c => c.TenantId == tenantId && c.IsActive && c.PublicKey != null)
                        .Select(c => c.PublicKey)
                        .FirstOrDefaultAsync();
                }

                var response = new CreatePaymentResponseDto
                {
                    PreferenceId = preference.Id,
                    InitPoint = preference.InitPoint,
                    SandboxInitPoint = preference.SandboxInitPoint,
                    TransactionId = transaction.Id,
                    Amount = amountToPay,
                    PublicKey = publicKey
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

                // Obtener el access token OAuth del tenant
                string webhookAccessToken;
                var tokenResult = await _oauthService.GetValidAccessTokenAsync(tenantGuid);
                if (!tokenResult.Success)
                {
                    // Si no hay OAuth, intentar con credenciales manuales (fallback)
                    if (!string.IsNullOrEmpty(paymentConfig?.MercadoPagoAccessToken))
                    {
                        _logger.LogWarning("Using manual MercadoPago credentials for webhook processing. OAuth is recommended.");
                        webhookAccessToken = paymentConfig!.MercadoPagoAccessToken;
                    }
                    else
                    {
                        return ServiceResult<bool>.Fail("MercadoPago not connected");
                    }
                }
                else
                {
                    webhookAccessToken = tokenResult.Data;
                }
                var webhookRequestOptions = new MercadoPago.Client.RequestOptions { AccessToken = webhookAccessToken };

                // Procesar notificación según el tipo
                if (data.ContainsKey("type") && data["type"]?.ToString() == "payment")
                {
                    var paymentId = ExtractDataId(data["data"]);

                    if (!string.IsNullOrEmpty(paymentId) && long.TryParse(paymentId, out var paymentIdNumber))
                    {
                        await ProcessPaymentNotificationAsync(tenantGuid, paymentIdNumber, webhookRequestOptions);
                    }
                    else
                    {
                        _logger.LogWarning("Webhook de pago sin data.id legible para el tenant {TenantId}", tenantGuid);
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

        private async Task ProcessPaymentNotificationAsync(Guid tenantId, long paymentId, MercadoPago.Client.RequestOptions requestOptions)
        {
            try
            {
                // Obtener información del pago desde MercadoPago
                var paymentClient = new PaymentClient();
                MercadoPago.Resource.Payment.Payment payment = await paymentClient.GetAsync(paymentId, requestOptions);

                // Skip subscription payments — handled separately by SubscriptionService.
                if (!string.IsNullOrEmpty(payment.ExternalReference) && payment.ExternalReference.StartsWith("SUB-"))
                {
                    _logger.LogInformation("Skipping subscription payment {PaymentId} in booking webhook handler", paymentId);
                    return;
                }

                // Buscar la transacción por external_reference (booking ID)
                if (!Guid.TryParse(payment.ExternalReference, out var bookingId))
                {
                    _logger.LogWarning("Payment {PaymentId} has non-Guid external_reference '{Ref}' — cannot map to booking", paymentId, payment.ExternalReference);
                    return;
                }
                var transaction = await _context.Set<PaymentTransaction>()
                    .FirstOrDefaultAsync(t => t.BookingId == bookingId && t.TenantId == tenantId);

                if (transaction != null)
                {
                    // MP manda varias notificaciones por el mismo pago (created/updated): lo que pasa
                    // "una sola vez" (registrar el cobro, avisar al cliente) solo corre en la transición a aprobado.
                    var wasApproved = transaction.Status == PaymentTransactionStatus.Approved;

                    // Actualizar estado de la transacción
                    transaction.MercadoPagoPaymentId = payment.Id.ToString();
                    transaction.Status = MapMercadoPagoStatus(payment.Status);
                    transaction.PaymentMethod = payment.PaymentMethodId;
                    transaction.ProcessedAt = payment.DateApproved ?? DateTime.UtcNow;
                    transaction.ProcessorResponseCode = payment.Status;
                    transaction.ProcessorResponseMessage = payment.StatusDetail;
                    transaction.UpdatedAt = DateTime.UtcNow;

                    // Si el pago fue aprobado, actualizar la reserva
                    Booking? approvedBooking = null;
                    var newlyApproved = payment.Status == "approved" && !wasApproved;
                    if (payment.Status == "approved")
                    {
                        // El panel marca un turno como pago por sus Payment "completed" (HasPayment /
                        // IsPaymentSuccessful, saldo de Detección de transferencias): se registra el cobro
                        // igual que cuando se aplica una transferencia, una sola vez por pago de MP.
                        approvedBooking = await DepositConfirmation.ConfirmBookingAsync(_context, tenantId, bookingId,
                            new DepositConfirmation.PaidDeposit(
                                Provider: "mercadopago",
                                ExternalPaymentId: payment.Id?.ToString(),
                                MercadoPagoPreferenceId: transaction.MercadoPagoPreferenceId,
                                Amount: payment.TransactionAmount ?? transaction.Amount,
                                PayerEmail: payment.Payer?.Email,
                                PaidAt: payment.DateApproved ?? DateTime.UtcNow,
                                PaymentType: string.IsNullOrEmpty(transaction.PaymentType) ? "deposit" : transaction.PaymentType,
                                Notes: "Cobrado con Mercado Pago (link de pago del turno)"));
                    }

                    await _context.SaveChangesAsync();

                    // Aviso al negocio: la seña ya entró a su Mercado Pago, sin pedir comprobante.
                    if (payment.Status == "approved")
                        PushDispatch.BookingEvent(tenantId, bookingId, "paid");

                    // Aviso al cliente por WhatsApp (best-effort: nunca rompe el webhook). Solo si el link de
                    // pago lo generó el asistente de WhatsApp; la reserva pública y el panel no lo reciben.
                    if (newlyApproved && approvedBooking != null && DepositConfirmation.IsFromWhatsAppBot(transaction))
                        await DepositConfirmation.NotifyDepositReceivedAsync(_context, _whatsApp, _logger, tenantId, approvedBooking, payment.TransactionAmount ?? transaction.Amount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment notification for payment {PaymentId}", paymentId);
                throw;
            }
        }

        /// <summary>
        /// data.id del webhook: el body se deserializa a Dictionary&lt;string, object&gt;, así que "data" llega
        /// como JsonElement (el id puede venir como string o número).
        /// </summary>
        private static string? ExtractDataId(object? dataObj)
        {
            if (dataObj is JsonElement el && el.ValueKind == JsonValueKind.Object && el.TryGetProperty("id", out var idEl))
            {
                return idEl.ValueKind switch
                {
                    JsonValueKind.String => idEl.GetString(),
                    JsonValueKind.Number => idEl.GetRawText(),
                    _ => null
                };
            }
            return dataObj?.GetType().GetProperty("id")?.GetValue(dataObj, null)?.ToString();
        }

        /// <summary>True si el negocio cobra las señas con Stripe Connect (España) en vez de Mercado Pago.</summary>
        private async Task<bool> UsesStripeDepositsAsync(Guid tenantId)
        {
            var country = await _context.Tenants.IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.Id == tenantId).Select(t => t.Country).FirstOrDefaultAsync();
            return CountryProfile.Get(country).StripeDeposits;
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

        /// <summary>
        /// Moneda en la que cobra el negocio por Mercado Pago: la de su cuenta MP conectada (currency_id que
        /// guardó el OAuth); si no la tenemos, la del negocio (ARS en Argentina).
        /// </summary>
        private async Task<string> ResolveChargeCurrencyAsync(Guid tenantId)
        {
            var mpCurrency = await _context.Set<MercadoPagoOAuthConfiguration>()
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(c => c.TenantId == tenantId && c.IsActive)
                .Select(c => c.CurrencyId)
                .FirstOrDefaultAsync();
            if (!string.IsNullOrWhiteSpace(mpCurrency)) return mpCurrency.Trim().ToUpperInvariant();

            var tenant = await _context.Tenants.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
            return Utilities.CountryProfile.CurrencyFor(tenant);
        }

        /// <summary>
        /// Monto mínimo del checkout de MP, en la moneda del cobro. Hoy 1 unidad en todas (ARS, UYU, MXN);
        /// si algún sitio de MP exige otro mínimo, va acá.
        /// </summary>
        private static decimal MinimumChargeAmount(string currency) => 1m;

        public async Task<ServiceResult<PaymentLinkResponseDto>> CreatePaymentLinkAsync(string tenantId, CreatePaymentLinkDto dto)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<PaymentLinkResponseDto>.Fail("Invalid tenant ID");
                }

                // Negocios con señas por Stripe Connect (España): Checkout en la cuenta del negocio.
                if (await UsesStripeDepositsAsync(tenantGuid))
                {
                    if (dto.BookingId == Guid.Empty)
                        return ServiceResult<PaymentLinkResponseDto>.Fail("El enlace de pago con Stripe tiene que ser de una cita");
                    var checkout = await _stripeConnect.CreateDepositCheckoutAsync(tenantGuid, dto.BookingId, dto.Amount, dto.CustomerEmail);
                    if (!checkout.Success || checkout.Data == null)
                        return ServiceResult<PaymentLinkResponseDto>.Fail(checkout.Message ?? "Failed to create payment link");
                    return ServiceResult<PaymentLinkResponseDto>.Ok(new PaymentLinkResponseDto
                    {
                        PaymentLink = checkout.Data.Url,
                        PreferenceId = checkout.Data.SessionId,
                        // El Checkout de la seña vence a los 30 minutos (StripeConnectService).
                        ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                    });
                }
                
                var config = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantGuid && c.IsActive);
                    
                if (config == null || string.IsNullOrEmpty(config.AccessToken))
                {
                    // Uruguay/México conectan pegando las credenciales de su propia cuenta MP: ese token no pasa
                    // por la app de la plataforma, así que el link va sin marketplace_fee.
                    var credentialsLink = await CreateCredentialsPaymentLinkAsync(tenantGuid, dto);
                    if (credentialsLink != null) return credentialsLink;
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
                            currency_id = await ResolveChargeCurrencyAsync(tenantGuid),
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

        /// <summary>
        /// Link de pago con el token que pegó el negocio (ConnectionMode = "credentials"). marketplace_fee solo
        /// es válido con tokens obtenidos por OAuth con la app de la plataforma (MP lo rechaza o lo ignora con
        /// las credenciales propias del vendedor), así que acá NO se manda. Null si el negocio no está
        /// conectado por credenciales (sigue el camino de siempre).
        /// </summary>
        private async Task<ServiceResult<PaymentLinkResponseDto>?> CreateCredentialsPaymentLinkAsync(Guid tenantId, CreatePaymentLinkDto dto)
        {
            var mode = await _context.Set<MercadoPagoOAuthConfiguration>()
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(c => c.TenantId == tenantId && c.IsActive)
                .Select(c => c.ConnectionMode)
                .FirstOrDefaultAsync();
            if (!MercadoPagoConnectionModes.IsCredentials(mode)) return null;

            var tokenResult = await _oauthService.GetValidAccessTokenAsync(tenantId);
            if (!tokenResult.Success || string.IsNullOrEmpty(tokenResult.Data))
                return ServiceResult<PaymentLinkResponseDto>.Fail("MercadoPago not configured");

            const int expirationMinutes = 5;
            var preferenceRequest = new
            {
                items = new[]
                {
                    new
                    {
                        title = dto.Title,
                        description = dto.Description,
                        quantity = 1,
                        currency_id = await ResolveChargeCurrencyAsync(tenantId),
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
                expires = true,
                expiration_date_to = DateTime.UtcNow.AddMinutes(expirationMinutes),
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
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResult.Data);
            var content = new StringContent(JsonSerializer.Serialize(preferenceRequest), System.Text.Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("https://api.mercadopago.com/checkout/preferences", content);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Credentials payment link failed for tenant {TenantId}: {Status} {Body}",
                    tenantId, (int)response.StatusCode, await response.Content.ReadAsStringAsync());
                return ServiceResult<PaymentLinkResponseDto>.Fail("Failed to create payment link");
            }

            var preferenceResponse = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(await response.Content.ReadAsStringAsync());
            return ServiceResult<PaymentLinkResponseDto>.Ok(new PaymentLinkResponseDto
            {
                PaymentLink = preferenceResponse?["init_point"].GetString() ?? "",
                PreferenceId = preferenceResponse?["id"].GetString() ?? "",
                ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
            });
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
                var clientId = _configuration["MercadoPago:ClientId"] ?? string.Empty;
                var clientSecret = _configuration["MercadoPago:ClientSecret"] ?? string.Empty;
                var tokenRequest = new Dictionary<string, string>
                {
                    ["grant_type"] = "refresh_token",
                    ["client_id"] = clientId,
                    ["client_secret"] = clientSecret,
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
                string depositAccessToken;
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
                    depositAccessToken = mpConfig.AccessToken;
                }
                else
                {
                    depositAccessToken = tokenResult.Data;
                }
                var depositRequestOptions = new MercadoPago.Client.RequestOptions { AccessToken = depositAccessToken };
                
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
                            CurrencyId = await ResolveChargeCurrencyAsync(tenantId),
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
                var preference = await client.CreateAsync(preferenceRequest, depositRequestOptions);

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
