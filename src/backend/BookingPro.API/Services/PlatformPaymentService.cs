using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using MercadoPago.Client.Preference;
using MercadoPago.Config;
using MercadoPago.Resource.Preference;
using MercadoPago.Client.Payment;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services
{
        public class PlatformPaymentService : IPlatformPaymentService
        {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PlatformPaymentService> _logger;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public PlatformPaymentService(
            ApplicationDbContext context,
            ILogger<PlatformPaymentService> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
        }

        public async Task<ServiceResult<PurchaseMessagePackageResponseDto>> CreateMessagePackagePurchaseAsync(Guid tenantId, Guid packageId)
        {
            try
            {
                // Load platform MP config
                var platformConfig = await GetActivePlatformConfigAsync();
                if (platformConfig == null)
                {
                    return ServiceResult<PurchaseMessagePackageResponseDto>.Fail("Platform MercadoPago not configured");
                }

                // Load tenant and package
                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null)
                {
                    return ServiceResult<PurchaseMessagePackageResponseDto>.Fail("Tenant not found");
                }

                var pack = await _context.MessagePackages.FirstOrDefaultAsync(p => p.Id == packageId && p.IsActive);
                if (pack == null)
                {
                    return ServiceResult<PurchaseMessagePackageResponseDto>.Fail("Package not found");
                }

                MercadoPagoConfig.AccessToken = platformConfig.AccessToken;

                var externalRef = $"MSG-{tenantId}-{packageId}-{DateTime.UtcNow:yyyyMMddHHmmss}";

                var prefReq = new PreferenceRequest
                {
                    Items = new List<PreferenceItemRequest>
                    {
                        new PreferenceItemRequest
                        {
                            Id = packageId.ToString(),
                            Title = $"Paquete WhatsApp {pack.Quantity}",
                            Description = $"Créditos de mensajes WhatsApp ({pack.Quantity})",
                            Quantity = 1,
                            CurrencyId = pack.Currency,
                            UnitPrice = pack.Price
                        }
                    },
                    Payer = new PreferencePayerRequest
                    {
                        Name = tenant.BusinessName,
                        Email = tenant.OwnerEmail
                    },
                    BackUrls = new PreferenceBackUrlsRequest
                    {
                        Success = $"{_configuration["FrontendUrl"]}/admin/messaging/success",
                        Failure = $"{_configuration["FrontendUrl"]}/admin/messaging/failure",
                        Pending = $"{_configuration["FrontendUrl"]}/admin/messaging/pending"
                    },
                    AutoReturn = "approved",
                    NotificationUrl = $"{_configuration["BaseUrl"]}/api/webhooks/platform/mercadopago",
                    ExternalReference = externalRef,
                    ExpirationDateTo = DateTime.UtcNow.AddDays(7),
                    Expires = true
                };

                var client = new PreferenceClient();
                var preference = await client.CreateAsync(prefReq);

                // Save purchase record (tenant scope)
                var purchase = new MessagePurchase
                {
                    TenantId = tenantId,
                    PackageId = pack.Id,
                    Quantity = pack.Quantity,
                    UnitPrice = pack.Price,
                    TotalPrice = pack.Price,
                    Status = "pending",
                    PreferenceId = preference.Id,
                    ExternalReference = externalRef
                };
                _context.MessagePurchases.Add(purchase);
                await _context.SaveChangesAsync();

                return ServiceResult<PurchaseMessagePackageResponseDto>.Ok(new PurchaseMessagePackageResponseDto
                {
                    PurchaseId = purchase.Id,
                    PaymentLink = preference.InitPoint ?? string.Empty,
                    PreferenceId = preference.Id ?? string.Empty,
                    Amount = pack.Price,
                    ExpiresAt = preference.ExpirationDateTo ?? DateTime.UtcNow.AddDays(7)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating message package purchase");
                return ServiceResult<PurchaseMessagePackageResponseDto>.Fail("Error creating purchase");
            }
        }

        public async Task<ServiceResult<TenantSubscriptionPaymentResponseDto>> CreateTenantSubscriptionPaymentAsync(CreateTenantSubscriptionPaymentDto dto)
        {
            try
            {
                // Get platform configuration
                var platformConfig = await GetActivePlatformConfigAsync();
                if (platformConfig == null)
                {
                    return ServiceResult<TenantSubscriptionPaymentResponseDto>.Fail("Platform MercadoPago not configured");
                }

                // Get tenant
                var tenant = await _context.Tenants.FindAsync(dto.TenantId);
                if (tenant == null)
                {
                    return ServiceResult<TenantSubscriptionPaymentResponseDto>.Fail("Tenant not found");
                }

                // Calculate period dates
                var (startDate, endDate) = CalculatePeriodDates(dto.Period);

                // Configure MercadoPago with platform credentials
                MercadoPagoConfig.AccessToken = platformConfig.AccessToken;

                // Create unique external reference
                var externalRef = $"TENANT-{dto.TenantId}-{dto.Period}-{DateTime.UtcNow:yyyyMMddHHmmss}";

                // Create preference
                var preferenceRequest = new PreferenceRequest
                {
                    Items = new List<PreferenceItemRequest>
                    {
                        new PreferenceItemRequest
                        {
                            Id = dto.TenantId.ToString(),
                            Title = $"Suscripción {dto.Period} - {tenant.BusinessName}",
                            Description = $"Período {startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}",
                            Quantity = 1,
                            CurrencyId = "ARS",
                            UnitPrice = dto.Amount
                        }
                    },
                    Payer = new PreferencePayerRequest
                    {
                        Name = tenant.BusinessName,
                        Email = dto.PayerEmail
                    },
                    BackUrls = new PreferenceBackUrlsRequest
                    {
                        Success = $"{_configuration["FrontendUrl"]}/admin/subscription/success",
                        Failure = $"{_configuration["FrontendUrl"]}/admin/subscription/failure",
                        Pending = $"{_configuration["FrontendUrl"]}/admin/subscription/pending"
                    },
                    AutoReturn = "approved",
                    NotificationUrl = $"{_configuration["BaseUrl"]}/api/webhooks/platform/mercadopago",
                    ExternalReference = externalRef,
                    ExpirationDateTo = DateTime.UtcNow.AddDays(7), // 7 days to pay
                    Expires = true
                };

                var client = new PreferenceClient();
                var preference = await client.CreateAsync(preferenceRequest);

                // Save payment record
                var payment = new TenantSubscriptionPayment
                {
                    TenantId = dto.TenantId,
                    PreferenceId = preference.Id,
                    Amount = dto.Amount,
                    Period = dto.Period,
                    PeriodStart = startDate,
                    PeriodEnd = endDate,
                    PayerEmail = dto.PayerEmail,
                    Status = "pending"
                };

                _context.TenantSubscriptionPayments.Add(payment);
                await _context.SaveChangesAsync();

                return ServiceResult<TenantSubscriptionPaymentResponseDto>.Ok(new TenantSubscriptionPaymentResponseDto
                {
                    PaymentId = payment.Id,
                    PaymentLink = preference.InitPoint ?? "",
                    PreferenceId = preference.Id,
                    Amount = dto.Amount,
                    ExpiresAt = preference.ExpirationDateTo ?? DateTime.UtcNow.AddDays(7),
                    Period = dto.Period,
                    PeriodStart = startDate,
                    PeriodEnd = endDate
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tenant subscription payment");
                return ServiceResult<TenantSubscriptionPaymentResponseDto>.Fail("Error creating payment");
            }
        }

        public async Task<ServiceResult<bool>> ProcessPlatformPaymentWebhookAsync(string paymentId)
        {
            try
            {
                // Get platform configuration
                var platformConfig = await GetActivePlatformConfigAsync();
                if (platformConfig == null)
                {
                    return ServiceResult<bool>.Fail("Platform not configured");
                }

                MercadoPagoConfig.AccessToken = platformConfig.AccessToken;

                // Get payment details from MercadoPago
                var paymentClient = new PaymentClient();
                var payment = await paymentClient.GetAsync(long.Parse(paymentId));

                if (payment?.ExternalReference == null)
                {
                    return ServiceResult<bool>.Fail("Invalid payment reference");
                }

                // Decide which flow by external reference prefix
                if (payment.ExternalReference.StartsWith("MSG-"))
                {
                    // Message package purchase
                    var mpurchase = await _context.MessagePurchases
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(p => p.ExternalReference == payment.ExternalReference || p.PreferenceId == payment.ExternalReference);

                    if (mpurchase == null)
                    {
                        _logger.LogWarning("Message purchase not found for external reference: {ExternalReference}", payment.ExternalReference);
                        return ServiceResult<bool>.Ok(true);
                    }

                    mpurchase.PlatformPaymentId = paymentId;
                    mpurchase.Status = MapPaymentStatus(payment.Status);
                    mpurchase.UpdatedAt = DateTime.UtcNow;
                    if (payment.Status == "approved")
                    {
                        mpurchase.PaidAt = DateTime.UtcNow;

                        // Credit wallet
                        var wallet = await _context.TenantMessageWallets
                            .IgnoreQueryFilters()
                            .FirstOrDefaultAsync(w => w.TenantId == mpurchase.TenantId);
                        if (wallet == null)
                        {
                            wallet = new TenantMessageWallet
                            {
                                TenantId = mpurchase.TenantId,
                                Balance = 0,
                                TotalPurchased = 0,
                                TotalSent = 0
                            };
                            _context.TenantMessageWallets.Add(wallet);
                        }
                        wallet.Balance += mpurchase.Quantity;
                        wallet.TotalPurchased += mpurchase.Quantity;
                        wallet.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();

                        _logger.LogInformation("Credited {Qty} message credits to tenant {TenantId}", mpurchase.Quantity, mpurchase.TenantId);
                    }

                    await _context.SaveChangesAsync();
                    return ServiceResult<bool>.Ok(true);
                }

                // Find the subscription payment record
                var subscriptionPayment = await _context.TenantSubscriptionPayments
                    .Include(p => p.Tenant)
                    .FirstOrDefaultAsync(p => p.PreferenceId == payment.ExternalReference ||
                                            payment.ExternalReference.Contains(p.TenantId.ToString()));

                if (subscriptionPayment == null)
                {
                    _logger.LogWarning("Subscription payment not found for external reference: {ExternalReference}", payment.ExternalReference);
                    return ServiceResult<bool>.Ok(true); // Still return success to avoid retries
                }

                // Update payment status
                subscriptionPayment.PlatformPaymentId = paymentId;
                subscriptionPayment.Status = MapPaymentStatus(payment.Status);
                subscriptionPayment.PaymentMethod = payment.PaymentMethodId;
                subscriptionPayment.UpdatedAt = DateTime.UtcNow;

                if (payment.Status == "approved")
                {
                    subscriptionPayment.PaidAt = DateTime.UtcNow;
                    
                    // Update tenant status and period
                    var tenant = subscriptionPayment.Tenant;
                    tenant.Status = "active";
                    tenant.TrialEndsAt = subscriptionPayment.PeriodEnd;
                    tenant.UpdatedAt = DateTime.UtcNow;

                    _logger.LogInformation("Tenant {TenantId} subscription payment approved for period {Period}", 
                        tenant.Id, subscriptionPayment.Period);
                }

                await _context.SaveChangesAsync();
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing platform payment webhook for payment {PaymentId}", paymentId);
                return ServiceResult<bool>.Fail("Error processing webhook");
            }
        }

        public async Task<ServiceResult<bool>> IsPlatformConfiguredAsync()
        {
            var config = await GetActivePlatformConfigAsync();
            return ServiceResult<bool>.Ok(config != null);
        }

        public async Task<ServiceResult<bool>> ConfigurePlatformMercadoPagoAsync(string accessToken, string? refreshToken = null, bool isSandbox = true)
        {
            try
            {
                // Deactivate any existing configurations
                var existingConfigs = await _context.PlatformMercadoPagoConfigurations
                    .Where(c => c.IsActive)
                    .ToListAsync();

                foreach (var config in existingConfigs)
                {
                    config.IsActive = false;
                    config.DisconnectedAt = DateTime.UtcNow;
                    config.UpdatedAt = DateTime.UtcNow;
                }

                // Create new configuration
                var newConfig = new PlatformMercadoPagoConfiguration
                {
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    IsSandbox = isSandbox,
                    IsActive = true,
                    ConnectedAt = DateTime.UtcNow
                };

                _context.PlatformMercadoPagoConfigurations.Add(newConfig);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Platform MercadoPago configuration updated successfully");
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error configuring platform MercadoPago");
                return ServiceResult<bool>.Fail("Error updating configuration");
            }
        }

        public async Task<ServiceResult<List<TenantSubscriptionPaymentResponseDto>>> GetTenantPaymentHistoryAsync(Guid tenantId)
        {
            try
            {
                var payments = await _context.TenantSubscriptionPayments
                    .Where(p => p.TenantId == tenantId)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new TenantSubscriptionPaymentResponseDto
                    {
                        PaymentId = p.Id,
                        PaymentLink = "", // Don't expose payment links in history
                        PreferenceId = p.PreferenceId ?? "",
                        Amount = p.Amount,
                        ExpiresAt = p.CreatedAt.AddDays(7), // Assuming 7-day expiry
                        Period = p.Period,
                        PeriodStart = p.PeriodStart,
                        PeriodEnd = p.PeriodEnd
                    })
                    .ToListAsync();

                return ServiceResult<List<TenantSubscriptionPaymentResponseDto>>.Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tenant payment history for {TenantId}", tenantId);
                return ServiceResult<List<TenantSubscriptionPaymentResponseDto>>.Fail("Error retrieving payment history");
            }
        }

        public async Task<ServiceResult<bool>> HasActiveSubscriptionAsync(Guid tenantId)
        {
            try
            {
                var hasActive = await _context.TenantSubscriptionPayments
                    .AnyAsync(p => p.TenantId == tenantId && 
                                  p.Status == "approved" && 
                                  p.PeriodEnd > DateTime.UtcNow);

                return ServiceResult<bool>.Ok(hasActive);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking active subscription for tenant {TenantId}", tenantId);
                return ServiceResult<bool>.Fail("Error checking subscription status");
            }
        }

        public async Task<ServiceResult<DateTime?>> GetNextPaymentDueDateAsync(Guid tenantId)
        {
            try
            {
                var nextDue = await _context.TenantSubscriptionPayments
                    .Where(p => p.TenantId == tenantId && 
                               p.Status == "approved")
                    .OrderByDescending(p => p.PeriodEnd)
                    .Select(p => p.PeriodEnd)
                    .FirstOrDefaultAsync();

                return ServiceResult<DateTime?>.Ok(nextDue);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting next payment due date for tenant {TenantId}", tenantId);
                return ServiceResult<DateTime?>.Fail("Error retrieving due date");
            }
        }

        public async Task<ServiceResult<TenantSubscriptionPaymentResponseDto>> CreateTenantRenewalPaymentAsync(Guid tenantId, string period)
        {
            try
            {
                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null)
                {
                    return ServiceResult<TenantSubscriptionPaymentResponseDto>.Fail("Tenant not found");
                }

                // Calculate amount based on period
                var amount = CalculateAmountForPeriod(period);

                var dto = new CreateTenantSubscriptionPaymentDto
                {
                    TenantId = tenantId,
                    Period = period,
                    Amount = amount,
                    PayerEmail = tenant.OwnerEmail
                };

                return await CreateTenantSubscriptionPaymentAsync(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tenant renewal payment");
                return ServiceResult<TenantSubscriptionPaymentResponseDto>.Fail("Error creating renewal payment");
            }
        }

        #region Private Methods

        private async Task<PlatformMercadoPagoConfiguration?> GetActivePlatformConfigAsync()
        {
            return await _context.PlatformMercadoPagoConfigurations
                .FirstOrDefaultAsync(c => c.IsActive);
        }

        private (DateTime startDate, DateTime endDate) CalculatePeriodDates(string period)
        {
            var startDate = DateTime.UtcNow;
            var endDate = period.ToLower() switch
            {
                "monthly" => startDate.AddMonths(1),
                "quarterly" => startDate.AddMonths(3),
                "annual" => startDate.AddYears(1),
                _ => startDate.AddMonths(1)
            };

            return (startDate, endDate);
        }

        private decimal CalculateAmountForPeriod(string period)
        {
            // These should be configurable, but for now using defaults
            return period.ToLower() switch
            {
                "monthly" => 9999m,   // $99.99 monthly
                "quarterly" => 24999m, // $249.99 quarterly (save ~17%)
                "annual" => 89999m,    // $899.99 annual (save ~25%)
                _ => 9999m
            };
        }

        private string MapPaymentStatus(string? mpStatus)
        {
            return mpStatus?.ToLower() switch
            {
                "approved" => "approved",
                "pending" => "pending",
                "in_process" => "pending",
                "rejected" => "rejected",
                "cancelled" => "cancelled",
                _ => "pending"
            };
        }

        #endregion
    }
}
