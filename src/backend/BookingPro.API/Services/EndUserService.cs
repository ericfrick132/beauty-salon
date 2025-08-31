using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using MercadoPago.Client.Payment;
using MercadoPago.Client.Preference;
using MercadoPago.Config;
using MercadoPago.Resource.Preference;
using QRCoder;

namespace BookingPro.API.Services
{
    public class EndUserService : IEndUserService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<EndUserService> _logger;
        private readonly IConfiguration _configuration;
        private readonly ITenantProvider _tenantProvider;

        public EndUserService(
            ApplicationDbContext context,
            ILogger<EndUserService> logger,
            IConfiguration configuration,
            ITenantProvider tenantProvider)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _tenantProvider = tenantProvider;
        }

        public async Task<ServiceResult<EndUserResponseDto>> RegisterEndUserAsync(RegisterEndUserDto dto)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                if (tenantId == Guid.Empty)
                {
                    return ServiceResult<EndUserResponseDto>.Fail("Tenant not found");
                }

                // Check if user already exists
                var existingUser = await _context.EndUsers
                    .FirstOrDefaultAsync(u => u.Email == dto.Email && u.TenantId == tenantId);

                if (existingUser != null)
                {
                    return ServiceResult<EndUserResponseDto>.Ok(MapToResponseDto(existingUser));
                }

                // Create new end user with 7-day demo
                var endUser = new EndUser
                {
                    TenantId = tenantId,
                    Email = dto.Email,
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    Phone = dto.Phone,
                    Status = "DEMO_ACTIVO",
                    DemoStartedAt = DateTime.UtcNow,
                    DemoEndsAt = DateTime.UtcNow.AddDays(7)
                };

                _context.EndUsers.Add(endUser);
                await _context.SaveChangesAsync();

                _logger.LogInformation("New end user registered: {Email} for tenant {TenantId}", dto.Email, tenantId);
                
                return ServiceResult<EndUserResponseDto>.Ok(MapToResponseDto(endUser));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering end user");
                return ServiceResult<EndUserResponseDto>.Fail("Error creating user account");
            }
        }

        public async Task<ServiceResult<EndUserStatusDto>> GetEndUserStatusAsync(string email)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                var endUser = await _context.EndUsers
                    .FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);

                if (endUser == null)
                {
                    return ServiceResult<EndUserStatusDto>.Ok(new EndUserStatusDto
                    {
                        Status = "VISITANTE",
                        HasActiveAccess = false,
                        RequiresPayment = false
                    });
                }

                // Calculate current status and access
                var status = await CalculateCurrentUserStatus(endUser);
                
                return ServiceResult<EndUserStatusDto>.Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting end user status");
                return ServiceResult<EndUserStatusDto>.Fail("Error retrieving user status");
            }
        }

        public async Task<ServiceResult<EndUserSubscriptionResponseDto>> CreateEndUserSubscriptionAsync(CreateEndUserSubscriptionDto dto)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                
                // Get or create end user
                var endUser = await _context.EndUsers
                    .FirstOrDefaultAsync(u => u.Email == dto.Email && u.TenantId == tenantId);

                if (endUser == null)
                {
                    // Create user if doesn't exist
                    var registerDto = new RegisterEndUserDto
                    {
                        Email = dto.Email,
                        FirstName = dto.FirstName,
                        LastName = dto.LastName,
                        Phone = dto.Phone
                    };
                    var registerResult = await RegisterEndUserAsync(registerDto);
                    if (!registerResult.Success || registerResult.Data == null)
                    {
                        return ServiceResult<EndUserSubscriptionResponseDto>.Fail("Failed to create user");
                    }
                    endUser = await _context.EndUsers.FindAsync(registerResult.Data.Id);
                }

                // Get plan
                var plan = await _context.TenantPlans.FindAsync(dto.PlanId);
                if (plan == null)
                {
                    return ServiceResult<EndUserSubscriptionResponseDto>.Fail("Plan not found");
                }

                // Get tenant's MercadoPago configuration
                var mpConfig = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.IsActive);

                if (mpConfig == null || string.IsNullOrEmpty(mpConfig.AccessToken))
                {
                    return ServiceResult<EndUserSubscriptionResponseDto>.Fail("Payment system not configured");
                }

                MercadoPagoConfig.AccessToken = mpConfig.AccessToken;

                // Create external reference
                var externalRef = $"{tenantId}#pago#{endUser!.Id}#{plan.Id}#{DateTime.UtcNow:yyyyMMddHHmmss}";

                // Calculate membership period
                var membershipEnd = DateTime.UtcNow.AddDays(plan.DurationDays);

                // Create preference
                var preferenceRequest = new PreferenceRequest
                {
                    Items = new List<PreferenceItemRequest>
                    {
                        new PreferenceItemRequest
                        {
                            Id = plan.Id.ToString(),
                            Title = plan.Name,
                            Description = plan.Description ?? $"Plan {plan.Name}",
                            Quantity = 1,
                            CurrencyId = plan.Currency,
                            UnitPrice = plan.Price
                        }
                    },
                    Payer = new PreferencePayerRequest
                    {
                        Name = $"{endUser.FirstName} {endUser.LastName}".Trim(),
                        Email = endUser.Email
                    },
                    BackUrls = new PreferenceBackUrlsRequest
                    {
                        Success = $"{_configuration["FrontendUrl"]}/subscription/success",
                        Failure = $"{_configuration["FrontendUrl"]}/subscription/failed",
                        Pending = $"{_configuration["FrontendUrl"]}/subscription/pending"
                    },
                    AutoReturn = "approved",
                    NotificationUrl = $"{_configuration["BaseUrl"]}/api/webhooks/enduser/mercadopago/{tenantId}",
                    ExternalReference = externalRef,
                    ExpirationDateTo = DateTime.UtcNow.AddHours(24),
                    Expires = true
                };

                var client = new PreferenceClient();
                var preference = await client.CreateAsync(preferenceRequest);

                // Create membership record
                var membership = new Membership
                {
                    TenantId = tenantId,
                    EndUserId = endUser.Id,
                    PlanId = plan.Id,
                    StartDate = DateTime.UtcNow,
                    EndDate = membershipEnd,
                    Status = "pending",
                    AmountPaid = plan.Price,
                    PreferenceId = preference.Id
                };

                _context.Memberships.Add(membership);

                // Create payment record
                var payment = new EndUserPayment
                {
                    TenantId = tenantId,
                    EndUserId = endUser.Id,
                    MembershipId = membership.Id,
                    PlanId = plan.Id,
                    Amount = plan.Price,
                    Currency = plan.Currency,
                    Status = "pending",
                    PaymentType = "subscription",
                    PreferenceId = preference.Id,
                    ExternalReference = externalRef,
                    ExpiresAt = preference.ExpirationDateTo
                };

                _context.EndUserPayments.Add(payment);

                // Update end user status
                endUser.Status = "DEMO_EXPIRADO"; // They're moving from demo to paid
                endUser.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Generate QR code and deep link
                var qrCode = await GeneratePaymentQRCodeAsync(preference.InitPoint);
                var deepLink = $"mercadopago://checkout/v1/redirect?preference_id={preference.Id}";

                return ServiceResult<EndUserSubscriptionResponseDto>.Ok(new EndUserSubscriptionResponseDto
                {
                    MembershipId = membership.Id,
                    PaymentLink = preference.InitPoint ?? "",
                    PreferenceId = preference.Id,
                    Amount = plan.Price,
                    ExpiresAt = preference.ExpirationDateTo ?? DateTime.UtcNow.AddHours(24),
                    QrCode = qrCode,
                    DeepLink = deepLink
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating end user subscription");
                return ServiceResult<EndUserSubscriptionResponseDto>.Fail("Error creating subscription");
            }
        }

        public async Task<ServiceResult<RenewalPaymentResponseDto>> CreateRenewalPaymentAsync(CreateRenewalPaymentDto dto)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();

                var endUser = await _context.EndUsers.FindAsync(dto.EndUserId);
                if (endUser == null || endUser.TenantId != tenantId)
                {
                    return ServiceResult<RenewalPaymentResponseDto>.Fail("User not found");
                }

                var plan = await _context.TenantPlans.FindAsync(dto.PlanId);
                if (plan == null || plan.TenantId != tenantId)
                {
                    return ServiceResult<RenewalPaymentResponseDto>.Fail("Plan not found");
                }

                // Create subscription DTO and reuse the subscription logic
                var subscriptionDto = new CreateEndUserSubscriptionDto
                {
                    PlanId = dto.PlanId,
                    Email = endUser.Email,
                    FirstName = endUser.FirstName,
                    LastName = endUser.LastName,
                    Phone = endUser.Phone
                };

                var result = await CreateEndUserSubscriptionAsync(subscriptionDto);
                if (!result.Success || result.Data == null)
                {
                    return ServiceResult<RenewalPaymentResponseDto>.Fail(result.Message);
                }

                return ServiceResult<RenewalPaymentResponseDto>.Ok(new RenewalPaymentResponseDto
                {
                    PaymentLink = result.Data.PaymentLink,
                    PreferenceId = result.Data.PreferenceId,
                    Amount = result.Data.Amount,
                    ExpiresAt = result.Data.ExpiresAt,
                    QrCode = result.Data.QrCode
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating renewal payment");
                return ServiceResult<RenewalPaymentResponseDto>.Fail("Error creating renewal payment");
            }
        }

        public async Task<ServiceResult<bool>> ProcessEndUserPaymentWebhookAsync(string tenantId, string paymentId)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<bool>.Fail("Invalid tenant ID");
                }

                // Get tenant's MercadoPago configuration
                var mpConfig = await _context.MercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.TenantId == tenantGuid && c.IsActive);

                if (mpConfig == null)
                {
                    return ServiceResult<bool>.Fail("MercadoPago configuration not found");
                }

                MercadoPagoConfig.AccessToken = mpConfig.AccessToken;

                // Get payment from MercadoPago
                var paymentClient = new PaymentClient();
                var payment = await paymentClient.GetAsync(long.Parse(paymentId));

                if (payment?.ExternalReference == null)
                {
                    return ServiceResult<bool>.Fail("Invalid payment");
                }

                // Find the payment record
                var endUserPayment = await _context.EndUserPayments
                    .Include(p => p.EndUser)
                    .Include(p => p.Membership)
                    .FirstOrDefaultAsync(p => p.ExternalReference == payment.ExternalReference);

                if (endUserPayment == null)
                {
                    _logger.LogWarning("End user payment not found for external reference: {ExternalReference}", payment.ExternalReference);
                    return ServiceResult<bool>.Ok(true);
                }

                // Update payment status
                endUserPayment.MercadoPagoPaymentId = paymentId;
                endUserPayment.Status = MapPaymentStatus(payment.Status);
                endUserPayment.PaymentMethod = payment.PaymentMethodId;
                endUserPayment.UpdatedAt = DateTime.UtcNow;

                if (payment.Status == "approved")
                {
                    endUserPayment.PaidAt = DateTime.UtcNow;

                    // Update membership status
                    if (endUserPayment.Membership != null)
                    {
                        endUserPayment.Membership.Status = "active";
                        endUserPayment.Membership.UpdatedAt = DateTime.UtcNow;
                    }

                    // Update end user status
                    var endUser = endUserPayment.EndUser;
                    endUser.Status = "PAGÓ_ACTIVO";
                    endUser.MembershipStartedAt = DateTime.UtcNow;
                    endUser.MembershipEndsAt = endUserPayment.Membership?.EndDate;
                    endUser.CurrentPlanType = endUserPayment.Membership?.Plan?.Code;
                    endUser.CurrentPlanAmount = endUserPayment.Amount;
                    endUser.UpdatedAt = DateTime.UtcNow;

                    _logger.LogInformation("End user {Email} payment approved, membership activated", endUser.Email);
                }

                await _context.SaveChangesAsync();
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing end user payment webhook");
                return ServiceResult<bool>.Fail("Error processing payment");
            }
        }

        public async Task<ServiceResult<bool>> UpdateEndUserStatusAsync(Guid endUserId, string newStatus)
        {
            try
            {
                var endUser = await _context.EndUsers.FindAsync(endUserId);
                if (endUser == null)
                {
                    return ServiceResult<bool>.Fail("User not found");
                }

                endUser.Status = newStatus;
                endUser.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating end user status");
                return ServiceResult<bool>.Fail("Error updating user status");
            }
        }

        public async Task<ServiceResult<List<EndUserResponseDto>>> GetTenantEndUsersAsync(int page = 1, int pageSize = 50)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                
                var users = await _context.EndUsers
                    .Where(u => u.TenantId == tenantId)
                    .OrderByDescending(u => u.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(u => MapToResponseDto(u))
                    .ToListAsync();

                return ServiceResult<List<EndUserResponseDto>>.Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tenant end users");
                return ServiceResult<List<EndUserResponseDto>>.Fail("Error retrieving users");
            }
        }

        public async Task<ServiceResult<bool>> HasActiveAccessAsync(string email)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                var endUser = await _context.EndUsers
                    .FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);

                if (endUser == null)
                {
                    return ServiceResult<bool>.Ok(false);
                }

                var hasAccess = IsUserActiveByStatus(endUser);
                return ServiceResult<bool>.Ok(hasAccess);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking user access");
                return ServiceResult<bool>.Fail("Error checking access");
            }
        }

        public async Task<ServiceResult<List<EndUserResponseDto>>> GetUsersNeedingRenewalRemindersAsync(int daysBeforeExpiry = 3)
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                var reminderDate = DateTime.UtcNow.AddDays(daysBeforeExpiry).Date;

                var users = await _context.EndUsers
                    .Where(u => u.TenantId == tenantId &&
                               u.Status == "PAGÓ_ACTIVO" &&
                               u.MembershipEndsAt.HasValue &&
                               u.MembershipEndsAt.Value.Date == reminderDate &&
                               (u.LastRenewalReminderSentAt == null || 
                                u.LastRenewalReminderSentAt.Value.Date != DateTime.UtcNow.Date))
                    .ToListAsync();

                var result = users.Select(MapToResponseDto).ToList();
                return ServiceResult<List<EndUserResponseDto>>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting users needing renewal reminders");
                return ServiceResult<List<EndUserResponseDto>>.Fail("Error retrieving users");
            }
        }

        public async Task<ServiceResult<List<EndUserResponseDto>>> GetDemoExpiringTodayAsync()
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                var today = DateTime.UtcNow.Date;

                var users = await _context.EndUsers
                    .Where(u => u.TenantId == tenantId &&
                               u.Status == "DEMO_ACTIVO" &&
                               u.DemoEndsAt.HasValue &&
                               u.DemoEndsAt.Value.Date == today)
                    .ToListAsync();

                var result = users.Select(MapToResponseDto).ToList();
                return ServiceResult<List<EndUserResponseDto>>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting demo expiring users");
                return ServiceResult<List<EndUserResponseDto>>.Fail("Error retrieving users");
            }
        }

        public async Task<ServiceResult<List<EndUserResponseDto>>> GetUsersNeedingRecoveryEmailsAsync()
        {
            try
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                var threeDaysAgo = DateTime.UtcNow.AddDays(-3).Date;
                var oneWeekAgo = DateTime.UtcNow.AddDays(-7).Date;

                var users = await _context.EndUsers
                    .Where(u => u.TenantId == tenantId &&
                               (u.Status == "VENCIDO" || u.Status == "DEMO_EXPIRADO") &&
                               ((u.RecoveryEmailSentAt == null && u.UpdatedAt.Date == threeDaysAgo) ||
                                (u.RecoveryEmailCount < 3 && u.UpdatedAt.Date == oneWeekAgo)))
                    .ToListAsync();

                var result = users.Select(MapToResponseDto).ToList();
                return ServiceResult<List<EndUserResponseDto>>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting users needing recovery emails");
                return ServiceResult<List<EndUserResponseDto>>.Fail("Error retrieving users");
            }
        }

        #region Private Methods

        private EndUserResponseDto MapToResponseDto(EndUser endUser)
        {
            var daysRemaining = 0;
            if (endUser.Status == "DEMO_ACTIVO" && endUser.DemoEndsAt.HasValue)
            {
                daysRemaining = Math.Max(0, (int)(endUser.DemoEndsAt.Value - DateTime.UtcNow).TotalDays);
            }
            else if (endUser.Status == "PAGÓ_ACTIVO" && endUser.MembershipEndsAt.HasValue)
            {
                daysRemaining = Math.Max(0, (int)(endUser.MembershipEndsAt.Value - DateTime.UtcNow).TotalDays);
            }

            return new EndUserResponseDto
            {
                Id = endUser.Id,
                Email = endUser.Email,
                FirstName = endUser.FirstName,
                LastName = endUser.LastName,
                Phone = endUser.Phone,
                Status = endUser.Status,
                DemoEndsAt = endUser.DemoEndsAt,
                MembershipEndsAt = endUser.MembershipEndsAt,
                CurrentPlanType = endUser.CurrentPlanType,
                CurrentPlanAmount = endUser.CurrentPlanAmount,
                DaysRemaining = daysRemaining,
                HasActiveAccess = IsUserActiveByStatus(endUser)
            };
        }

        private async Task<EndUserStatusDto> CalculateCurrentUserStatus(EndUser endUser)
        {
            var now = DateTime.UtcNow;
            var hasActiveAccess = false;
            var requiresPayment = false;
            string? renewalLink = null;
            DateTime? expiresAt = null;
            var inDemoMode = false;

            // Demo period logic
            if (endUser.Status == "DEMO_ACTIVO" && endUser.DemoEndsAt.HasValue)
            {
                if (endUser.DemoEndsAt.Value > now)
                {
                    hasActiveAccess = true;
                    inDemoMode = true;
                    expiresAt = endUser.DemoEndsAt;
                    
                    // Check if demo ends in 2 days or less - should require payment
                    if ((endUser.DemoEndsAt.Value - now).TotalDays <= 2)
                    {
                        requiresPayment = true;
                    }
                }
                else
                {
                    // Demo expired
                    endUser.Status = "DEMO_EXPIRADO";
                    requiresPayment = true;
                    await _context.SaveChangesAsync();
                }
            }

            // Paid membership logic
            if (endUser.Status == "PAGÓ_ACTIVO" && endUser.MembershipEndsAt.HasValue)
            {
                if (endUser.MembershipEndsAt.Value > now)
                {
                    hasActiveAccess = true;
                    expiresAt = endUser.MembershipEndsAt;
                    
                    // Check if membership ends in 3 days or less
                    var daysUntilExpiry = (endUser.MembershipEndsAt.Value - now).TotalDays;
                    if (daysUntilExpiry <= 3)
                    {
                        endUser.Status = "POR_VENCER";
                        requiresPayment = true;
                        await _context.SaveChangesAsync();
                    }
                }
                else
                {
                    // Membership expired
                    endUser.Status = "VENCIDO";
                    requiresPayment = true;
                    await _context.SaveChangesAsync();
                }
            }

            return new EndUserStatusDto
            {
                Status = endUser.Status,
                HasActiveAccess = hasActiveAccess,
                AccessExpiresAt = expiresAt,
                DaysRemaining = expiresAt.HasValue ? Math.Max(0, (int)(expiresAt.Value - now).TotalDays) : 0,
                CurrentPlanType = endUser.CurrentPlanType,
                CurrentPlanAmount = endUser.CurrentPlanAmount,
                InDemoMode = inDemoMode,
                DemoEndsAt = endUser.DemoEndsAt,
                RenewalPaymentLink = renewalLink,
                RequiresPayment = requiresPayment
            };
        }

        private bool IsUserActiveByStatus(EndUser endUser)
        {
            var now = DateTime.UtcNow;
            
            return endUser.Status switch
            {
                "DEMO_ACTIVO" => endUser.DemoEndsAt.HasValue && endUser.DemoEndsAt.Value > now,
                "PAGÓ_ACTIVO" => endUser.MembershipEndsAt.HasValue && endUser.MembershipEndsAt.Value > now,
                "POR_VENCER" => endUser.MembershipEndsAt.HasValue && endUser.MembershipEndsAt.Value > now,
                _ => false
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

        private async Task<string> GeneratePaymentQRCodeAsync(string? paymentUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(paymentUrl))
                    return "";

                using var qrGenerator = new QRCodeGenerator();
                var qrCodeData = qrGenerator.CreateQrCode(paymentUrl, QRCodeGenerator.ECCLevel.Q);
                using var qrCode = new PngByteQRCode(qrCodeData);
                var qrCodeImage = qrCode.GetGraphic(20);
                var base64 = Convert.ToBase64String(qrCodeImage);
                
                return $"data:image/png;base64,{base64}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating QR code");
                return "";
            }
        }

        #endregion
    }
}