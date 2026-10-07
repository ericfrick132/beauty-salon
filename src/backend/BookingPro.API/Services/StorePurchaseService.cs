using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Compras in-app de add-ons y créditos de mensajería. En iOS se cobran con la App Store
    /// (guideline 3.1.1), nunca con Mercado Pago; acá se verifican y se acredita exactamente lo
    /// mismo que acredita el webhook de Mercado Pago.
    ///
    /// Product IDs (mismo prefijo que la suscripción com.ericfrick.turnospro.pro.mensual):
    ///   com.ericfrick.turnospro.addon.&lt;code&gt;      → 1 mes del add-on FeatureAddon.Code (non-renewing)
    ///   com.ericfrick.turnospro.creditos.&lt;cantidad&gt; → &lt;cantidad&gt; créditos de mensajería (consumible)
    /// </summary>
    public class StorePurchaseService : IStorePurchaseService
    {
        public const string ProductPrefix = "com.ericfrick.turnospro.";
        private const string AddonSegment = "addon.";
        private const string CreditsSegment = "creditos.";

        private readonly ApplicationDbContext _context;
        private readonly IAppleAppStoreService _appleService;
        private readonly IFeatureAddonService _featureAddonService;
        private readonly IPlatformPaymentService _platformPaymentService;
        private readonly ILogger<StorePurchaseService> _logger;

        public StorePurchaseService(
            ApplicationDbContext context,
            IAppleAppStoreService appleService,
            IFeatureAddonService featureAddonService,
            IPlatformPaymentService platformPaymentService,
            ILogger<StorePurchaseService> logger)
        {
            _context = context;
            _appleService = appleService;
            _featureAddonService = featureAddonService;
            _platformPaymentService = platformPaymentService;
            _logger = logger;
        }

        /// <summary>Qué otorga un product id: ("addon", code, meses) o ("credits", null, cantidad).</summary>
        public static (string Kind, string? AddonCode, int Quantity)? ResolveProduct(string? productId)
        {
            if (string.IsNullOrWhiteSpace(productId) ||
                !productId.StartsWith(ProductPrefix, StringComparison.OrdinalIgnoreCase))
                return null;

            var rest = productId[ProductPrefix.Length..].ToLowerInvariant();
            if (rest.StartsWith(AddonSegment))
            {
                var code = rest[AddonSegment.Length..];
                return string.IsNullOrEmpty(code) || code.Contains('.') ? null : ("addon", code, 1);
            }
            if (rest.StartsWith(CreditsSegment) &&
                int.TryParse(rest[CreditsSegment.Length..], out var qty) && qty > 0)
            {
                return ("credits", null, qty);
            }
            return null;
        }

        public async Task<ServiceResult<StorePurchaseResultDto>> ProcessPurchaseAsync(Guid tenantId, StorePurchaseRequestDto dto)
        {
            var store = (dto.Store ?? "apple").Trim().ToLowerInvariant();
            if (store == "google")
                return ServiceResult<StorePurchaseResultDto>.Fail("Las compras de Google Play todavía no están habilitadas");
            if (store != "apple")
                return ServiceResult<StorePurchaseResultDto>.Fail("Tienda no soportada");
            if (string.IsNullOrWhiteSpace(dto.TransactionId))
                return ServiceResult<StorePurchaseResultDto>.Fail("transactionId requerido");

            try
            {
                // Idempotencia: una transacción ya acreditada no se vuelve a acreditar (la app la
                // reenvía en reintentos, Transaction.updates y restauraciones).
                var existing = await FindAsync(store, dto.TransactionId);
                if (existing != null) return AlreadyProcessed(existing, tenantId);

                if (!_appleService.IsConfigured)
                    return ServiceResult<StorePurchaseResultDto>.Fail("Apple IAP no está configurado en el servidor");

                var info = await _appleService.GetTransactionInfoAsync(dto.TransactionId);
                if (info == null || string.IsNullOrEmpty(info.TransactionId))
                    return ServiceResult<StorePurchaseResultDto>.Fail("No pudimos verificar la compra con Apple");

                if (!string.IsNullOrEmpty(_appleService.BundleId) &&
                    !string.Equals(info.BundleId, _appleService.BundleId, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Apple in-app {Tx}: bundleId {Got} != {Expected}", info.TransactionId, info.BundleId, _appleService.BundleId);
                    return ServiceResult<StorePurchaseResultDto>.Fail("La compra no corresponde a esta app");
                }
                if (info.RevocationDate.HasValue)
                    return ServiceResult<StorePurchaseResultDto>.Fail("Apple reembolsó o revocó esta compra");

                // Lo que se acredita sale del producto que Apple dice que se pagó, no del body.
                var grant = ResolveProduct(info.ProductId);
                if (grant == null)
                {
                    _logger.LogWarning("Apple in-app {Tx}: producto {Product} no es un add-on ni un paquete de créditos",
                        info.TransactionId, info.ProductId);
                    return ServiceResult<StorePurchaseResultDto>.Fail("Producto desconocido");
                }

                if (Guid.TryParse(info.AppAccountToken, out var purchasedFor) && purchasedFor != tenantId)
                {
                    _logger.LogWarning("Apple in-app {Tx} was purchased for tenant {Other}, not {TenantId}",
                        info.TransactionId, purchasedFor, tenantId);
                    return ServiceResult<StorePurchaseResultDto>.Fail("Esta compra está asociada a otro negocio");
                }

                // El id que manda la app puede no ser el canónico: se vuelve a chequear con el de Apple.
                existing = await FindAsync(store, info.TransactionId);
                if (existing != null) return AlreadyProcessed(existing, tenantId);

                var (kind, addonCode, quantity) = grant.Value;
                if (kind == "addon" && !await _context.FeatureAddons.AnyAsync(a => a.Code == addonCode))
                {
                    _logger.LogWarning("Apple in-app {Tx}: add-on {Code} no existe en el catálogo", info.TransactionId, addonCode);
                    return ServiceResult<StorePurchaseResultDto>.Fail("Add-on desconocido");
                }

                var purchase = new StorePurchase
                {
                    TenantId = tenantId,
                    Store = store,
                    ProductId = info.ProductId!,
                    TransactionId = info.TransactionId,
                    OriginalTransactionId = info.OriginalTransactionId,
                    Kind = kind,
                    AddonCode = addonCode,
                    Quantity = quantity,
                    Price = info.Price,
                    Currency = info.Currency,
                    Environment = info.Environment,
                    Status = "granted",
                    PurchasedAt = info.PurchaseDate
                };

                var result = new StorePurchaseResultDto { Granted = true, Kind = kind, AddonCode = addonCode, Quantity = quantity };

                // Registro + acreditación en una sola transacción: si algo falla no queda la compra
                // registrada sin acreditar (la app reintenta porque no finaliza la transacción).
                await using (var tx = await _context.Database.BeginTransactionAsync())
                {
                    _context.StorePurchases.Add(purchase);
                    try
                    {
                        await _context.SaveChangesAsync();
                    }
                    catch (DbUpdateException)
                    {
                        // Otra request acreditó la misma transacción en paralelo (índice único).
                        await tx.RollbackAsync();
                        _context.Entry(purchase).State = EntityState.Detached;
                        var raced = await FindAsync(store, info.TransactionId);
                        if (raced != null) return AlreadyProcessed(raced, tenantId);
                        throw;
                    }

                    if (kind == "addon")
                    {
                        var activated = await _featureAddonService.ActivateAsync(tenantId, addonCode!, quantity, "apple_iap");
                        if (!activated.Success)
                        {
                            await tx.RollbackAsync();
                            return ServiceResult<StorePurchaseResultDto>.Fail("No pudimos activar el add-on. Probá de nuevo.");
                        }
                        result.PaidUntil = await _context.TenantFeatureAddons.IgnoreQueryFilters()
                            .Where(a => a.TenantId == tenantId && a.AddonCode == addonCode)
                            .Select(a => a.PaidUntil).FirstOrDefaultAsync();
                    }
                    else
                    {
                        result.Balance = await _platformPaymentService.CreditMessageWalletAsync(tenantId, quantity);
                    }

                    await tx.CommitAsync();
                }

                _logger.LogInformation(
                    "Apple in-app {Kind} granted to tenant {TenantId}: product {Product}, tx {Tx}, quantity {Qty}, environment {Env}",
                    kind, tenantId, info.ProductId, info.TransactionId, quantity, info.Environment);

                return ServiceResult<StorePurchaseResultDto>.Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing store purchase {Tx} for tenant {TenantId}", dto.TransactionId, tenantId);
                return ServiceResult<StorePurchaseResultDto>.Fail("Error al procesar la compra");
            }
        }

        public async Task<bool> ProcessAppleRefundAsync(string? transactionId)
        {
            if (string.IsNullOrEmpty(transactionId)) return false;
            var purchase = await FindAsync("apple", transactionId);
            if (purchase == null) return false;
            if (purchase.Status == "refunded") return true;

            var now = DateTime.UtcNow;
            if (purchase.Kind == "addon" && purchase.AddonCode != null)
            {
                // Se descuenta el período reembolsado sin dejar la vigencia en el pasado.
                var owned = await _context.TenantFeatureAddons.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(a => a.TenantId == purchase.TenantId && a.AddonCode == purchase.AddonCode);
                if (owned?.PaidUntil != null)
                {
                    var shortened = owned.PaidUntil.Value.AddMonths(-purchase.Quantity);
                    owned.PaidUntil = shortened > now ? shortened : now;
                    owned.UpdatedAt = now;
                }
            }
            else if (purchase.Kind == "credits")
            {
                // Se quitan los créditos reembolsados que todavía no se usaron.
                var wallet = await _context.TenantMessageWallets.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(w => w.TenantId == purchase.TenantId);
                if (wallet != null)
                {
                    wallet.Balance = Math.Max(0, wallet.Balance - purchase.Quantity);
                    wallet.TotalPurchased = Math.Max(0, wallet.TotalPurchased - purchase.Quantity);
                    wallet.UpdatedAt = now;
                }
            }

            purchase.Status = "refunded";
            purchase.RefundedAt = now;
            purchase.UpdatedAt = now;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Apple in-app {Kind} refunded for tenant {TenantId}: product {Product}, tx {Tx}",
                purchase.Kind, purchase.TenantId, purchase.ProductId, purchase.TransactionId);
            return true;
        }

        private Task<StorePurchase?> FindAsync(string store, string transactionId) =>
            _context.StorePurchases.FirstOrDefaultAsync(p => p.Store == store && p.TransactionId == transactionId);

        private ServiceResult<StorePurchaseResultDto> AlreadyProcessed(StorePurchase p, Guid tenantId)
        {
            if (p.TenantId != tenantId)
            {
                _logger.LogWarning("Store purchase {Tx} already granted to tenant {Other}; rejected for {TenantId}",
                    p.TransactionId, p.TenantId, tenantId);
                return ServiceResult<StorePurchaseResultDto>.Fail("Esta compra está asociada a otro negocio");
            }
            return ServiceResult<StorePurchaseResultDto>.Ok(new StorePurchaseResultDto
            {
                Granted = p.Status == "granted",
                AlreadyProcessed = true,
                Kind = p.Kind,
                AddonCode = p.AddonCode,
                Quantity = p.Quantity
            });
        }
    }
}
