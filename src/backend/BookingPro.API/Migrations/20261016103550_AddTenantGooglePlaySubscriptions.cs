using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantGooglePlaySubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tenant_google_play_subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseToken = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    LinkedPurchaseToken = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    ProductId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    BasePlanId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    LatestOrderId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    State = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AutoRenewing = table.Column<bool>(type: "boolean", nullable: false),
                    IsTest = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_google_play_subscriptions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tenant_google_play_subscriptions_LinkedPurchaseToken",
                table: "tenant_google_play_subscriptions",
                column: "LinkedPurchaseToken");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_google_play_subscriptions_PurchaseToken",
                table: "tenant_google_play_subscriptions",
                column: "PurchaseToken");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_google_play_subscriptions_TenantId",
                table: "tenant_google_play_subscriptions",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tenant_google_play_subscriptions");
        }
    }
}
