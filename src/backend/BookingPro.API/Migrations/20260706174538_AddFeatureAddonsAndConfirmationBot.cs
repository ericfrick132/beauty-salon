using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFeatureAddonsAndConfirmationBot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConfirmationAdvanceMinutes",
                table: "tenant_messaging_settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ConfirmationBotEnabled",
                table: "tenant_messaging_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ConfirmationTemplate",
                table: "tenant_messaging_settings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "booking_confirmation_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ProviderMessageId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RespondedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResponseText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_confirmation_requests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "feature_addon_purchases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddonCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Months = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PreferenceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PlatformPaymentId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExternalReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feature_addon_purchases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "feature_addons",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MonthlyPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feature_addons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenant_feature_addons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddonCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PaidUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActivatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Source = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_feature_addons", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_booking_confirmation_requests_BookingId",
                table: "booking_confirmation_requests",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_booking_confirmation_requests_TenantId",
                table: "booking_confirmation_requests",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_booking_confirmation_requests_TenantId_Status",
                table: "booking_confirmation_requests",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_feature_addon_purchases_ExternalReference",
                table: "feature_addon_purchases",
                column: "ExternalReference");

            migrationBuilder.CreateIndex(
                name: "IX_feature_addon_purchases_Status",
                table: "feature_addon_purchases",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_feature_addon_purchases_TenantId",
                table: "feature_addon_purchases",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_feature_addons_Code",
                schema: "public",
                table: "feature_addons",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_feature_addons_TenantId_AddonCode",
                table: "tenant_feature_addons",
                columns: new[] { "TenantId", "AddonCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_confirmation_requests");

            migrationBuilder.DropTable(
                name: "feature_addon_purchases");

            migrationBuilder.DropTable(
                name: "feature_addons",
                schema: "public");

            migrationBuilder.DropTable(
                name: "tenant_feature_addons");

            migrationBuilder.DropColumn(
                name: "ConfirmationAdvanceMinutes",
                table: "tenant_messaging_settings");

            migrationBuilder.DropColumn(
                name: "ConfirmationBotEnabled",
                table: "tenant_messaging_settings");

            migrationBuilder.DropColumn(
                name: "ConfirmationTemplate",
                table: "tenant_messaging_settings");
        }
    }
}
