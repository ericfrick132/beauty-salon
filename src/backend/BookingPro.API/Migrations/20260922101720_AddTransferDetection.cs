using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferDetection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IncomingPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    MpPaymentId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DateApproved = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PayerDocument = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    PayerDni = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    PayerId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PayerEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    PayerName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    PaymentMethodId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OperationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExternalReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    MatchType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: true),
                    SuggestedBookingId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolvedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncomingPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IncomingPayments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_IncomingPayments_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PayerCustomerMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PayerKey = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    PayerLabel = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayerCustomerMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PayerCustomerMappings_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TransferDetectionSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRunAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransferDetectionSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WhatsAppReceiptClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContactName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    IncomingPaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    AckSent = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsAppReceiptClaims", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IncomingPayments_BookingId",
                table: "IncomingPayments",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_IncomingPayments_CustomerId",
                table: "IncomingPayments",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_IncomingPayments_TenantId_MpPaymentId",
                table: "IncomingPayments",
                columns: new[] { "TenantId", "MpPaymentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IncomingPayments_TenantId_Status",
                table: "IncomingPayments",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PayerCustomerMappings_CustomerId",
                table: "PayerCustomerMappings",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_PayerCustomerMappings_TenantId_PayerKey",
                table: "PayerCustomerMappings",
                columns: new[] { "TenantId", "PayerKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransferDetectionSettings_TenantId",
                table: "TransferDetectionSettings",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppReceiptClaims_TenantId_Status",
                table: "WhatsAppReceiptClaims",
                columns: new[] { "TenantId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IncomingPayments");

            migrationBuilder.DropTable(
                name: "PayerCustomerMappings");

            migrationBuilder.DropTable(
                name: "TransferDetectionSettings");

            migrationBuilder.DropTable(
                name: "WhatsAppReceiptClaims");
        }
    }
}
