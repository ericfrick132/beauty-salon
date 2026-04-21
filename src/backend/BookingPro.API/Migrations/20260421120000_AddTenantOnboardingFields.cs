using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantOnboardingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OwnerName",
                schema: "public",
                table: "tenants",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OwnerBirthday",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerInstagram",
                schema: "public",
                table: "tenants",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerWeb",
                schema: "public",
                table: "tenants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusinessKind",
                schema: "public",
                table: "tenants",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusinessVolume",
                schema: "public",
                table: "tenants",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusinessWorkMode",
                schema: "public",
                table: "tenants",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeCode",
                schema: "public",
                table: "tenants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryColor",
                schema: "public",
                table: "tenants",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryColor",
                schema: "public",
                table: "tenants",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                schema: "public",
                table: "tenants",
                type: "character varying(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingCompletedAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "OwnerName", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "OwnerBirthday", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "OwnerInstagram", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "OwnerWeb", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "BusinessKind", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "BusinessVolume", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "BusinessWorkMode", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "ThemeCode", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "PrimaryColor", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "SecondaryColor", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "LogoUrl", schema: "public", table: "tenants");
            migrationBuilder.DropColumn(name: "OnboardingCompletedAt", schema: "public", table: "tenants");
        }
    }
}
