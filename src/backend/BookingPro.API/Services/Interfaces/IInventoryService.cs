using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    public interface IInventoryService
    {
        // Product Categories
        Task<List<ProductCategoryDto>> GetCategoriesAsync();
        Task<ProductCategoryDto?> GetCategoryByIdAsync(Guid id);
        Task<ProductCategoryDto> CreateCategoryAsync(CreateProductCategoryDto dto);
        Task<ProductCategoryDto> UpdateCategoryAsync(Guid id, UpdateProductCategoryDto dto);
        Task<bool> DeleteCategoryAsync(Guid id);
        
        // Products
        Task<List<ProductDto>> GetProductsAsync(bool includeInactive = false);
        Task<List<ProductDto>> GetProductsByCategoryAsync(Guid categoryId);
        Task<List<ProductDto>> GetLowStockProductsAsync();
        Task<ProductDto?> GetProductByIdAsync(Guid id);
        Task<ProductDto?> GetProductByBarcodeAsync(long barcode);
        Task<ProductDto> CreateProductAsync(CreateProductDto dto, string? createdBy = null);
        Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductDto dto, string? updatedBy = null);
        Task<bool> DeleteProductAsync(Guid id);
        
        // Stock Management
        Task<ProductDto> UpdateStockAsync(Guid productId, UpdateStockDto dto, string? performedBy = null);
        Task<ProductDto> AdjustStockAsync(Guid productId, int adjustment, string reason, string? performedBy = null);
        Task<bool> CheckStockAvailabilityAsync(Guid productId, int quantity);
        Task<List<StockMovementDto>> GetStockMovementsAsync(Guid? productId = null, DateTime? startDate = null, DateTime? endDate = null);
        
        // Price Management
        Task<ProductDto> UpdatePricesAsync(Guid productId, decimal costPrice, decimal salePrice, string? reason = null, string? changedBy = null);
        Task<List<PriceHistoryDto>> GetPriceHistoryAsync(Guid productId);
        
        // Bulk Operations
        Task<int> BulkUpdatePricesAsync(List<Guid> productIds, decimal priceChangePercentage, bool updateCost = false, bool updateSale = true);
        Task<int> BulkAdjustStockAsync(Dictionary<Guid, int> adjustments, string reason, string? performedBy = null);
        
        // Reporting
        Task<InventoryDashboardDto> GetDashboardAsync();
        Task<List<TopProductDto>> GetTopSellingProductsAsync(DateTime startDate, DateTime endDate, int limit = 10);
        Task<List<CategorySalesDto>> GetCategorySalesAsync(DateTime startDate, DateTime endDate);
        Task<decimal> GetInventoryValueAsync();
    }
}