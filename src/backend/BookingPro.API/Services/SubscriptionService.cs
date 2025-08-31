using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QRCoder;

namespace BookingPro.API.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SubscriptionService> _logger;
        private readonly HttpClient _httpClient;

        public SubscriptionService(
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<SubscriptionService> logger,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient();
        }

        public async Task<ServiceResult<SubscriptionResponseDto>> CreateTrialSubscriptionAsync(Guid tenantId)
        {
            try
            {
                // Check if tenant already has a subscription
                var existingSubscription = await _context.Subscriptions
                    .Where(s => s.TenantId == tenantId)
                    .FirstOrDefaultAsync();

                if (existingSubscription != null)
                {
                    return ServiceResult<SubscriptionResponseDto>.Fail("El tenant ya tiene una suscripción");
                }

                // Create trial subscription with basic plan
                var trialSubscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    PlanType = "basic",
                    MonthlyAmount = 0, // Free during trial
                    Status = "trial",
                    IsTrialPeriod = true,
                    TrialEndsAt = DateTime.UtcNow.AddDays(14), // 14 días de prueba
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Subscriptions.Add(trialSubscription);
                await _context.SaveChangesAsync();

                return ServiceResult<SubscriptionResponseDto>.Ok(new SubscriptionResponseDto
                {
                    Id = trialSubscription.Id,
                    Status = trialSubscription.Status,
                    PlanType = trialSubscription.PlanType,
                    MonthlyAmount = trialSubscription.MonthlyAmount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating trial subscription for tenant {TenantId}", tenantId);
                return ServiceResult<SubscriptionResponseDto>.Fail("Error al crear suscripción de prueba");
            }
        }

        public async Task<ServiceResult<bool>> InitializePlansAsync()
        {
            try
            {
                var plans = new[]
                {
                    new SubscriptionPlan
                    {
                        Code = "basic",
                        Name = "Plan Básico",
                        Description = "Ideal para pequeños negocios",
                        Price = 4999m,
                        Currency = "ARS",
                        MaxBookingsPerMonth = 100,
                        MaxServices = 5,
                        MaxStaff = 2,
                        MaxCustomers = 50,
                        AllowOnlinePayments = false,
                        AllowCustomBranding = false,
                        AllowSmsNotifications = false,
                        AllowEmailMarketing = false,
                        AllowReports = true,
                        AllowMultiLocation = false,
                        TrialDays = 14,
                        DisplayOrder = 1
                    },
                    new SubscriptionPlan
                    {
                        Code = "pro",
                        Name = "Plan Profesional",
                        Description = "Para negocios en crecimiento",
                        Price = 9999m,
                        Currency = "ARS",
                        MaxBookingsPerMonth = 500,
                        MaxServices = 20,
                        MaxStaff = 10,
                        MaxCustomers = 500,
                        AllowOnlinePayments = true,
                        AllowCustomBranding = true,
                        AllowSmsNotifications = true,
                        AllowEmailMarketing = false,
                        AllowReports = true,
                        AllowMultiLocation = false,
                        TrialDays = 14,
                        IsPopular = true,
                        DisplayOrder = 2
                    },
                    new SubscriptionPlan
                    {
                        Code = "enterprise",
                        Name = "Plan Empresa",
                        Description = "Solución completa para grandes empresas",
                        Price = 19999m,
                        Currency = "ARS",
                        MaxBookingsPerMonth = -1, // Unlimited
                        MaxServices = -1,
                        MaxStaff = -1,
                        MaxCustomers = -1,
                        AllowOnlinePayments = true,
                        AllowCustomBranding = true,
                        AllowSmsNotifications = true,
                        AllowEmailMarketing = true,
                        AllowReports = true,
                        AllowMultiLocation = true,
                        TrialDays = 30,
                        DisplayOrder = 3
                    }
                };

                foreach (var plan in plans)
                {
                    var existingPlan = await _context.SubscriptionPlans
                        .FirstOrDefaultAsync(p => p.Code == plan.Code);

                    if (existingPlan == null)
                    {
                        // Create plan in MercadoPago if we have credentials
                        var accessToken = _configuration["MercadoPago:AccessToken"];
                        if (!string.IsNullOrEmpty(accessToken))
                        {
                            try
                            {
                                var mpPlanId = await CreateMercadoPagoPlanAsync(plan, accessToken);
                                plan.MercadoPagoPreapprovalPlanId = mpPlanId;
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, $"Could not create MercadoPago plan for {plan.Code}");
                            }
                        }

                        _context.SubscriptionPlans.Add(plan);
                    }
                    else
                    {
                        // Update existing plan
                        existingPlan.Name = plan.Name;
                        existingPlan.Description = plan.Description;
                        existingPlan.Price = plan.Price;
                        existingPlan.MaxBookingsPerMonth = plan.MaxBookingsPerMonth;
                        existingPlan.MaxServices = plan.MaxServices;
                        existingPlan.MaxStaff = plan.MaxStaff;
                        existingPlan.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                return ServiceResult<bool>.Ok(true, "Planes inicializados correctamente");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing subscription plans");
                return ServiceResult<bool>.Fail("Error al inicializar planes");
            }
        }

        private async Task<string?> CreateMercadoPagoPlanAsync(SubscriptionPlan plan, string accessToken)
        {
            var requestBody = new
            {
                reason = $"Turnos Pro - {plan.Name}",
                auto_recurring = new
                {
                    frequency = 1,
                    frequency_type = "months",
                    transaction_amount = plan.Price,
                    currency_id = plan.Currency
                },
                back_url = $"{_configuration["FrontendUrl"]}/subscription/success",
                payment_methods_allowed = new
                {
                    payment_types = new[]
                    {
                        new { id = "credit_card" },
                        new { id = "debit_card" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.PostAsync(
                "https://api.mercadopago.com/preapproval_plan",
                content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var responseData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(responseContent);
                return responseData?["id"].GetString();
            }

            return null;
        }

        public async Task<ServiceResult<SubscriptionResponseDto>> CreateSubscriptionAsync(Guid tenantId, string planCode)
        {
            try
            {
                // Get plan
                var plan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Code == planCode && p.IsActive);

                if (plan == null)
                    return ServiceResult<SubscriptionResponseDto>.Fail("Plan no encontrado");

                // Check for existing active subscription
                var existingSub = await _context.Subscriptions
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && 
                        (s.Status == "active" || s.Status == "pending"));

                if (existingSub != null)
                    return ServiceResult<SubscriptionResponseDto>.Fail("Ya tienes una suscripción activa o pendiente");

                // Get tenant
                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null)
                    return ServiceResult<SubscriptionResponseDto>.Fail("Tenant no encontrado");

                // Create subscription in database
                var subscription = new Subscription
                {
                    TenantId = tenantId,
                    PlanType = plan.Code,
                    MonthlyAmount = plan.Price,
                    PayerEmail = tenant.OwnerEmail,
                    Status = "pending",
                    IsTrialPeriod = true,
                    TrialEndsAt = DateTime.UtcNow.AddDays(plan.TrialDays),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Create MercadoPago subscription if we have credentials
                var accessToken = _configuration["MercadoPago:AccessToken"];
                string? initPoint = null;
                if (!string.IsNullOrEmpty(accessToken))
                {
                    var mpResult = await CreateMercadoPagoSubscriptionAsync(subscription, plan, tenant, accessToken);
                    if (mpResult.PreapprovalId != null || mpResult.InitPoint != null)
                    {
                        subscription.MercadoPagoPreapprovalId = mpResult.PreapprovalId;
                        subscription.MercadoPagoPreapprovalPlanId = plan.MercadoPagoPreapprovalPlanId;
                        initPoint = mpResult.InitPoint;
                    }
                }
                else
                {
                    // For testing without MercadoPago, create a mock payment URL
                    _logger.LogWarning("MercadoPago access token not configured. Using test mode.");
                    initPoint = $"{_configuration["FrontendUrl"]}/subscription/payment-simulation?plan={planCode}&subscription={subscription.Id}";
                }

                _context.Subscriptions.Add(subscription);
                
                // Update tenant status
                tenant.Status = "trial";
                tenant.TrialEndsAt = subscription.TrialEndsAt;
                
                await _context.SaveChangesAsync();

                // Generate QR code for payment
                var qrCode = await GeneratePaymentQRCodeAsync(tenantId, planCode);

                return ServiceResult<SubscriptionResponseDto>.Ok(new SubscriptionResponseDto
                {
                    Id = subscription.Id,
                    Status = subscription.Status,
                    PlanType = subscription.PlanType,
                    MonthlyAmount = subscription.MonthlyAmount,
                    NextPaymentDate = subscription.TrialEndsAt,
                    QrCode = qrCode.Success ? qrCode.Data : null,
                    InitPoint = initPoint
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription");
                return ServiceResult<SubscriptionResponseDto>.Fail("Error al crear suscripción");
            }
        }

        private async Task<(string? PreapprovalId, string? InitPoint)> CreateMercadoPagoSubscriptionAsync(
            Subscription subscription, 
            SubscriptionPlan plan, 
            Tenant tenant,
            string accessToken)
        {
            try
            {
                var requestBody = new
                {
                    preapproval_plan_id = plan.MercadoPagoPreapprovalPlanId,
                    reason = $"Turnos Pro - {plan.Name}",
                    external_reference = $"SUB-{tenant.Id}-{DateTime.UtcNow:yyyyMMdd}",
                    payer_email = tenant.OwnerEmail,
                    back_url = $"{_configuration["FrontendUrl"]}/subscription/success",
                    auto_recurring = new
                    {
                        frequency = 1,
                        frequency_type = "months",
                        transaction_amount = plan.Price,
                        currency_id = "ARS",
                        start_date = subscription.TrialEndsAt?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    },
                    status = "pending"
                };

                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.PostAsync(
                    "https://api.mercadopago.com/preapproval",
                    content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var responseData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(responseContent);
                    
                    return (
                        responseData?["id"].GetString(),
                        responseData?["init_point"].GetString()
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating MercadoPago subscription");
            }

            return (null, null);
        }

        public async Task<ServiceResult<string>> GeneratePaymentQRCodeAsync(Guid tenantId, string planCode)
        {
            try
            {
                var plan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Code == planCode);

                if (plan == null)
                    return ServiceResult<string>.Fail("Plan no encontrado");

                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null)
                    return ServiceResult<string>.Fail("Tenant no encontrado");

                // Create MercadoPago payment preference for QR
                var accessToken = _configuration["MercadoPago:AccessToken"];
                if (string.IsNullOrEmpty(accessToken))
                    return ServiceResult<string>.Fail("MercadoPago no configurado");

                var preferenceRequest = new
                {
                    items = new[]
                    {
                        new
                        {
                            title = $"Suscripción {plan.Name}",
                            description = plan.Description,
                            quantity = 1,
                            currency_id = "ARS",
                            unit_price = plan.Price
                        }
                    },
                    payer = new
                    {
                        email = tenant.OwnerEmail
                    },
                    external_reference = $"SUB-{tenantId}-{planCode}",
                    notification_url = $"{_configuration["MercadoPago:WebhookUrl"]}/subscription",
                    expires = true,
                    expiration_date_to = DateTime.UtcNow.AddHours(24).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                };

                var json = JsonSerializer.Serialize(preferenceRequest);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.PostAsync(
                    "https://api.mercadopago.com/checkout/preferences",
                    content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var responseData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(responseContent);
                    
                    var initPoint = responseData?["init_point"].GetString();
                    
                    if (!string.IsNullOrEmpty(initPoint))
                    {
                        // Generate QR code
                        using var qrGenerator = new QRCodeGenerator();
                        var qrCodeData = qrGenerator.CreateQrCode(initPoint, QRCodeGenerator.ECCLevel.Q);
                        using var qrCode = new PngByteQRCode(qrCodeData);
                        var qrCodeImage = qrCode.GetGraphic(20);
                        var base64 = Convert.ToBase64String(qrCodeImage);
                        
                        return ServiceResult<string>.Ok($"data:image/png;base64,{base64}");
                    }
                }

                return ServiceResult<string>.Fail("Error generando QR de pago");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating payment QR code");
                return ServiceResult<string>.Fail("Error al generar código QR");
            }
        }

        public async Task<ServiceResult<SubscriptionStatusDto>> GetSubscriptionStatusAsync(Guid tenantId)
        {
            try
            {
                var subscription = await _context.Subscriptions
                    .Where(s => s.TenantId == tenantId)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                var tenant = await _context.Tenants.FindAsync(tenantId);
                
                if (subscription == null || tenant == null)
                {
                    return ServiceResult<SubscriptionStatusDto>.Ok(new SubscriptionStatusDto
                    {
                        IsActive = false,
                        PlanType = "none",
                        PlanName = "Sin plan",
                        DaysRemaining = 0,
                        IsTrialPeriod = false
                    });
                }

                var plan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Code == subscription.PlanType);

                var status = new SubscriptionStatusDto
                {
                    IsActive = subscription.Status == "active" || 
                               (subscription.IsTrialPeriod && subscription.TrialEndsAt > DateTime.UtcNow),
                    PlanType = subscription.PlanType,
                    PlanName = plan?.Name ?? subscription.PlanType,
                    MonthlyAmount = subscription.MonthlyAmount,
                    IsTrialPeriod = subscription.IsTrialPeriod,
                    TrialEndsAt = subscription.TrialEndsAt,
                    CreatedAt = subscription.CreatedAt
                };

                if (subscription.IsTrialPeriod && subscription.TrialEndsAt.HasValue)
                {
                    status.DaysRemaining = Math.Max(0, (int)(subscription.TrialEndsAt.Value - DateTime.UtcNow).TotalDays);
                    status.ExpiresAt = subscription.TrialEndsAt;
                }
                else if (subscription.NextPaymentDate.HasValue)
                {
                    status.DaysRemaining = Math.Max(0, (int)(subscription.NextPaymentDate.Value - DateTime.UtcNow).TotalDays);
                    status.ExpiresAt = subscription.NextPaymentDate;
                }

                // If trial expired and not active, generate payment QR
                if (subscription.IsTrialPeriod && 
                    subscription.TrialEndsAt <= DateTime.UtcNow && 
                    subscription.Status != "active")
                {
                    var qrResult = await GeneratePaymentQRCodeAsync(tenantId, subscription.PlanType);
                    if (qrResult.Success)
                    {
                        status.QrCodeData = qrResult.Data;
                    }
                }

                return ServiceResult<SubscriptionStatusDto>.Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription status");
                return ServiceResult<SubscriptionStatusDto>.Fail("Error al obtener estado de suscripción");
            }
        }

        public async Task<ServiceResult<bool>> ProcessSubscriptionWebhookAsync(Dictionary<string, object> data)
        {
            try
            {
                if (!data.ContainsKey("type"))
                    return ServiceResult<bool>.Ok(true);

                var type = data["type"]?.ToString();
                
                if (type == "payment")
                {
                    // Process subscription payment
                    var dataObj = data["data"] as JsonElement?;
                    if (dataObj?.TryGetProperty("id", out var idElement) == true)
                    {
                        var paymentId = idElement.GetString();
                        if (!string.IsNullOrEmpty(paymentId))
                        {
                            await ProcessSubscriptionPaymentAsync(paymentId);
                        }
                    }
                }
                else if (type == "subscription_preapproval")
                {
                    // Process subscription status change
                    var dataObj = data["data"] as JsonElement?;
                    if (dataObj?.TryGetProperty("id", out var idElement) == true)
                    {
                        var preapprovalId = idElement.GetString();
                        if (!string.IsNullOrEmpty(preapprovalId))
                        {
                            await UpdateSubscriptionStatusFromMercadoPagoAsync(preapprovalId);
                        }
                    }
                }

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing subscription webhook");
                return ServiceResult<bool>.Fail("Error procesando webhook");
            }
        }

        private async Task ProcessSubscriptionPaymentAsync(string paymentId)
        {
            try
            {
                var accessToken = _configuration["MercadoPago:AccessToken"];
                
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.GetAsync(
                    $"https://api.mercadopago.com/v1/payments/{paymentId}");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var payment = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
                    
                    var externalRef = payment?["external_reference"].GetString();
                    if (!string.IsNullOrEmpty(externalRef) && externalRef.StartsWith("SUB-"))
                    {
                        var parts = externalRef.Split('-');
                        if (parts.Length >= 2 && Guid.TryParse(parts[1], out var tenantId))
                        {
                            var subscription = await _context.Subscriptions
                                .FirstOrDefaultAsync(s => s.TenantId == tenantId);
                            
                            if (subscription != null)
                            {
                                // Record payment
                                var subPayment = new SubscriptionPayment
                                {
                                    TenantId = tenantId,
                                    SubscriptionId = subscription.Id,
                                    MercadoPagoPaymentId = paymentId,
                                    Amount = payment?["transaction_amount"].GetDecimal() ?? 0,
                                    Status = payment?["status"].GetString() ?? "unknown",
                                    PaymentDate = DateTime.UtcNow,
                                    PaymentMethod = payment?["payment_type_id"].GetString()
                                };
                                
                                _context.SubscriptionPayments.Add(subPayment);
                                
                                // Update subscription if payment approved
                                if (subPayment.Status == "approved")
                                {
                                    subscription.Status = "active";
                                    subscription.IsTrialPeriod = false;
                                    subscription.ActivatedAt = DateTime.UtcNow;
                                    subscription.NextPaymentDate = DateTime.UtcNow.AddMonths(1);
                                    
                                    // Update tenant
                                    var tenant = await _context.Tenants.FindAsync(tenantId);
                                    if (tenant != null)
                                    {
                                        tenant.Status = "active";
                                    }
                                }
                                
                                await _context.SaveChangesAsync();
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing payment {paymentId}");
            }
        }

        private async Task UpdateSubscriptionStatusFromMercadoPagoAsync(string preapprovalId)
        {
            try
            {
                var subscription = await _context.Subscriptions
                    .FirstOrDefaultAsync(s => s.MercadoPagoPreapprovalId == preapprovalId);
                
                if (subscription == null)
                    return;

                var accessToken = _configuration["MercadoPago:AccessToken"];
                
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.GetAsync(
                    $"https://api.mercadopago.com/preapproval/{preapprovalId}");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var preapproval = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
                    
                    var mpStatus = preapproval?["status"].GetString();
                    subscription.Status = MapMercadoPagoStatusToLocal(mpStatus);
                    
                    if (preapproval?["next_payment_date"].TryGetDateTime(out var nextPayment) == true)
                    {
                        subscription.NextPaymentDate = nextPayment;
                    }
                    
                    subscription.UpdatedAt = DateTime.UtcNow;
                    
                    // Update tenant status
                    var tenant = await _context.Tenants.FindAsync(subscription.TenantId);
                    if (tenant != null)
                    {
                        tenant.Status = subscription.Status == "active" ? "active" : 
                                       subscription.Status == "cancelled" ? "cancelled" : "suspended";
                    }
                    
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating subscription status for {preapprovalId}");
            }
        }

        public async Task<ServiceResult<bool>> CancelSubscriptionAsync(Guid tenantId)
        {
            try
            {
                var subscription = await _context.Subscriptions
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Status == "active");

                if (subscription == null)
                    return ServiceResult<bool>.Fail("No hay suscripción activa para cancelar");

                // Cancel in MercadoPago if we have the ID
                if (!string.IsNullOrEmpty(subscription.MercadoPagoPreapprovalId))
                {
                    var accessToken = _configuration["MercadoPago:AccessToken"];
                    
                    var updateRequest = new { status = "cancelled" };
                    var json = JsonSerializer.Serialize(updateRequest);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");
                    
                    _httpClient.DefaultRequestHeaders.Authorization = 
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                    await _httpClient.PutAsync(
                        $"https://api.mercadopago.com/preapproval/{subscription.MercadoPagoPreapprovalId}",
                        content);
                }

                // Update in database
                subscription.Status = "cancelled";
                subscription.CancelledAt = DateTime.UtcNow;
                subscription.UpdatedAt = DateTime.UtcNow;

                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant != null)
                {
                    tenant.Status = "cancelled";
                }

                await _context.SaveChangesAsync();

                return ServiceResult<bool>.Ok(true, "Suscripción cancelada exitosamente");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling subscription");
                return ServiceResult<bool>.Fail("Error al cancelar suscripción");
            }
        }

        public async Task<ServiceResult<bool>> CheckAndUpdateTrialStatusAsync(Guid tenantId)
        {
            try
            {
                var subscription = await _context.Subscriptions
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.IsTrialPeriod);

                if (subscription == null)
                    return ServiceResult<bool>.Ok(true);

                if (subscription.TrialEndsAt <= DateTime.UtcNow)
                {
                    subscription.Status = "expired";
                    subscription.UpdatedAt = DateTime.UtcNow;

                    var tenant = await _context.Tenants.FindAsync(tenantId);
                    if (tenant != null)
                    {
                        tenant.Status = "suspended";
                    }

                    await _context.SaveChangesAsync();
                    
                    return ServiceResult<bool>.Ok(false, "Período de prueba expirado");
                }

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking trial status");
                return ServiceResult<bool>.Fail("Error al verificar estado de prueba");
            }
        }

        public async Task<ServiceResult<List<SubscriptionPlanDto>>> GetAvailablePlansAsync()
        {
            try
            {
                var plans = await _context.SubscriptionPlans
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.DisplayOrder)
                    .Select(p => new SubscriptionPlanDto
                    {
                        Code = p.Code,
                        Name = p.Name,
                        Description = p.Description,
                        Price = p.Price,
                        Currency = p.Currency,
                        MaxBookingsPerMonth = p.MaxBookingsPerMonth,
                        MaxServices = p.MaxServices,
                        MaxStaff = p.MaxStaff,
                        MaxCustomers = p.MaxCustomers,
                        AllowOnlinePayments = p.AllowOnlinePayments,
                        AllowCustomBranding = p.AllowCustomBranding,
                        AllowSmsNotifications = p.AllowSmsNotifications,
                        AllowEmailMarketing = p.AllowEmailMarketing,
                        AllowReports = p.AllowReports,
                        AllowMultiLocation = p.AllowMultiLocation,
                        IsPopular = p.IsPopular,
                        TrialDays = p.TrialDays
                    })
                    .ToListAsync();

                return ServiceResult<List<SubscriptionPlanDto>>.Ok(plans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available plans");
                return ServiceResult<List<SubscriptionPlanDto>>.Fail("Error al obtener planes disponibles");
            }
        }

        private string MapMercadoPagoStatusToLocal(string? mpStatus)
        {
            return mpStatus?.ToLower() switch
            {
                "authorized" => "active",
                "paused" => "paused",
                "cancelled" => "cancelled",
                "pending" => "pending",
                _ => "pending"
            };
        }
    }
}