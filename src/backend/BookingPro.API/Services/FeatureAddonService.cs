using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using MercadoPago.Client.Preference;
using MercadoPago.Config;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class FeatureAddonService : IFeatureAddonService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<FeatureAddonService> _logger;

        public FeatureAddonService(
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<FeatureAddonService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task EnsureSeedAsync()
        {
            var changed = false;

            var confirmationBotPrice = _configuration.GetValue("FeatureAddons:ConfirmationBotMonthlyPrice", 20000m);
            var confirmationBot = await _context.FeatureAddons
                .FirstOrDefaultAsync(a => a.Code == FeatureCodes.ConfirmationBot);
            if (confirmationBot == null)
            {
                _context.FeatureAddons.Add(new FeatureAddon
                {
                    Code = FeatureCodes.ConfirmationBot,
                    Name = "Bot de Confirmación de Turnos",
                    Description = "Asistente automático por WhatsApp que pide confirmación de asistencia antes de cada turno y procesa las respuestas: confirma o cancela el turno solo, desde tu propio número.",
                    MonthlyPrice = confirmationBotPrice,
                    Currency = "ARS",
                    IsActive = true,
                    DisplayOrder = 1
                });
                changed = true;
            }
            else if (confirmationBot.MonthlyPrice != confirmationBotPrice)
            {
                // Mantener el precio sincronizado con la configuración (el seed original
                // insertaba a 8000 y nunca lo actualizaba).
                confirmationBot.MonthlyPrice = confirmationBotPrice;
                changed = true;
            }

            if (!await _context.FeatureAddons.AnyAsync(a => a.Code == FeatureCodes.AiAgent))
            {
                _context.FeatureAddons.Add(new FeatureAddon
                {
                    Code = FeatureCodes.AiAgent,
                    Name = "Agente IA de WhatsApp",
                    Description = "Asistente con IA que atiende a tus clientes por WhatsApp desde tu número: responde servicios, precios y disponibilidad y RESERVA turnos solo, las 24 horas.",
                    MonthlyPrice = _configuration.GetValue("FeatureAddons:AiAgentMonthlyPrice", 20000m),
                    Currency = "ARS",
                    IsActive = true,
                    DisplayOrder = 2
                });
                changed = true;
            }

            if (changed)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Feature addons seed ensured (confirmation_bot, ai_agent)");
            }
        }

        public async Task<bool> HasActiveAddonAsync(Guid tenantId, string code)
        {
            var now = DateTime.UtcNow;
            return await _context.TenantFeatureAddons
                .IgnoreQueryFilters()
                .AnyAsync(a => a.TenantId == tenantId
                    && a.AddonCode == code
                    && a.Status == "active"
                    && a.PaidUntil != null
                    && a.PaidUntil > now);
        }

        public async Task<ServiceResult<List<FeatureAddonStatusDto>>> GetTenantAddonsAsync(Guid tenantId)
        {
            try
            {
                var now = DateTime.UtcNow;
                var addons = await _context.FeatureAddons
                    .Where(a => a.IsActive)
                    .OrderBy(a => a.DisplayOrder)
                    .ToListAsync();

                var tenantAddons = await _context.TenantFeatureAddons
                    .IgnoreQueryFilters()
                    .Where(a => a.TenantId == tenantId)
                    .ToListAsync();

                var pendingPurchases = await _context.FeatureAddonPurchases
                    .IgnoreQueryFilters()
                    .Where(p => p.TenantId == tenantId && p.Status == "pending"
                        && p.CreatedAt > now.AddDays(-7))
                    .Select(p => p.AddonCode)
                    .ToListAsync();

                var result = addons.Select(a =>
                {
                    var owned = tenantAddons.FirstOrDefault(t => t.AddonCode == a.Code);
                    return new FeatureAddonStatusDto
                    {
                        Code = a.Code,
                        Name = a.Name,
                        Description = a.Description,
                        MonthlyPrice = a.MonthlyPrice,
                        Currency = a.Currency,
                        Active = owned != null && owned.Status == "active" && owned.PaidUntil > now,
                        PaidUntil = owned?.PaidUntil,
                        HasPendingPurchase = pendingPurchases.Contains(a.Code)
                    };
                }).ToList();

                return ServiceResult<List<FeatureAddonStatusDto>>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tenant addons for {TenantId}", tenantId);
                return ServiceResult<List<FeatureAddonStatusDto>>.Fail("Error getting addons");
            }
        }

        public async Task<ServiceResult<PurchaseFeatureAddonResponseDto>> CreatePurchaseAsync(Guid tenantId, string code)
        {
            try
            {
                var platformConfig = await _context.PlatformMercadoPagoConfigurations
                    .FirstOrDefaultAsync(c => c.IsActive);
                if (platformConfig == null)
                {
                    return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Platform MercadoPago not configured");
                }

                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null)
                {
                    return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Tenant not found");
                }

                var addon = await _context.FeatureAddons.FirstOrDefaultAsync(a => a.Code == code && a.IsActive);
                if (addon == null)
                {
                    return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Addon not found");
                }

                MercadoPagoConfig.AccessToken = platformConfig.AccessToken;

                var externalRef = $"ADDON-{tenantId}-{code}-{DateTime.UtcNow:yyyyMMddHHmmss}";
                var returnPath = code == FeatureCodes.AiAgent ? "agente-ia" : "confirmation-bot";

                var prefReq = new PreferenceRequest
                {
                    Items = new List<PreferenceItemRequest>
                    {
                        new PreferenceItemRequest
                        {
                            Id = addon.Id.ToString(),
                            Title = $"{addon.Name} - 1 mes",
                            Description = addon.Description,
                            Quantity = 1,
                            CurrencyId = addon.Currency,
                            UnitPrice = addon.MonthlyPrice
                        }
                    },
                    Payer = new PreferencePayerRequest
                    {
                        Name = tenant.BusinessName,
                        Email = tenant.OwnerEmail
                    },
                    BackUrls = new PreferenceBackUrlsRequest
                    {
                        Success = $"{_configuration["FrontendUrl"]}/{returnPath}?payment=success",
                        Failure = $"{_configuration["FrontendUrl"]}/{returnPath}?payment=failure",
                        Pending = $"{_configuration["FrontendUrl"]}/{returnPath}?payment=pending"
                    },
                    AutoReturn = "approved",
                    NotificationUrl = $"{_configuration["BaseUrl"]}/api/webhooks/platform/mercadopago",
                    ExternalReference = externalRef,
                    ExpirationDateTo = DateTime.UtcNow.AddDays(7),
                    Expires = true
                };

                var client = new PreferenceClient();
                var preference = await client.CreateAsync(prefReq);

                var purchase = new FeatureAddonPurchase
                {
                    TenantId = tenantId,
                    AddonCode = code,
                    Months = 1,
                    Amount = addon.MonthlyPrice,
                    Status = "pending",
                    PreferenceId = preference.Id,
                    ExternalReference = externalRef
                };
                _context.FeatureAddonPurchases.Add(purchase);
                await _context.SaveChangesAsync();

                return ServiceResult<PurchaseFeatureAddonResponseDto>.Ok(new PurchaseFeatureAddonResponseDto
                {
                    PurchaseId = purchase.Id,
                    PaymentLink = preference.InitPoint ?? string.Empty,
                    PreferenceId = preference.Id ?? string.Empty,
                    Amount = addon.MonthlyPrice,
                    ExpiresAt = preference.ExpirationDateTo ?? DateTime.UtcNow.AddDays(7)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating addon purchase for tenant {TenantId}, addon {Code}", tenantId, code);
                return ServiceResult<PurchaseFeatureAddonResponseDto>.Fail("Error creating purchase");
            }
        }

        public async Task<ServiceResult<bool>> ActivateAsync(Guid tenantId, string code, int months, string source)
        {
            try
            {
                var now = DateTime.UtcNow;
                var owned = await _context.TenantFeatureAddons
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AddonCode == code);

                if (owned == null)
                {
                    owned = new TenantFeatureAddon
                    {
                        TenantId = tenantId,
                        AddonCode = code,
                        ActivatedAt = now
                    };
                    _context.TenantFeatureAddons.Add(owned);
                }

                // Extiende desde el vencimiento vigente si todavía no venció
                var baseDate = owned.PaidUntil != null && owned.PaidUntil > now ? owned.PaidUntil.Value : now;
                owned.PaidUntil = baseDate.AddMonths(months);
                owned.Status = "active";
                owned.Source = source;
                owned.ActivatedAt ??= now;
                owned.UpdatedAt = now;

                await _context.SaveChangesAsync();
                _logger.LogInformation("Activated addon {Code} for tenant {TenantId} until {PaidUntil} (source {Source})",
                    code, tenantId, owned.PaidUntil, source);
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error activating addon {Code} for tenant {TenantId}", code, tenantId);
                return ServiceResult<bool>.Fail("Error activating addon");
            }
        }

        public async Task<ServiceResult<bool>> RevokeAsync(Guid tenantId, string code)
        {
            try
            {
                var owned = await _context.TenantFeatureAddons
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AddonCode == code);
                if (owned == null)
                {
                    return ServiceResult<bool>.Fail("Addon not found for tenant");
                }

                owned.Status = "cancelled";
                owned.PaidUntil = DateTime.UtcNow;
                owned.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking addon {Code} for tenant {TenantId}", code, tenantId);
                return ServiceResult<bool>.Fail("Error revoking addon");
            }
        }
    }
}
