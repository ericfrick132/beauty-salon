using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using System.Linq.Expressions;

namespace BookingPro.API.Services
{
    public class InventoryService : IInventoryService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<InventoryService> _logger;

        public InventoryService(ApplicationDbContext context, ILogger<InventoryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Product Categories
        public async Task<List<ProductCategoryDto>> GetCategoriesAsync(bool includeInactive = false)
        {
            var query = _context.ProductCategories
                .Include(c => c.Products)
                .AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(c => c.IsActive);
            }

            var categories = await query
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.Name)
                .Select(c => new ProductCategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    DisplayOrder = c.DisplayOrder,
                    IsActive = c.IsActive,
                    ProductCount = c.Products.Count(p => p.IsActive)
                })
                .ToListAsync();

            return categories;
        }

        public async Task<ProductCategoryDto?> GetCategoryByIdAsync(Guid id)
        {
            var category = await _context.ProductCategories
                .Include(c => c.Products)
                .Where(c => c.Id == id)
                .Select(c => new ProductCategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    DisplayOrder = c.DisplayOrder,
                    IsActive = c.IsActive,
                    ProductCount = c.Products.Count(p => p.IsActive)
                })
                .FirstOrDefaultAsync();

            return category;
        }

        public async Task<ProductCategoryDto> CreateCategoryAsync(CreateProductCategoryDto dto)
        {
            var category = new ProductCategory
            {
                Name = dto.Name,
                Description = dto.Description,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive
            };

            _context.ProductCategories.Add(category);
            await _context.SaveChangesAsync();

            return new ProductCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                DisplayOrder = category.DisplayOrder,
                IsActive = category.IsActive,
                ProductCount = 0
            };
        }

        public async Task<ProductCategoryDto> UpdateCategoryAsync(Guid id, UpdateProductCategoryDto dto)
        {
            var category = await _context.ProductCategories.FindAsync(id);
            if (category == null)
            {
                throw new KeyNotFoundException($"Category with ID {id} not found");
            }

            category.Name = dto.Name;
            category.Description = dto.Description;
            category.DisplayOrder = dto.DisplayOrder;
            category.IsActive = dto.IsActive;
            category.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetCategoryByIdAsync(id) ?? throw new InvalidOperationException("Failed to retrieve updated category");
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            var category = await _context.ProductCategories.FindAsync(id);
            if (category == null)
            {
                return false;
            }

            // Soft delete - just mark as inactive
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }

        // Products
        public async Task<List<ProductDto>> GetProductsAsync(bool includeInactive = false)
        {
            var query = _context.Products
                .Include(p => p.Category)
                .AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(p => p.IsActive);
            }

            var products = await query
                .OrderBy(p => p.Name)
                .Select(MapToProductDto())
                .ToListAsync();

            return products;
        }

        public async Task<List<ProductDto>> GetProductsByCategoryAsync(Guid categoryId)
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .Where(p => p.CategoryId == categoryId && p.IsActive)
                .OrderBy(p => p.Name)
                .Select(MapToProductDto())
                .ToListAsync();

            return products;
        }

        public async Task<List<ProductDto>> GetLowStockProductsAsync()
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .Where(p => p.IsActive && p.CurrentStock <= p.MinStock)
                .OrderBy(p => p.CurrentStock)
                .Select(MapToProductDto())
                .ToListAsync();

            return products;
        }

        public async Task<ProductDto?> GetProductByIdAsync(Guid id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Where(p => p.Id == id)
                .Select(MapToProductDto())
                .FirstOrDefaultAsync();

            return product;
        }

        public async Task<ProductDto?> GetProductByBarcodeAsync(long barcode)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Where(p => p.Barcode == barcode)
                .Select(MapToProductDto())
                .FirstOrDefaultAsync();

            return product;
        }

        public async Task<ProductDto> CreateProductAsync(CreateProductDto dto, string? createdBy = null)
        {
            // Check if barcode already exists
            var existingProduct = await _context.Products.AnyAsync(p => p.Barcode == dto.Barcode);
            if (existingProduct)
            {
                throw new InvalidOperationException($"Product with barcode {dto.Barcode} already exists");
            }

            var product = new Product
            {
                Barcode = dto.Barcode,
                Name = dto.Name,
                CategoryId = dto.CategoryId,
                Description = dto.Description,
                CostPrice = dto.CostPrice,
                SalePrice = dto.SalePrice,
                CurrentStock = dto.InitialStock,
                MinStock = dto.MinStock,
                MaxStock = dto.MaxStock,
                SKU = dto.SKU,
                Brand = dto.Brand,
                Unit = dto.Unit,
                Weight = dto.Weight,
                Location = dto.Location,
                TaxRate = dto.TaxRate,
                AllowDiscount = dto.AllowDiscount,
                MaxDiscountPercentage = dto.MaxDiscountPercentage,
                TrackInventory = dto.TrackInventory,
                IsActive = true,
                CreatedBy = createdBy
            };

            _context.Products.Add(product);

            // Create initial stock movement if there's initial stock
            if (dto.InitialStock > 0)
            {
                var stockMovement = new StockMovement
                {
                    ProductId = product.Id,
                    MovementType = "In",
                    Quantity = dto.InitialStock,
                    PreviousStock = 0,
                    NewStock = dto.InitialStock,
                    ReferenceType = "Initial",
                    Reason = "Initial stock",
                    UnitCost = dto.CostPrice,
                    PerformedBy = createdBy
                };
                _context.StockMovements.Add(stockMovement);
            }

            await _context.SaveChangesAsync();

            return await GetProductByIdAsync(product.Id) ?? throw new InvalidOperationException("Failed to retrieve created product");
        }

        public async Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductDto dto, string? updatedBy = null)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {id} not found");
            }

            // Track price changes
            bool priceChanged = product.CostPrice != dto.CostPrice || product.SalePrice != dto.SalePrice;
            if (priceChanged)
            {
                var priceHistory = new PriceHistory
                {
                    // TenantId will be set later
                    ProductId = product.Id,
                    OldCostPrice = product.CostPrice,
                    NewCostPrice = dto.CostPrice,
                    OldSalePrice = product.SalePrice,
                    NewSalePrice = dto.SalePrice,
                    ChangedBy = updatedBy
                };
                _context.PriceHistories.Add(priceHistory);
            }

            // Update product
            product.Name = dto.Name;
            product.CategoryId = dto.CategoryId;
            product.Description = dto.Description;
            product.CostPrice = dto.CostPrice;
            product.SalePrice = dto.SalePrice;
            product.MinStock = dto.MinStock;
            product.MaxStock = dto.MaxStock;
            product.SKU = dto.SKU;
            product.Brand = dto.Brand;
            product.Unit = dto.Unit;
            product.Weight = dto.Weight;
            product.Location = dto.Location;
            product.TaxRate = dto.TaxRate;
            product.AllowDiscount = dto.AllowDiscount;
            product.MaxDiscountPercentage = dto.MaxDiscountPercentage;
            product.IsActive = dto.IsActive;
            product.TrackInventory = dto.TrackInventory;
            product.UpdatedAt = DateTime.UtcNow;
            product.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync();

            return await GetProductByIdAsync(id) ?? throw new InvalidOperationException("Failed to retrieve updated product");
        }

        public async Task<bool> DeleteProductAsync(Guid id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return false;
            }

            // Soft delete - just mark as inactive
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }

        // Stock Management
        public async Task<ProductDto> UpdateStockAsync(Guid productId, UpdateStockDto dto, string? performedBy = null)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {productId} not found");
            }

            if (!product.TrackInventory)
            {
                throw new InvalidOperationException("This product does not track inventory");
            }

            var movementType = dto.MovementType.ToLowerInvariant();
            if (movementType != "adjustment" && dto.Quantity <= 0)
            {
                throw new ArgumentException("Quantity must be greater than zero");
            }
            if (movementType == "adjustment" && dto.Quantity < 0)
            {
                throw new ArgumentException("Quantity must be zero or greater for adjustment");
            }
            int previousStock = product.CurrentStock;
            int newStock = previousStock;

            switch (movementType)
            {
                case "in":
                    newStock += dto.Quantity;
                    break;
                case "out":
                    newStock -= dto.Quantity;
                    if (newStock < 0)
                    {
                        throw new InvalidOperationException($"Insufficient stock. Available: {previousStock}, Requested: {dto.Quantity}");
                    }
                    break;
                case "adjustment":
                    newStock = dto.Quantity;
                    break;
                default:
                    throw new ArgumentException($"Invalid movement type: {dto.MovementType}");
            }

            // Update product stock
            product.CurrentStock = newStock;
            product.UpdatedAt = DateTime.UtcNow;

            var movementUnitCost = dto.UnitCost ?? product.CostPrice;
            // Create stock movement record
            var stockMovement = new StockMovement
            {
                ProductId = productId,
                MovementType = movementType,
                Quantity = movementType == "adjustment" ? newStock - previousStock : dto.Quantity,
                PreviousStock = previousStock,
                NewStock = newStock,
                Reason = dto.Reason,
                Notes = dto.Notes,
                UnitCost = movementUnitCost,
                PerformedBy = performedBy
            };

            _context.StockMovements.Add(stockMovement);
            await _context.SaveChangesAsync();

            return await GetProductByIdAsync(productId) ?? throw new InvalidOperationException("Failed to retrieve updated product");
        }

        public async Task<ProductDto> AdjustStockAsync(Guid productId, int adjustment, string reason, string? performedBy = null)
        {
            var dto = new UpdateStockDto
            {
                Quantity = Math.Abs(adjustment),
                MovementType = adjustment >= 0 ? "In" : "Out",
                Reason = reason
            };

            return await UpdateStockAsync(productId, dto, performedBy);
        }

        public async Task<bool> CheckStockAvailabilityAsync(Guid productId, int quantity)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null || !product.IsActive)
            {
                return false;
            }

            if (!product.TrackInventory)
            {
                return true; // If not tracking inventory, always available
            }

            return product.CurrentStock >= quantity;
        }

        public async Task<List<StockMovementDto>> GetStockMovementsAsync(Guid? productId = null, DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.StockMovements
                .Include(sm => sm.Product)
                .AsQueryable();

            if (productId.HasValue)
            {
                query = query.Where(sm => sm.ProductId == productId.Value);
            }

            if (startDate.HasValue)
            {
                query = query.Where(sm => sm.MovementDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(sm => sm.MovementDate <= endDate.Value);
            }

            var movements = await query
                .OrderByDescending(sm => sm.MovementDate)
                .Select(sm => new StockMovementDto
                {
                    Id = sm.Id,
                    ProductId = sm.ProductId,
                    ProductName = sm.Product.Name,
                    ProductBarcode = sm.Product.Barcode,
                    MovementType = sm.MovementType,
                    Quantity = sm.Quantity,
                    PreviousStock = sm.PreviousStock,
                    NewStock = sm.NewStock,
                    ReferenceType = sm.ReferenceType,
                    ReferenceId = sm.ReferenceId,
                    Reason = sm.Reason,
                    Notes = sm.Notes,
                    UnitCost = sm.UnitCost,
                    TotalCost = sm.TotalCost,
                    PerformedBy = sm.PerformedBy,
                    MovementDate = sm.MovementDate
                })
                .ToListAsync();

            return movements;
        }

        // Price Management
        public async Task<ProductDto> UpdatePricesAsync(Guid productId, decimal costPrice, decimal salePrice, string? reason = null, string? changedBy = null)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {productId} not found");
            }

            // Create price history record
            var priceHistory = new PriceHistory
            {
                ProductId = productId,
                OldCostPrice = product.CostPrice,
                NewCostPrice = costPrice,
                OldSalePrice = product.SalePrice,
                NewSalePrice = salePrice,
                Reason = reason,
                ChangedBy = changedBy
            };

            _context.PriceHistories.Add(priceHistory);

            // Update product prices
            product.CostPrice = costPrice;
            product.SalePrice = salePrice;
            product.UpdatedAt = DateTime.UtcNow;
            product.UpdatedBy = changedBy;

            await _context.SaveChangesAsync();

            return await GetProductByIdAsync(productId) ?? throw new InvalidOperationException("Failed to retrieve updated product");
        }

        public async Task<List<PriceHistoryDto>> GetPriceHistoryAsync(Guid productId)
        {
            var history = await _context.PriceHistories
                .Include(ph => ph.Product)
                .Where(ph => ph.ProductId == productId)
                .OrderByDescending(ph => ph.ChangedAt)
                .Select(ph => new PriceHistoryDto
                {
                    Id = ph.Id,
                    ProductId = ph.ProductId,
                    ProductName = ph.Product.Name,
                    OldCostPrice = ph.OldCostPrice,
                    NewCostPrice = ph.NewCostPrice,
                    OldSalePrice = ph.OldSalePrice,
                    NewSalePrice = ph.NewSalePrice,
                    CostPriceChange = ph.CostPriceChange,
                    SalePriceChange = ph.SalePriceChange,
                    CostPriceChangePercentage = ph.CostPriceChangePercentage,
                    SalePriceChangePercentage = ph.SalePriceChangePercentage,
                    Reason = ph.Reason,
                    ChangedBy = ph.ChangedBy,
                    ChangedAt = ph.ChangedAt
                })
                .ToListAsync();

            return history;
        }

        // Bulk Operations
        public async Task<int> BulkUpdatePricesAsync(List<Guid> productIds, decimal priceChangePercentage, bool updateCost = false, bool updateSale = true)
        {
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            foreach (var product in products)
            {
                var priceHistory = new PriceHistory
                {
                    // TenantId will be set later
                    ProductId = product.Id,
                    OldCostPrice = product.CostPrice,
                    OldSalePrice = product.SalePrice,
                    Reason = $"Bulk price update: {priceChangePercentage:F2}% change"
                };

                if (updateCost)
                {
                    product.CostPrice = product.CostPrice * (1 + priceChangePercentage / 100);
                    priceHistory.NewCostPrice = product.CostPrice;
                }
                else
                {
                    priceHistory.NewCostPrice = product.CostPrice;
                }

                if (updateSale)
                {
                    product.SalePrice = product.SalePrice * (1 + priceChangePercentage / 100);
                    priceHistory.NewSalePrice = product.SalePrice;
                }
                else
                {
                    priceHistory.NewSalePrice = product.SalePrice;
                }

                product.UpdatedAt = DateTime.UtcNow;
                _context.PriceHistories.Add(priceHistory);
            }

            await _context.SaveChangesAsync();
            return products.Count;
        }

        public async Task<int> BulkAdjustStockAsync(Dictionary<Guid, int> adjustments, string reason, string? performedBy = null)
        {
            int adjustedCount = 0;

            foreach (var kvp in adjustments)
            {
                if (kvp.Value == 0) continue;
                var product = await _context.Products.FindAsync(kvp.Key);
                if (product != null && product.TrackInventory)
                {
                    int previousStock = product.CurrentStock;
                    int newStock = previousStock + kvp.Value;

                    if (newStock >= 0)
                    {
                        product.CurrentStock = newStock;
                        product.UpdatedAt = DateTime.UtcNow;

                        var stockMovement = new StockMovement
                        {
                            ProductId = kvp.Key,
                            MovementType = kvp.Value >= 0 ? "In" : "Out",
                            Quantity = Math.Abs(kvp.Value),
                            PreviousStock = previousStock,
                            NewStock = newStock,
                            Reason = reason,
                            UnitCost = product.CostPrice,
                            PerformedBy = performedBy
                        };

                        _context.StockMovements.Add(stockMovement);
                        adjustedCount++;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return adjustedCount;
        }

        // Reporting
        public async Task<InventoryDashboardDto> GetDashboardAsync()
        {
            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(today.Year, today.Month, 1);

            // Stock metrics
            var stockMetrics = await _context.Products
                .Where(p => p.IsActive)
                .GroupBy(p => 1)
                .Select(g => new
                {
                    TotalProducts = g.Count(),
                    ActiveProducts = g.Count(p => p.IsActive),
                    LowStockProducts = g.Count(p => p.CurrentStock <= p.MinStock && p.CurrentStock > 0),
                    OutOfStockProducts = g.Count(p => p.CurrentStock <= 0),
                    TotalInventoryValue = g.Sum(p => p.CurrentStock * p.CostPrice),
                    TotalRetailValue = g.Sum(p => p.CurrentStock * p.SalePrice)
                })
                .FirstOrDefaultAsync();

            // Today's sales
            var todaysSales = await _context.Sales
                .Where(s => s.SaleDate.Date == today && s.Status == "completed")
                .GroupBy(s => 1)
                .Select(g => new
                {
                    TotalSales = g.Sum(s => s.TotalAmount),
                    TotalTransactions = g.Count()
                })
                .FirstOrDefaultAsync();

            // Month's sales
            var monthSales = await _context.Sales
                .Where(s => s.SaleDate >= monthStart && s.Status == "completed")
                .GroupBy(s => 1)
                .Select(g => new
                {
                    TotalSales = g.Sum(s => s.TotalAmount),
                    TotalTransactions = g.Count()
                })
                .FirstOrDefaultAsync();

            // Today's profit
            var todaysProfit = await _context.SaleItems
                .Include(si => si.Sale)
                .Where(si => si.Sale.SaleDate.Date == today && si.Sale.Status == "completed")
                .SumAsync(si => si.ProfitAmount);

            // Month's profit
            var monthProfit = await _context.SaleItems
                .Include(si => si.Sale)
                .Where(si => si.Sale.SaleDate >= monthStart && si.Sale.Status == "completed")
                .SumAsync(si => si.ProfitAmount);

            // Top selling products
            var topSellingProducts = await GetTopSellingProductsAsync(monthStart, DateTime.UtcNow, 5);

            // Category sales
            var categorySales = await GetCategorySalesAsync(monthStart, DateTime.UtcNow);

            // Recent stock movements
            var recentMovements = await GetStockMovementsAsync(null, today, null);

            // Recent sales
            var recentSales = await _context.Sales
                .Include(s => s.Customer)
                .Include(s => s.Employee)
                .Include(s => s.SaleItems)
                    .ThenInclude(si => si.Product)
                .Where(s => s.SaleDate.Date == today)
                .OrderByDescending(s => s.SaleDate)
                .Take(10)
                .Select(s => new SaleDto
                {
                    Id = s.Id,
                    SaleNumber = s.SaleNumber,
                    CustomerId = s.CustomerId,
                    CustomerName = s.Customer != null ? $"{s.Customer.FirstName} {s.Customer.LastName}" : null,
                    EmployeeId = s.EmployeeId,
                    EmployeeName = s.Employee != null ? s.Employee.Name : null,
                    SubTotal = s.SubTotal,
                    DiscountAmount = s.DiscountAmount,
                    TaxAmount = s.TaxAmount,
                    TotalAmount = s.TotalAmount,
                    PaymentMethod = s.PaymentMethod,
                    Status = s.Status,
                    SaleDate = s.SaleDate,
                    Items = s.SaleItems.Select(si => new SaleItemDto
                    {
                        Id = si.Id,
                        ProductId = si.ProductId,
                        ProductName = si.Product.Name,
                        ProductBarcode = si.Product.Barcode,
                        Quantity = si.Quantity,
                        UnitPrice = si.UnitPrice,
                        TotalAmount = si.TotalAmount
                    }).ToList()
                })
                .ToListAsync();

            return new InventoryDashboardDto
            {
                // Stock metrics
                TotalProducts = stockMetrics?.TotalProducts ?? 0,
                ActiveProducts = stockMetrics?.ActiveProducts ?? 0,
                LowStockProducts = stockMetrics?.LowStockProducts ?? 0,
                OutOfStockProducts = stockMetrics?.OutOfStockProducts ?? 0,
                TotalInventoryValue = stockMetrics?.TotalInventoryValue ?? 0,
                TotalRetailValue = stockMetrics?.TotalRetailValue ?? 0,
                PotentialProfit = (stockMetrics?.TotalRetailValue ?? 0) - (stockMetrics?.TotalInventoryValue ?? 0),
                
                // Sales metrics
                TodaysSales = todaysSales?.TotalSales ?? 0,
                TodaysTransactions = todaysSales?.TotalTransactions ?? 0,
                TodaysProfit = todaysProfit,
                MonthSales = monthSales?.TotalSales ?? 0,
                MonthTransactions = monthSales?.TotalTransactions ?? 0,
                MonthProfit = monthProfit,
                
                // Top performers
                TopSellingProducts = topSellingProducts,
                CategorySales = categorySales,
                
                // Recent activities
                RecentStockMovements = recentMovements.Take(10).ToList(),
                RecentSales = recentSales
            };
        }

        public async Task<List<TopProductDto>> GetTopSellingProductsAsync(DateTime startDate, DateTime endDate, int limit = 10)
        {
            var topProducts = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .Where(si => si.Sale.SaleDate >= startDate && si.Sale.SaleDate <= endDate && si.Sale.Status == "completed")
                .GroupBy(si => new { si.ProductId, si.Product.Name, si.Product.Barcode })
                .Select(g => new TopProductDto
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.Name,
                    Barcode = g.Key.Barcode,
                    QuantitySold = g.Sum(si => si.Quantity),
                    TotalRevenue = g.Sum(si => si.TotalAmount),
                    TotalProfit = g.Sum(si => si.ProfitAmount),
                    ProfitMargin = g.Sum(si => si.TotalAmount) > 0 ? 
                        (g.Sum(si => si.ProfitAmount) / g.Sum(si => si.TotalAmount)) * 100 : 0
                })
                .OrderByDescending(p => p.TotalRevenue)
                .Take(limit)
                .ToListAsync();

            return topProducts;
        }

        public async Task<List<CategorySalesDto>> GetCategorySalesAsync(DateTime startDate, DateTime endDate)
        {
            var categorySales = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                    .ThenInclude(p => p.Category)
                .Where(si => si.Sale.SaleDate >= startDate && si.Sale.SaleDate <= endDate && si.Sale.Status == "completed")
                .GroupBy(si => new { si.Product.CategoryId, CategoryName = si.Product.Category != null ? si.Product.Category.Name : "Uncategorized" })
                .Select(g => new CategorySalesDto
                {
                    CategoryId = g.Key.CategoryId,
                    CategoryName = g.Key.CategoryName,
                    ItemsSold = g.Sum(si => si.Quantity),
                    TotalRevenue = g.Sum(si => si.TotalAmount),
                    TotalCost = g.Sum(si => si.UnitCost * si.Quantity),
                    TotalProfit = g.Sum(si => si.ProfitAmount),
                    AverageMargin = g.Sum(si => si.TotalAmount) > 0 ?
                        (g.Sum(si => si.ProfitAmount) / g.Sum(si => si.TotalAmount)) * 100 : 0
                })
                .OrderByDescending(c => c.TotalRevenue)
                .ToListAsync();

            // Get product count for each category
            foreach (var category in categorySales)
            {
                if (category.CategoryId.HasValue)
                {
                    category.ProductCount = await _context.Products
                        .CountAsync(p => p.CategoryId == category.CategoryId && p.IsActive);
                }
            }

            return categorySales;
        }

        public async Task<decimal> GetInventoryValueAsync()
        {
            return await _context.Products
                .Where(p => p.IsActive)
                .SumAsync(p => p.CurrentStock * p.CostPrice);
        }

        // Sales
        public async Task<SaleDto> CreateSaleAsync(CreateSaleDto dto, string? soldBy = null)
        {
            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.Items == null || dto.Items.Count == 0)
                {
                    throw new ArgumentException("Sale must contain at least one item");
                }

                var productIds = dto.Items.Select(i => i.ProductId).ToList();
                var products = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id);

                foreach (var item in dto.Items)
                {
                    if (!products.TryGetValue(item.ProductId, out var prod))
                        throw new KeyNotFoundException($"Product {item.ProductId} not found");

                    if (prod.IsActive == false)
                        throw new InvalidOperationException($"Product {prod.Name} is inactive");

                    if (prod.TrackInventory && prod.CurrentStock < item.Quantity)
                        throw new InvalidOperationException($"Insufficient stock for {prod.Name}. Available: {prod.CurrentStock}");
                }

                // Generate sale number with millisecond timestamp to avoid collisions
                var now = DateTime.UtcNow;
                var saleNumber = $"POS-{now:yyyyMMddHHmmssfff}";

                var sale = new Sale
                {
                    SaleNumber = saleNumber,
                    CustomerId = dto.CustomerId,
                    EmployeeId = dto.EmployeeId,
                    Notes = dto.Notes,
                    PaymentMethod = dto.PaymentMethod,
                    SaleDate = DateTime.UtcNow,
                    SoldBy = soldBy,
                    Status = "completed",
                };

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync();

                decimal subTotal = 0;
                decimal discountTotal = dto.DiscountAmount ?? 0;
                decimal taxTotal = 0;

                foreach (var item in dto.Items)
                {
                    var prod = products[item.ProductId];
                    var unitPrice = prod.SalePrice;
                    var lineBase = unitPrice * item.Quantity;
                    var lineDiscount = item.DiscountPercentage > 0 ? (lineBase * (item.DiscountPercentage / 100m)) : 0m;
                    var taxableBase = lineBase - lineDiscount;
                    var lineTax = prod.TaxRate > 0 ? taxableBase * (prod.TaxRate / 100m) : 0m;
                    var lineTotal = taxableBase + lineTax;

                    var saleItem = new SaleItem
                    {
                        SaleId = sale.Id,
                        ProductId = prod.Id,
                        Quantity = item.Quantity,
                        UnitPrice = unitPrice,
                        DiscountPercentage = item.DiscountPercentage,
                        DiscountAmount = lineDiscount,
                        TaxAmount = lineTax,
                        TotalAmount = lineTotal,
                        UnitCost = prod.CostPrice,
                    };

                    _context.SaleItems.Add(saleItem);

                    // Stock update + movement
                    if (prod.TrackInventory)
                    {
                        var previous = prod.CurrentStock;
                        var newStock = previous - item.Quantity;
                        if (newStock < 0)
                            throw new InvalidOperationException($"Insufficient stock for {prod.Name}");

                        prod.CurrentStock = newStock;
                        prod.UpdatedAt = DateTime.UtcNow;

                        var movement = new StockMovement
                        {
                            ProductId = prod.Id,
                            MovementType = "Out",
                            Quantity = item.Quantity,
                            PreviousStock = previous,
                            NewStock = newStock,
                            ReferenceType = "Sale",
                            ReferenceId = sale.Id,
                            UnitCost = prod.CostPrice,
                            Reason = "POS sale",
                            PerformedBy = soldBy,
                        };
                        _context.StockMovements.Add(movement);
                    }

                    subTotal += lineBase;
                    discountTotal += lineDiscount;
                    taxTotal += lineTax;
                }

                sale.SubTotal = subTotal;
                sale.DiscountAmount = discountTotal;
                sale.TaxAmount = taxTotal;
                sale.TotalAmount = subTotal - discountTotal + taxTotal;
                sale.ReceivedAmount = dto.ReceivedAmount;
                if (dto.PaymentMethod == "cash" && dto.ReceivedAmount.HasValue)
                {
                    sale.ChangeAmount = Math.Max(0, dto.ReceivedAmount.Value - sale.TotalAmount);
                }
                sale.CompletedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return await GetSaleByIdAsync(sale.Id) ?? throw new InvalidOperationException("Failed to load created sale");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating sale");
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<List<SaleDto>> GetSalesAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.Sales
                .Include(s => s.SaleItems)
                    .ThenInclude(si => si.Product)
                .AsQueryable();

            if (startDate.HasValue)
                query = query.Where(s => s.SaleDate >= startDate.Value);
            if (endDate.HasValue)
                query = query.Where(s => s.SaleDate <= endDate.Value);

            return await query
                .OrderByDescending(s => s.SaleDate)
                .Select(s => new SaleDto
                {
                    Id = s.Id,
                    SaleNumber = s.SaleNumber,
                    CustomerId = s.CustomerId,
                    EmployeeId = s.EmployeeId,
                    SubTotal = s.SubTotal,
                    DiscountAmount = s.DiscountAmount,
                    TaxAmount = s.TaxAmount,
                    TotalAmount = s.TotalAmount,
                    PaymentMethod = s.PaymentMethod,
                    Status = s.Status,
                    PaymentReference = s.PaymentReference,
                    ReceivedAmount = s.ReceivedAmount,
                    ChangeAmount = s.ChangeAmount,
                    Notes = s.Notes,
                    InvoiceNumber = s.InvoiceNumber,
                    SaleDate = s.SaleDate,
                    CompletedAt = s.CompletedAt,
                    SoldBy = s.SoldBy,
                    Items = s.SaleItems.Select(si => new SaleItemDto
                    {
                        Id = si.Id,
                        ProductId = si.ProductId,
                        ProductName = si.Product.Name,
                        ProductBarcode = si.Product.Barcode,
                        Quantity = si.Quantity,
                        UnitPrice = si.UnitPrice,
                        DiscountPercentage = si.DiscountPercentage,
                        DiscountAmount = si.DiscountAmount,
                        TaxAmount = si.TaxAmount,
                        TotalAmount = si.TotalAmount,
                        UnitCost = si.UnitCost,
                        ProfitAmount = si.ProfitAmount,
                    }).ToList()
                })
                .ToListAsync();
        }

        public async Task<SaleDto?> GetSaleByIdAsync(Guid saleId)
        {
            var sale = await _context.Sales
                .Include(s => s.SaleItems)
                    .ThenInclude(si => si.Product)
                .Where(s => s.Id == saleId)
                .Select(s => new SaleDto
                {
                    Id = s.Id,
                    SaleNumber = s.SaleNumber,
                    CustomerId = s.CustomerId,
                    EmployeeId = s.EmployeeId,
                    SubTotal = s.SubTotal,
                    DiscountAmount = s.DiscountAmount,
                    TaxAmount = s.TaxAmount,
                    TotalAmount = s.TotalAmount,
                    PaymentMethod = s.PaymentMethod,
                    Status = s.Status,
                    PaymentReference = s.PaymentReference,
                    ReceivedAmount = s.ReceivedAmount,
                    ChangeAmount = s.ChangeAmount,
                    Notes = s.Notes,
                    InvoiceNumber = s.InvoiceNumber,
                    SaleDate = s.SaleDate,
                    CompletedAt = s.CompletedAt,
                    SoldBy = s.SoldBy,
                    Items = s.SaleItems.Select(si => new SaleItemDto
                    {
                        Id = si.Id,
                        ProductId = si.ProductId,
                        ProductName = si.Product.Name,
                        ProductBarcode = si.Product.Barcode,
                        Quantity = si.Quantity,
                        UnitPrice = si.UnitPrice,
                        DiscountPercentage = si.DiscountPercentage,
                        DiscountAmount = si.DiscountAmount,
                        TaxAmount = si.TaxAmount,
                        TotalAmount = si.TotalAmount,
                        UnitCost = si.UnitCost,
                        ProfitAmount = si.ProfitAmount,
                    }).ToList()
                })
                .FirstOrDefaultAsync();
            return sale;
        }

        // Helper method to map Product entity to ProductDto
        private static Expression<Func<Product, ProductDto>> MapToProductDto()
        {
            return p => new ProductDto
            {
                Id = p.Id,
                Barcode = p.Barcode,
                Name = p.Name,
                CategoryId = p.CategoryId,
                CategoryName = p.Category != null ? p.Category.Name : null,
                Description = p.Description,
                CostPrice = p.CostPrice,
                SalePrice = p.SalePrice,
                CurrentStock = p.CurrentStock,
                MinStock = p.MinStock,
                MaxStock = p.MaxStock,
                SKU = p.SKU,
                Brand = p.Brand,
                Unit = p.Unit,
                Weight = p.Weight,
                Location = p.Location,
                TaxRate = p.TaxRate,
                AllowDiscount = p.AllowDiscount,
                MaxDiscountPercentage = p.MaxDiscountPercentage,
                IsActive = p.IsActive,
                TrackInventory = p.TrackInventory,
                ProfitMargin = p.ProfitMargin,
                ProfitAmount = p.ProfitAmount,
                IsLowStock = p.IsLowStock,
                IsOutOfStock = p.IsOutOfStock,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            };
        }
    }
}
