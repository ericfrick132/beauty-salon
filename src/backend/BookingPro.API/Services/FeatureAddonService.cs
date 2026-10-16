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
        private readonly IPlatformPaymentConnectionService _platformConnections;
        private readonly IPlanEntitlementService _plans;

        /// <summary>Source de un add-on que viene incluido en el plan del negocio (no se compra aparte).</summary>
        public const string PlanSource = "plan";

        public FeatureAddonService(
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<FeatureAddonService> logger,
            IPlatformPaymentConnectionService platformConnections,
            IPlanEntitlementService plans)
        {
            _plans = plans;
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _platformConnections = platformConnections;
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

            // Detección de transferencias en Mercado Pago (ver TransferDetectionService).
            var transferPrice = _configuration.GetValue("FeatureAddons:TransferDetectionMonthlyPrice", 20000m);
            var transfer = await _context.FeatureAddons.FirstOrDefaultAsync(a => a.Code == FeatureCodes.TransferDetection);
            if (transfer == null)
            {
                _context.FeatureAddons.Add(new FeatureAddon
                {
                    Code = FeatureCodes.TransferDetection,
                    Name = "Detección de transferencias",
                    Description = "Las señas que tus clientes te transfieren a Mercado Pago se acreditan solas en el turno, sin comisión por cobro y sin revisar comprobantes. Si el cliente manda la captura por WhatsApp, se le confirma por el mismo chat.",
                    MonthlyPrice = transferPrice,
                    Currency = "ARS",
                    IsActive = true,
                    DisplayOrder = 2
                });
                changed = true;
            }
            else if (transfer.MonthlyPrice != transferPrice || !transfer.IsActive)
            {
                transfer.MonthlyPrice = transferPrice;
                transfer.IsActive = true;
                changed = true;
            }

            // Asistente de WhatsApp por menú (ver WhatsAppMenuBotService): reserva, consulta y cancela turnos sin IA.
            var menuBotPrice = _configuration.GetValue("FeatureAddons:MenuBotMonthlyPrice", 20000m);
            var menuBot = await _context.FeatureAddons.FirstOrDefaultAsync(a => a.Code == FeatureCodes.MenuBot);
            if (menuBot == null)
            {
                _context.FeatureAddons.Add(new FeatureAddon
                {
                    Code = FeatureCodes.MenuBot,
                    Name = "Asistente de WhatsApp",
                    Description = "Tus clientes reservan, consultan y cancelan turnos por WhatsApp respondiendo con números, 24/7, desde tu propio número y sin que nadie del negocio conteste.",
                    MonthlyPrice = menuBotPrice,
                    Currency = "ARS",
                    IsActive = true,
                    DisplayOrder = 0
                });
                changed = true;
            }
            else if (menuBot.MonthlyPrice != menuBotPrice || !menuBot.IsActive)
            {
                menuBot.MonthlyPrice = menuBotPrice;
                menuBot.IsActive = true;
                changed = true;
            }

            // El Agente IA se discontinuó como producto: ya no se ofrece ni se puede
            // comprar. Si quedó sembrado de antes, lo desactivamos para que no aparezca
            // en el catálogo (GetTenantAddonsAsync filtra por IsActive). No se borra el
            // registro para no romper a quien ya lo tuviera activo.
            var aiAgent = await _context.FeatureAddons
                .FirstOrDefaultAsync(a => a.Code == FeatureCodes.AiAgent);
            if (aiAgent != null && aiAgent.IsActive)
            {
                aiAgent.IsActive = false;
                changed = true;
            }

            if (changed)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Feature addons seed ensured (confirmation_bot activo; ai_agent desactivado)");
            }
        }

        /// <summary>Source de una prueba gratis dada por el super admin (vence sola por PaidUntil).</summary>
        public const string TrialSource = "trial";

        public async Task<bool> HasActiveAddonAsync(Guid tenantId, string code)
        {
            if (await _plans.PlanIncludesAddonAsync(tenantId, code)) return true;

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

                var includedByPlan = new HashSet<string>();
                foreach (var a in addons)
                    if (await _plans.PlanIncludesAddonAsync(tenantId, a.Code)) includedByPlan.Add(a.Code);

                var result = addons.Select(a =>
                {
                    var owned = tenantAddons.FirstOrDefault(t => t.AddonCode == a.Code);
                    var bought = owned != null && owned.Status == "active" && owned.PaidUntil > now;
                    var included = includedByPlan.Contains(a.Code);
                    return new FeatureAddonStatusDto
                    {
                        Code = a.Code,
                        Name = a.Name,
                        Description = a.Description,
                        MonthlyPrice = a.MonthlyPrice,
                        Currency = a.Currency,
                        Active = bought || included,
                        PaidUntil = owned?.PaidUntil,
                        HasPendingPurchase = pendingPurchases.Contains(a.Code),
                        // Incluido en el plan pisa a la compra: el panel no le ofrece pagar algo que ya tiene.
                        Source = included ? PlanSource : owned?.Source,
                        IsTrial = !included && owned?.Source == TrialSource
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

        public async Task<ServiceResult<List<SuperAdminAddonsRowDto>>> GetAllTenantsAddonsAsync()
        {
            try
            {
                var now = DateTime.UtcNow;
                var catalog = await _context.FeatureAddons.Where(a => a.IsActive).OrderBy(a => a.DisplayOrder).ToListAsync();
                var tenants = await _context.Tenants.OrderBy(t => t.BusinessName).ToListAsync();
                var owned = await _context.TenantFeatureAddons.IgnoreQueryFilters().ToListAsync();

                var rows = tenants.Select(t =>
                {
                    var mine = owned.Where(o => o.TenantId == t.Id).ToList();
                    var addons = catalog.Select(a =>
                    {
                        var o = mine.FirstOrDefault(x => x.AddonCode == a.Code);
                        return new SuperAdminTenantAddonDto
                        {
                            Code = a.Code,
                            Name = a.Name,
                            Active = o != null && o.Status == "active" && o.PaidUntil > now,
                            PaidUntil = o?.PaidUntil,
                            Source = o?.Source,
                        };
                    }).ToList();

                    return new SuperAdminAddonsRowDto
                    {
                        TenantId = t.Id,
                        BusinessName = t.BusinessName ?? "",
                        Subdomain = t.Subdomain ?? "",
                        Status = t.Status ?? "",
                        Addons = addons,
                        // Las pruebas gratis no facturan.
                        MonthlyTotal = addons.Where(x => x.Active && x.Source != TrialSource).Sum(x => catalog.First(c => c.Code == x.Code).MonthlyPrice),
                    };
                }).ToList();

                return ServiceResult<List<SuperAdminAddonsRowDto>>.Ok(rows);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listando add-ons por tenant");
                return ServiceResult<List<SuperAdminAddonsRowDto>>.Fail("Error listando add-ons");
            }
        }

        public async Task<ServiceResult<PurchaseFeatureAddonResponseDto>> CreatePurchaseAsync(Guid tenantId, string code)
        {
            try
            {
                var platformAccessToken = await _platformConnections.GetAccessTokenAsync("mercadopago");
                if (string.IsNullOrWhiteSpace(platformAccessToken))
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

                MercadoPagoConfig.AccessToken = platformAccessToken;

                var externalRef = $"ADDON-{tenantId}-{code}-{DateTime.UtcNow:yyyyMMddHHmmss}";
                var returnPath = code == FeatureCodes.AiAgent ? "agente-ia"
                    : code == FeatureCodes.TransferDetection ? "transfer-detection"
                    : code == FeatureCodes.MenuBot ? "whatsapp-bot"
                    : "confirmation-bot";

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

        /// <summary>
        /// Prueba gratis de N días dada por el super admin. Se corta sola: todo lo que usa el add-on
        /// exige PaidUntil &gt; ahora. Si el negocio lo paga durante la prueba, ActivateAsync suma los
        /// meses desde el fin de la prueba. No pisa un add-on pago u otorgado que siga vigente.
        /// </summary>
        public async Task<ServiceResult<bool>> StartTrialAsync(Guid tenantId, string code, int days)
        {
            try
            {
                if (days < 1 || days > 60) return ServiceResult<bool>.Fail("La prueba tiene que ser de 1 a 60 días");
                if (!await _context.FeatureAddons.AnyAsync(a => a.Code == code && a.IsActive))
                    return ServiceResult<bool>.Fail("Add-on desconocido o desactivado");
                if (!await _context.Tenants.AnyAsync(t => t.Id == tenantId))
                    return ServiceResult<bool>.Fail("Negocio no encontrado");

                var now = DateTime.UtcNow;
                var owned = await _context.TenantFeatureAddons
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AddonCode == code);
                if (owned != null && owned.Status == "active" && owned.PaidUntil > now && owned.Source != TrialSource)
                    return ServiceResult<bool>.Fail("Ya tiene el add-on activo (pago u otorgado): no hace falta prueba");

                if (owned == null)
                {
                    owned = new TenantFeatureAddon { TenantId = tenantId, AddonCode = code, ActivatedAt = now };
                    _context.TenantFeatureAddons.Add(owned);
                }
                owned.Status = "active";
                owned.Source = TrialSource;
                owned.PaidUntil = now.AddDays(days);
                owned.ActivatedAt ??= now;
                owned.UpdatedAt = now;

                await _context.SaveChangesAsync();
                _logger.LogInformation("Trial of addon {Code} for tenant {TenantId} until {PaidUntil}", code, tenantId, owned.PaidUntil);
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting addon trial {Code} for tenant {TenantId}", code, tenantId);
                return ServiceResult<bool>.Fail("Error starting trial");
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
