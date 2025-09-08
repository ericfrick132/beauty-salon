using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddedProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "inventory_reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalProducts = table.Column<int>(type: "integer", nullable: false),
                    ActiveProducts = table.Column<int>(type: "integer", nullable: false),
                    LowStockProducts = table.Column<int>(type: "integer", nullable: false),
                    OutOfStockProducts = table.Column<int>(type: "integer", nullable: false),
                    TotalInventoryValue = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalRetailValue = table.Column<decimal>(type: "numeric", nullable: false),
                    PotentialProfit = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalSales = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric", nullable: false),
                    GrossProfit = table.Column<decimal>(type: "numeric", nullable: false),
                    AverageMargin = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalTransactions = table.Column<int>(type: "integer", nullable: false),
                    ItemsSold = table.Column<int>(type: "integer", nullable: false),
                    TopSellingProducts = table.Column<string>(type: "text", nullable: true),
                    TopProfitableProducts = table.Column<string>(type: "text", nullable: true),
                    TopCategories = table.Column<string>(type: "text", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_reports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "product_categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SaleNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReceivedAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    ChangeAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    InvoiceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SaleDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancellationReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SoldBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sales_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_sales_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Barcode = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CostPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    SalePrice = table.Column<decimal>(type: "numeric", nullable: false),
                    CurrentStock = table.Column<int>(type: "integer", nullable: false),
                    MinStock = table.Column<int>(type: "integer", nullable: false),
                    MaxStock = table.Column<int>(type: "integer", nullable: false),
                    SKU = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Brand = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Weight = table.Column<decimal>(type: "numeric", nullable: true),
                    Location = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TaxRate = table.Column<decimal>(type: "numeric", nullable: false),
                    AllowDiscount = table.Column<bool>(type: "boolean", nullable: false),
                    MaxDiscountPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TrackInventory = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_products_product_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "product_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "price_histories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    OldCostPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    NewCostPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    OldSalePrice = table.Column<decimal>(type: "numeric", nullable: false),
                    NewSalePrice = table.Column<decimal>(type: "numeric", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ChangedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_price_histories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_price_histories_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sale_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SaleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    UnitCost = table.Column<decimal>(type: "numeric", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sale_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sale_items_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sale_items_sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stock_movements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    MovementType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    PreviousStock = table.Column<int>(type: "integer", nullable: false),
                    NewStock = table.Column<int>(type: "integer", nullable: false),
                    ReferenceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ReferenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UnitCost = table.Column<decimal>(type: "numeric", nullable: true),
                    PerformedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MovementDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_movements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_stock_movements_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_reports_ReportDate",
                table: "inventory_reports",
                column: "ReportDate");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_reports_TenantId",
                table: "inventory_reports",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_price_histories_ChangedAt",
                table: "price_histories",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_price_histories_ProductId",
                table: "price_histories",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_price_histories_TenantId",
                table: "price_histories",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_IsActive",
                table: "product_categories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_Name_TenantId",
                table: "product_categories",
                columns: new[] { "Name", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_TenantId",
                table: "product_categories",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_products_Barcode_TenantId",
                table: "products",
                columns: new[] { "Barcode", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_CategoryId",
                table: "products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_products_CurrentStock",
                table: "products",
                column: "CurrentStock");

            migrationBuilder.CreateIndex(
                name: "IX_products_IsActive",
                table: "products",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_products_Name",
                table: "products",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_products_TenantId",
                table: "products",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_sale_items_ProductId",
                table: "sale_items",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_sale_items_SaleId",
                table: "sale_items",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_sale_items_TenantId",
                table: "sale_items",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_CustomerId",
                table: "sales",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_EmployeeId",
                table: "sales",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_SaleDate",
                table: "sales",
                column: "SaleDate");

            migrationBuilder.CreateIndex(
                name: "IX_sales_SaleNumber_TenantId",
                table: "sales",
                columns: new[] { "SaleNumber", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_Status",
                table: "sales",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_sales_TenantId",
                table: "sales",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_MovementDate",
                table: "stock_movements",
                column: "MovementDate");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_MovementType",
                table: "stock_movements",
                column: "MovementType");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_ProductId",
                table: "stock_movements",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_ReferenceId",
                table: "stock_movements",
                column: "ReferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_TenantId",
                table: "stock_movements",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inventory_reports");

            migrationBuilder.DropTable(
                name: "price_histories");

            migrationBuilder.DropTable(
                name: "sale_items");

            migrationBuilder.DropTable(
                name: "stock_movements");

            migrationBuilder.DropTable(
                name: "sales");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "product_categories");
        }
    }
}
