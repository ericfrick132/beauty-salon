using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStripeConnectDeposits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StripeConnectAccountId",
                schema: "public",
                table: "tenants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "StripeConnectChargesEnabled",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "StripeConnectDetailsSubmitted",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "StripeConnectPayoutsEnabled",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "payment_transactions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeCheckoutSessionId",
                table: "payment_transactions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripePaymentIntentId",
                table: "payment_transactions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_StripeConnectAccountId",
                schema: "public",
                table: "tenants",
                column: "StripeConnectAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_StripeCheckoutSessionId",
                table: "payment_transactions",
                column: "StripeCheckoutSessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tenants_StripeConnectAccountId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropIndex(
                name: "IX_payment_transactions_StripeCheckoutSessionId",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "StripeConnectAccountId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "StripeConnectChargesEnabled",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "StripeConnectDetailsSubmitted",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "StripeConnectPayoutsEnabled",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "StripeCheckoutSessionId",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "StripePaymentIntentId",
                table: "payment_transactions");
        }
    }
}
