using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMercadoPagoAndDepositConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Employees_EmployeeId",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Payments_bookings_BookingId",
                table: "Payments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Payments",
                table: "Payments");

            migrationBuilder.RenameTable(
                name: "Payments",
                newName: "payments");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_EmployeeId",
                table: "payments",
                newName: "IX_payments_EmployeeId");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_BookingId",
                table: "payments",
                newName: "IX_payments_BookingId");

            migrationBuilder.AddColumn<int>(
                name: "DepositAdvanceDays",
                table: "services",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DepositFixedAmount",
                table: "services",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DepositPercentage",
                table: "services",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DepositPolicy",
                table: "services",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresDeposit",
                table: "services",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "CustomerId",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "payments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MercadoPagoPaymentId",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MercadoPagoPreferenceId",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayerEmail",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayerName",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentLink",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentType",
                table: "payments",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ServiceId",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DepositAmount",
                table: "bookings",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresDeposit",
                table: "bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_payments",
                table: "payments",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "mercadopago_configurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccessToken = table.Column<string>(type: "text", nullable: true),
                    RefreshToken = table.Column<string>(type: "text", nullable: true),
                    PublicKey = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<string>(type: "text", nullable: true),
                    TokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaymentExpirationMinutes = table.Column<int>(type: "integer", nullable: false),
                    UseSandbox = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mercadopago_configurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_mercadopago_configurations_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_payments_CustomerId",
                table: "payments",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_ServiceId",
                table: "payments",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_Status",
                table: "payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_payments_TenantId",
                table: "payments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_configurations_TenantId",
                table: "mercadopago_configurations",
                column: "TenantId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_Employees_EmployeeId",
                table: "payments",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_bookings_BookingId",
                table: "payments",
                column: "BookingId",
                principalTable: "bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_customers_CustomerId",
                table: "payments",
                column: "CustomerId",
                principalTable: "customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_services_ServiceId",
                table: "payments",
                column: "ServiceId",
                principalTable: "services",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_payments_Employees_EmployeeId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_bookings_BookingId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_customers_CustomerId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_services_ServiceId",
                table: "payments");

            migrationBuilder.DropTable(
                name: "mercadopago_configurations");

            migrationBuilder.DropPrimaryKey(
                name: "PK_payments",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_CustomerId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_ServiceId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_Status",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_TenantId",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "DepositAdvanceDays",
                table: "services");

            migrationBuilder.DropColumn(
                name: "DepositFixedAmount",
                table: "services");

            migrationBuilder.DropColumn(
                name: "DepositPercentage",
                table: "services");

            migrationBuilder.DropColumn(
                name: "DepositPolicy",
                table: "services");

            migrationBuilder.DropColumn(
                name: "RequiresDeposit",
                table: "services");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "MercadoPagoPaymentId",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "MercadoPagoPreferenceId",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "PayerEmail",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "PayerName",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "PaymentLink",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "PaymentType",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "DepositAmount",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "RequiresDeposit",
                table: "bookings");

            migrationBuilder.RenameTable(
                name: "payments",
                newName: "Payments");

            migrationBuilder.RenameIndex(
                name: "IX_payments_EmployeeId",
                table: "Payments",
                newName: "IX_Payments_EmployeeId");

            migrationBuilder.RenameIndex(
                name: "IX_payments_BookingId",
                table: "Payments",
                newName: "IX_Payments_BookingId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Payments",
                table: "Payments",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Employees_EmployeeId",
                table: "Payments",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_bookings_BookingId",
                table: "Payments",
                column: "BookingId",
                principalTable: "bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
