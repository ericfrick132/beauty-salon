using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStripePlatformBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StripeCustomerId",
                schema: "public",
                table: "tenants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "feature_addon_purchases",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "feature_addon_purchases",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "feature_addon_prices",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AddonCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feature_addon_prices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "subscription_plan_prices",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    StripePriceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StripePriceAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_plan_prices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_subscription_plan_prices_SubscriptionPlans_SubscriptionPlan~",
                        column: x => x.SubscriptionPlanId,
                        principalTable: "SubscriptionPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_stripe_subscriptions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripeCustomerId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StripeSubscriptionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StripeCheckoutSessionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    StripePriceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TrialEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CurrentPeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelAtPeriodEnd = table.Column<bool>(type: "boolean", nullable: false),
                    CanceledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastInvoiceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastPaymentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_stripe_subscriptions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_feature_addon_prices_AddonCode_Currency",
                schema: "public",
                table: "feature_addon_prices",
                columns: new[] { "AddonCode", "Currency" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_subscription_plan_prices_SubscriptionPlanId_Currency",
                schema: "public",
                table: "subscription_plan_prices",
                columns: new[] { "SubscriptionPlanId", "Currency" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_stripe_subscriptions_Status",
                schema: "public",
                table: "tenant_stripe_subscriptions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_stripe_subscriptions_StripeCheckoutSessionId",
                schema: "public",
                table: "tenant_stripe_subscriptions",
                column: "StripeCheckoutSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_stripe_subscriptions_StripeSubscriptionId",
                schema: "public",
                table: "tenant_stripe_subscriptions",
                column: "StripeSubscriptionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_stripe_subscriptions_TenantId",
                schema: "public",
                table: "tenant_stripe_subscriptions",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "feature_addon_prices",
                schema: "public");

            migrationBuilder.DropTable(
                name: "subscription_plan_prices",
                schema: "public");

            migrationBuilder.DropTable(
                name: "tenant_stripe_subscriptions",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "StripeCustomerId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "feature_addon_purchases");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "feature_addon_purchases");
        }
    }
}
