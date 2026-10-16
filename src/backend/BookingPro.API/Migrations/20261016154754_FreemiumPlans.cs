using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class FreemiumPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowCoupons",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowCustomerHistory",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowReminders",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowTrackingPixels",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowTransferDetection",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionPercent",
                table: "SubscriptionPlans",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "MaxCustomFields",
                table: "SubscriptionPlans",
                type: "integer",
                nullable: false,
                defaultValue: -1);

            migrationBuilder.AddColumn<int>(
                name: "MaxRecurringBookings",
                table: "SubscriptionPlans",
                type: "integer",
                nullable: false,
                defaultValue: -1);

            migrationBuilder.AddColumn<int>(
                name: "MaxServicesPerStaff",
                table: "SubscriptionPlans",
                type: "integer",
                nullable: false,
                defaultValue: -1);

            migrationBuilder.AddColumn<string>(
                name: "Tagline",
                table: "SubscriptionPlans",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowCoupons",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "AllowCustomerHistory",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "AllowReminders",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "AllowTrackingPixels",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "AllowTransferDetection",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "CommissionPercent",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "MaxCustomFields",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "MaxRecurringBookings",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "MaxServicesPerStaff",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "Tagline",
                table: "SubscriptionPlans");
        }
    }
}
