using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    public class ProductCategory : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public int DisplayOrder { get; set; } = 0;
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
    
    public class Product : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public long Barcode { get; set; } // Integer for barcode scanner input
        
        [Required, MaxLength(300)]
        public string Name { get; set; } = string.Empty;
        
        public Guid? CategoryId { get; set; }
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        [Required]
        public decimal CostPrice { get; set; }
        
        [Required]
        public decimal SalePrice { get; set; }
        
        // Stock management
        [Required]
        public int CurrentStock { get; set; } = 0;
        
        public int MinStock { get; set; } = 0;
        
        public int MaxStock { get; set; } = 999999;
        
        // Additional product information
        [MaxLength(100)]
        public string? SKU { get; set; } // Stock Keeping Unit
        
        [MaxLength(200)]
        public string? Brand { get; set; }
        
        [MaxLength(100)]
        public string? Unit { get; set; } // e.g., "piece", "kg", "liter"
        
        public decimal? Weight { get; set; }
        
        [MaxLength(50)]
        public string? Location { get; set; } // Storage location
        
        // Tax and discount
        public decimal TaxRate { get; set; } = 0; // Percentage
        
        public bool AllowDiscount { get; set; } = true;
        
        public decimal? MaxDiscountPercentage { get; set; }
        
        // Status and tracking
        public bool IsActive { get; set; } = true;
        
        public bool TrackInventory { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [MaxLength(100)]
        public string? CreatedBy { get; set; }
        
        [MaxLength(100)]
        public string? UpdatedBy { get; set; }
        
        // Calculated properties
        public decimal ProfitMargin => SalePrice > 0 ? ((SalePrice - CostPrice) / SalePrice) * 100 : 0;
        
        public decimal ProfitAmount => SalePrice - CostPrice;
        
        public bool IsLowStock => CurrentStock <= MinStock;
        
        public bool IsOutOfStock => CurrentStock <= 0;
        
        // Navigation properties
        public ProductCategory? Category { get; set; }
        public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
        public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
        public ICollection<PriceHistory> PriceHistories { get; set; } = new List<PriceHistory>();
    }
    
    public class Sale : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required, MaxLength(50)]
        public string SaleNumber { get; set; } = string.Empty; // e.g., "SALE-2024-00001"
        
        public Guid? CustomerId { get; set; }
        
        public Guid? EmployeeId { get; set; }
        
        // Financial details
        [Required]
        public decimal SubTotal { get; set; }
        
        public decimal DiscountAmount { get; set; } = 0;
        
        public decimal TaxAmount { get; set; } = 0;
        
        [Required]
        public decimal TotalAmount { get; set; }
        
        // Payment information
        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = "cash"; // cash, card, transfer, mercadopago
        
        [MaxLength(50)]
        public string Status { get; set; } = "completed"; // pending, completed, cancelled, refunded
        
        [MaxLength(100)]
        public string? PaymentReference { get; set; } // Transaction ID for electronic payments
        
        public decimal? ReceivedAmount { get; set; } // For cash payments
        
        public decimal? ChangeAmount { get; set; } // Change given
        
        // Additional information
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        [MaxLength(100)]
        public string? InvoiceNumber { get; set; }
        
        public DateTime SaleDate { get; set; } = DateTime.UtcNow;
        
        public DateTime? CompletedAt { get; set; }
        
        public DateTime? CancelledAt { get; set; }
        
        [MaxLength(500)]
        public string? CancellationReason { get; set; }
        
        [MaxLength(100)]
        public string? SoldBy { get; set; } // Username or employee name
        
        // Navigation properties
        public Customer? Customer { get; set; }
        public Employee? Employee { get; set; }
        public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
    }
    
    public class SaleItem : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid SaleId { get; set; }
        
        public Guid ProductId { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        [Required]
        public decimal UnitPrice { get; set; }
        
        public decimal DiscountPercentage { get; set; } = 0;
        
        public decimal DiscountAmount { get; set; } = 0;
        
        public decimal TaxAmount { get; set; } = 0;
        
        [Required]
        public decimal TotalAmount { get; set; }
        
        // Cost tracking for profit calculation
        public decimal UnitCost { get; set; } // Cost at the time of sale
        
        public decimal ProfitAmount => (UnitPrice - UnitCost) * Quantity - DiscountAmount;
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        // Navigation properties
        public Sale Sale { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }
    
    public class StockMovement : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid ProductId { get; set; }
        
        [Required, MaxLength(50)]
        public string MovementType { get; set; } = string.Empty; // In, Out, Adjustment, Transfer, Return
        
        [Required]
        public int Quantity { get; set; } // Positive for In, Negative for Out
        
        public int PreviousStock { get; set; }
        
        public int NewStock { get; set; }
        
        [MaxLength(50)]
        public string? ReferenceType { get; set; } // Sale, Purchase, Adjustment, Return
        
        public Guid? ReferenceId { get; set; } // ID of the related entity (Sale, Purchase, etc.)
        
        [MaxLength(500)]
        public string? Reason { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        public decimal? UnitCost { get; set; } // Cost per unit for this movement
        
        public decimal? TotalCost => UnitCost.HasValue ? UnitCost.Value * Math.Abs(Quantity) : null;
        
        [MaxLength(100)]
        public string? PerformedBy { get; set; }
        
        public DateTime MovementDate { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Product Product { get; set; } = null!;
    }
    
    public class PriceHistory : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid ProductId { get; set; }
        
        public decimal OldCostPrice { get; set; }
        
        public decimal NewCostPrice { get; set; }
        
        public decimal OldSalePrice { get; set; }
        
        public decimal NewSalePrice { get; set; }
        
        public decimal CostPriceChange => NewCostPrice - OldCostPrice;
        
        public decimal SalePriceChange => NewSalePrice - OldSalePrice;
        
        public decimal CostPriceChangePercentage => OldCostPrice > 0 ? ((NewCostPrice - OldCostPrice) / OldCostPrice) * 100 : 0;
        
        public decimal SalePriceChangePercentage => OldSalePrice > 0 ? ((NewSalePrice - OldSalePrice) / OldSalePrice) * 100 : 0;
        
        [MaxLength(500)]
        public string? Reason { get; set; }
        
        [MaxLength(100)]
        public string? ChangedBy { get; set; }
        
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Product Product { get; set; } = null!;
    }
    
    // Summary report entities for dashboard
    public class InventoryReport : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public DateTime ReportDate { get; set; }
        
        // Stock metrics
        public int TotalProducts { get; set; }
        public int ActiveProducts { get; set; }
        public int LowStockProducts { get; set; }
        public int OutOfStockProducts { get; set; }
        
        // Financial metrics
        public decimal TotalInventoryValue { get; set; } // Sum of all products (CostPrice * Stock)
        public decimal TotalRetailValue { get; set; } // Sum of all products (SalePrice * Stock)
        public decimal PotentialProfit { get; set; } // TotalRetailValue - TotalInventoryValue
        
        // Sales metrics for the period
        public decimal TotalSales { get; set; }
        public decimal TotalCost { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal AverageMargin { get; set; }
        
        public int TotalTransactions { get; set; }
        public int ItemsSold { get; set; }
        
        // Top performers
        public string? TopSellingProducts { get; set; } // JSON array
        public string? TopProfitableProducts { get; set; } // JSON array
        public string? TopCategories { get; set; } // JSON array
        
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}