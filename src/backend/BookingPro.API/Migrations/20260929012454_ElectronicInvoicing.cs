using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class ElectronicInvoicing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoInvoice",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "AutoInvoiceSince",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoicingCuit",
                schema: "public",
                table: "tenants",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "electronic_invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FacturadorInvoiceId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    VoucherName = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    FullNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Cae = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Error = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsCreditNote = table.Column<bool>(type: "boolean", nullable: false),
                    CreditsElectronicInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    IssueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_electronic_invoices", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_electronic_invoices_Status_LastSyncedAt",
                table: "electronic_invoices",
                columns: new[] { "Status", "LastSyncedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_electronic_invoices_TenantId_ExternalRef",
                table: "electronic_invoices",
                columns: new[] { "TenantId", "ExternalRef" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_electronic_invoices_TenantId_SourceType_SourceId",
                table: "electronic_invoices",
                columns: new[] { "TenantId", "SourceType", "SourceId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "electronic_invoices");

            migrationBuilder.DropColumn(
                name: "AutoInvoice",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "AutoInvoiceSince",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "InvoicingCuit",
                schema: "public",
                table: "tenants");
        }
    }
}
