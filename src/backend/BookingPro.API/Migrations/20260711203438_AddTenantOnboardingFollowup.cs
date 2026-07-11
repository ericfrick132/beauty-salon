using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantOnboardingFollowup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OnboardingFollowupCount",
                schema: "public",
                table: "tenants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "OnboardingFollowupDone",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingLastFollowupAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingFollowupCount",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "OnboardingFollowupDone",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "OnboardingLastFollowupAt",
                schema: "public",
                table: "tenants");
        }
    }
}
