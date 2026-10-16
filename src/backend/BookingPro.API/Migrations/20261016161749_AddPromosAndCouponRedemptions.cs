using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPromosAndCouponRedemptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PendingCouponCode",
                schema: "public",
                table: "tenants",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "coupon_redemptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CouponId = table.Column<int>(type: "integer", nullable: false),
                    CouponCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantPreapprovalId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoPreapprovalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DurationMonths = table.Column<int>(type: "integer", nullable: true),
                    OriginalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountedAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CurrencyId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_coupon_redemptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_coupon_redemptions_Coupons_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "promos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CouponId = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Headline = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Subheadline = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Bullets = table.Column<List<string>>(type: "text[]", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DiscountPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DurationMonths = table.Column<int>(type: "integer", nullable: true),
                    StartsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ImageCredit = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_promos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_promos_Coupons_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_coupon_redemptions_CouponId",
                table: "coupon_redemptions",
                column: "CouponId");

            migrationBuilder.CreateIndex(
                name: "IX_coupon_redemptions_TenantId",
                table: "coupon_redemptions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_coupon_redemptions_TenantPreapprovalId",
                table: "coupon_redemptions",
                column: "TenantPreapprovalId");

            migrationBuilder.CreateIndex(
                name: "IX_promos_CouponId",
                table: "promos",
                column: "CouponId");

            migrationBuilder.CreateIndex(
                name: "IX_promos_Slug",
                table: "promos",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "coupon_redemptions");

            migrationBuilder.DropTable(
                name: "promos");

            migrationBuilder.DropColumn(
                name: "PendingCouponCode",
                schema: "public",
                table: "tenants");
        }
    }
}
