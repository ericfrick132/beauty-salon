using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class SuscriptionAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_subscriptions_plans_PlanId",
                schema: "public",
                table: "subscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_subscriptions_tenants_TenantId",
                schema: "public",
                table: "subscriptions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_subscriptions",
                schema: "public",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "CurrentPeriodEnd",
                schema: "public",
                table: "subscriptions");

            migrationBuilder.RenameTable(
                name: "subscriptions",
                schema: "public",
                newName: "Subscriptions");

            migrationBuilder.RenameColumn(
                name: "StripeSubscriptionId",
                table: "Subscriptions",
                newName: "PayerEmail");

            migrationBuilder.RenameColumn(
                name: "CurrentPeriodStart",
                table: "Subscriptions",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "CancelAtPeriodEnd",
                table: "Subscriptions",
                newName: "IsTrialPeriod");

            migrationBuilder.RenameIndex(
                name: "IX_subscriptions_TenantId",
                table: "Subscriptions",
                newName: "IX_Subscriptions_TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_subscriptions_PlanId",
                table: "Subscriptions",
                newName: "IX_Subscriptions_PlanId");

            migrationBuilder.AddColumn<string>(
                name: "UserEmail",
                table: "mercadopago_configurations",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "PlanId",
                table: "Subscriptions",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<DateTime>(
                name: "ActivatedAt",
                table: "Subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "Subscriptions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "Subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MercadoPagoPreapprovalId",
                table: "Subscriptions",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MercadoPagoPreapprovalPlanId",
                table: "Subscriptions",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyAmount",
                table: "Subscriptions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextPaymentDate",
                table: "Subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlanType",
                table: "Subscriptions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "TrialEndsAt",
                table: "Subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Subscriptions",
                table: "Subscriptions",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "SubscriptionPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoPaymentId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubscriptionPayments_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SubscriptionPayments_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    MaxBookingsPerMonth = table.Column<int>(type: "integer", nullable: false),
                    MaxServices = table.Column<int>(type: "integer", nullable: false),
                    MaxStaff = table.Column<int>(type: "integer", nullable: false),
                    MaxCustomers = table.Column<int>(type: "integer", nullable: false),
                    AllowOnlinePayments = table.Column<bool>(type: "boolean", nullable: false),
                    AllowCustomBranding = table.Column<bool>(type: "boolean", nullable: false),
                    AllowSmsNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    AllowEmailMarketing = table.Column<bool>(type: "boolean", nullable: false),
                    AllowReports = table.Column<bool>(type: "boolean", nullable: false),
                    AllowMultiLocation = table.Column<bool>(type: "boolean", nullable: false),
                    MercadoPagoPreapprovalPlanId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    TrialDays = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsPopular = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPayments_SubscriptionId",
                table: "SubscriptionPayments",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPayments_TenantId",
                table: "SubscriptionPayments",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_plans_PlanId",
                table: "Subscriptions",
                column: "PlanId",
                principalSchema: "public",
                principalTable: "plans",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_tenants_TenantId",
                table: "Subscriptions",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subscriptions_plans_PlanId",
                table: "Subscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_Subscriptions_tenants_TenantId",
                table: "Subscriptions");

            migrationBuilder.DropTable(
                name: "SubscriptionPayments");

            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Subscriptions",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "UserEmail",
                table: "mercadopago_configurations");

            migrationBuilder.DropColumn(
                name: "ActivatedAt",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "MercadoPagoPreapprovalId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "MercadoPagoPreapprovalPlanId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "MonthlyAmount",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "NextPaymentDate",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "PlanType",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "TrialEndsAt",
                table: "Subscriptions");

            migrationBuilder.RenameTable(
                name: "Subscriptions",
                newName: "subscriptions",
                newSchema: "public");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                schema: "public",
                table: "subscriptions",
                newName: "CurrentPeriodStart");

            migrationBuilder.RenameColumn(
                name: "PayerEmail",
                schema: "public",
                table: "subscriptions",
                newName: "StripeSubscriptionId");

            migrationBuilder.RenameColumn(
                name: "IsTrialPeriod",
                schema: "public",
                table: "subscriptions",
                newName: "CancelAtPeriodEnd");

            migrationBuilder.RenameIndex(
                name: "IX_Subscriptions_TenantId",
                schema: "public",
                table: "subscriptions",
                newName: "IX_subscriptions_TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_Subscriptions_PlanId",
                schema: "public",
                table: "subscriptions",
                newName: "IX_subscriptions_PlanId");

            migrationBuilder.AlterColumn<Guid>(
                name: "PlanId",
                schema: "public",
                table: "subscriptions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CurrentPeriodEnd",
                schema: "public",
                table: "subscriptions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddPrimaryKey(
                name: "PK_subscriptions",
                schema: "public",
                table: "subscriptions",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_subscriptions_plans_PlanId",
                schema: "public",
                table: "subscriptions",
                column: "PlanId",
                principalSchema: "public",
                principalTable: "plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_subscriptions_tenants_TenantId",
                schema: "public",
                table: "subscriptions",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
