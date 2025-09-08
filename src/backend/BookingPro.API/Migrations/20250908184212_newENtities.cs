using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class newENtities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "message_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Channel = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    MessageType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProviderMessageId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    To = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Body = table.Column<string>(type: "text", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_message_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "message_packages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_message_packages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "message_purchases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_message_purchases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenant_message_wallets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Balance = table.Column<int>(type: "integer", nullable: false),
                    TotalPurchased = table.Column<int>(type: "integer", nullable: false),
                    TotalSent = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_message_wallets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenant_messaging_settings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    WhatsAppRemindersEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    ReminderAdvanceMinutes = table.Column<int>(type: "integer", nullable: false),
                    ReminderTemplate = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_messaging_settings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_message_logs_BookingId",
                table: "message_logs",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_message_logs_CreatedAt",
                table: "message_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_message_logs_Status",
                table: "message_logs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_message_logs_TenantId",
                table: "message_logs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_message_packages_IsActive",
                table: "message_packages",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_message_packages_Quantity",
                table: "message_packages",
                column: "Quantity");

            migrationBuilder.CreateIndex(
                name: "IX_message_purchases_ExternalReference",
                table: "message_purchases",
                column: "ExternalReference");

            migrationBuilder.CreateIndex(
                name: "IX_message_purchases_PreferenceId",
                table: "message_purchases",
                column: "PreferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_message_purchases_Status",
                table: "message_purchases",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_message_purchases_TenantId",
                table: "message_purchases",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_message_wallets_TenantId",
                table: "tenant_message_wallets",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_messaging_settings_TenantId",
                table: "tenant_messaging_settings",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "message_logs");

            migrationBuilder.DropTable(
                name: "message_packages");

            migrationBuilder.DropTable(
                name: "message_purchases");

            migrationBuilder.DropTable(
                name: "tenant_message_wallets");

            migrationBuilder.DropTable(
                name: "tenant_messaging_settings");
        }
    }
}
