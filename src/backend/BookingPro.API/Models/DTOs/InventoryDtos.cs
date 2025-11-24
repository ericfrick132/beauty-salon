using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    // Product Category DTOs
    public class ProductCategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public int ProductCount { get; set; }
    }
    
    public class CreateProductCategoryDto
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public int DisplayOrder { get; set; } = 0;
        
        public bool IsActive { get; set; } = true;
    }
    
    public class UpdateProductCategoryDto
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public int DisplayOrder { get; set; }
        
        public bool IsActive { get; set; }
    }
    
    // Product DTOs
    public class ProductDto
    {
        public Guid Id { get; set; }
        public long Barcode { get; set; }
        public string Name { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? Description { get; set; }
        public decimal CostPrice { get; set; }
        public decimal SalePrice { get; set; }
        public int CurrentStock { get; set; }
        public int MinStock { get; set; }
        public int MaxStock { get; set; }
        public string? SKU { get; set; }
        public string? Brand { get; set; }
        public string? Unit { get; set; }
        public decimal? Weight { get; set; }
        public string? Location { get; set; }
        public decimal TaxRate { get; set; }
        public bool AllowDiscount { get; set; }
        public decimal? MaxDiscountPercentage { get; set; }
        public bool IsActive { get; set; }
        public bool TrackInventory { get; set; }
        public decimal ProfitMargin { get; set; }
        public decimal ProfitAmount { get; set; }
        public bool IsLowStock { get; set; }
        public bool IsOutOfStock { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    
    public class CreateProductDto
    {
        [Required]
        public long Barcode { get; set; }
        
        [Required, MaxLength(300)]
        public string Name { get; set; } = string.Empty;
        
        public Guid? CategoryId { get; set; }
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        [Required, Range(0, double.MaxValue)]
        public decimal CostPrice { get; set; }
        
        [Required, Range(0, double.MaxValue)]
        public decimal SalePrice { get; set; }
        
        [Required, Range(0, int.MaxValue)]
        public int InitialStock { get; set; } = 0;
        
        [Range(0, int.MaxValue)]
        public int MinStock { get; set; } = 0;
        
        [Range(0, int.MaxValue)]
        public int MaxStock { get; set; } = 999999;
        
        [MaxLength(100)]
        public string? SKU { get; set; }
        
        [MaxLength(200)]
        public string? Brand { get; set; }
        
        [MaxLength(100)]
        public string? Unit { get; set; }
        
        public decimal? Weight { get; set; }
        
        [MaxLength(50)]
        public string? Location { get; set; }
        
        [Range(0, 100)]
        public decimal TaxRate { get; set; } = 0;
        
        public bool AllowDiscount { get; set; } = true;
        
        [Range(0, 100)]
        public decimal? MaxDiscountPercentage { get; set; }
        
        public bool TrackInventory { get; set; } = true;
    }
    
    public class UpdateProductDto
    {
        [Required, MaxLength(300)]
        public string Name { get; set; } = string.Empty;
        
        public Guid? CategoryId { get; set; }
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        [Required, Range(0, double.MaxValue)]
        public decimal CostPrice { get; set; }
        
        [Required, Range(0, double.MaxValue)]
        public decimal SalePrice { get; set; }
        
        [Range(0, int.MaxValue)]
        public int MinStock { get; set; }
        
        [Range(0, int.MaxValue)]
        public int MaxStock { get; set; }
        
        [MaxLength(100)]
        public string? SKU { get; set; }
        
        [MaxLength(200)]
        public string? Brand { get; set; }
        
        [MaxLength(100)]
        public string? Unit { get; set; }
        
        public decimal? Weight { get; set; }
        
        [MaxLength(50)]
        public string? Location { get; set; }
        
        [Range(0, 100)]
        public decimal TaxRate { get; set; }
        
        public bool AllowDiscount { get; set; }
        
        [Range(0, 100)]
        public decimal? MaxDiscountPercentage { get; set; }
        
        public bool IsActive { get; set; }
        
        public bool TrackInventory { get; set; }
    }

    public class UpdateProductPriceDto
    {
        [Required, Range(0, double.MaxValue)]
        public decimal CostPrice { get; set; }

        [Required, Range(0, double.MaxValue)]
        public decimal SalePrice { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }
    }
    
    public class UpdateStockDto
    {
        [Required]
        public int Quantity { get; set; }
        
        [Required]
        public string MovementType { get; set; } = string.Empty; // In, Out, Adjustment
        
        [MaxLength(500)]
        public string? Reason { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        public decimal? UnitCost { get; set; }
    }
    
    public class BarcodeSearchDto
    {
        [Required]
        public long Barcode { get; set; }
    }
    
    // Sale DTOs
    public class SaleDto
    {
        public Guid Id { get; set; }
        public string SaleNumber { get; set; } = string.Empty;
        public Guid? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public Guid? EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? PaymentReference { get; set; }
        public decimal? ReceivedAmount { get; set; }
        public decimal? ChangeAmount { get; set; }
        public string? Notes { get; set; }
        public string? InvoiceNumber { get; set; }
        public DateTime SaleDate { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? SoldBy { get; set; }
        public List<SaleItemDto> Items { get; set; } = new List<SaleItemDto>();
    }
    
    public class SaleItemDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public long ProductBarcode { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal UnitCost { get; set; }
        public decimal ProfitAmount { get; set; }
    }
    
    public class CreateSaleDto
    {
        public Guid? CustomerId { get; set; }
        
        public Guid? EmployeeId { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        public List<CreateSaleItemDto> Items { get; set; } = new List<CreateSaleItemDto>();
        
        public decimal? DiscountAmount { get; set; }
        
        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = "cash";
        
        public decimal? ReceivedAmount { get; set; } // For cash payments
    }
    
    public class CreateSaleItemDto
    {
        [Required]
        public Guid ProductId { get; set; }
        
        [Required, Range(1, int.MaxValue)]
        public int Quantity { get; set; }
        
        [Range(0, 100)]
        public decimal DiscountPercentage { get; set; } = 0;
        
        [MaxLength(500)]
        public string? Notes { get; set; }
    }
    
    public class AddSaleItemDto
    {
        [Required]
        public long Barcode { get; set; }
        
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; } = 1;
        
        [Range(0, 100)]
        public decimal DiscountPercentage { get; set; } = 0;
    }
    
    // Stock Movement DTOs
    public class StockMovementDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public long ProductBarcode { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int PreviousStock { get; set; }
        public int NewStock { get; set; }
        public string? ReferenceType { get; set; }
        public Guid? ReferenceId { get; set; }
        public string? Reason { get; set; }
        public string? Notes { get; set; }
        public decimal? UnitCost { get; set; }
        public decimal? TotalCost { get; set; }
        public string? PerformedBy { get; set; }
        public DateTime MovementDate { get; set; }
    }
    
    // Price History DTOs
    public class PriceHistoryDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal OldCostPrice { get; set; }
        public decimal NewCostPrice { get; set; }
        public decimal OldSalePrice { get; set; }
        public decimal NewSalePrice { get; set; }
        public decimal CostPriceChange { get; set; }
        public decimal SalePriceChange { get; set; }
        public decimal CostPriceChangePercentage { get; set; }
        public decimal SalePriceChangePercentage { get; set; }
        public string? Reason { get; set; }
        public string? ChangedBy { get; set; }
        public DateTime ChangedAt { get; set; }
    }
    
    // Dashboard & Report DTOs
    public class InventoryDashboardDto
    {
        // Stock metrics
        public int TotalProducts { get; set; }
        public int ActiveProducts { get; set; }
        public int LowStockProducts { get; set; }
        public int OutOfStockProducts { get; set; }
        
        // Financial metrics
        public decimal TotalInventoryValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public decimal PotentialProfit { get; set; }
        
        // Sales metrics (today)
        public decimal TodaysSales { get; set; }
        public int TodaysTransactions { get; set; }
        public decimal TodaysProfit { get; set; }
        
        // Sales metrics (this month)
        public decimal MonthSales { get; set; }
        public int MonthTransactions { get; set; }
        public decimal MonthProfit { get; set; }
        
        // Top performers
        public List<TopProductDto> TopSellingProducts { get; set; } = new List<TopProductDto>();
        public List<TopProductDto> TopProfitableProducts { get; set; } = new List<TopProductDto>();
        public List<CategorySalesDto> CategorySales { get; set; } = new List<CategorySalesDto>();
        
        // Recent activities
        public List<StockMovementDto> RecentStockMovements { get; set; } = new List<StockMovementDto>();
        public List<SaleDto> RecentSales { get; set; } = new List<SaleDto>();
    }
    
    public class TopProductDto
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public long Barcode { get; set; }
        public int QuantitySold { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal ProfitMargin { get; set; }
    }
    
    public class CategorySalesDto
    {
        public Guid? CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int ProductCount { get; set; }
        public int ItemsSold { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal AverageMargin { get; set; }
    }
    
    public class SalesReportDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        
        // Summary metrics
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal AverageMargin { get; set; }
        public int TotalTransactions { get; set; }
        public int TotalItemsSold { get; set; }
        public decimal AverageTransactionValue { get; set; }
        
        // Payment method breakdown
        public Dictionary<string, decimal> PaymentMethodBreakdown { get; set; } = new Dictionary<string, decimal>();
        
        // Daily sales
        public List<DailySalesDto> DailySales { get; set; } = new List<DailySalesDto>();
        
        // Top products
        public List<TopProductDto> TopProducts { get; set; } = new List<TopProductDto>();
        
        // Category breakdown
        public List<CategorySalesDto> CategoryBreakdown { get; set; } = new List<CategorySalesDto>();
    }
    
    public class DailySalesDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
        public decimal Cost { get; set; }
        public decimal Profit { get; set; }
        public int Transactions { get; set; }
        public int ItemsSold { get; set; }
    }
}
