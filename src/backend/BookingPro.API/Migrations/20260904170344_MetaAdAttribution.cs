using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class MetaAdAttribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CtwaClid",
                schema: "public",
                table: "tenants",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Fbclid",
                schema: "public",
                table: "tenants",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Fbp",
                schema: "public",
                table: "tenants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaAdId",
                schema: "public",
                table: "tenants",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaAdsetId",
                schema: "public",
                table: "tenants",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "MetaAttributionAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaAttributionSource",
                schema: "public",
                table: "tenants",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaCampaignId",
                schema: "public",
                table: "tenants",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmCampaign",
                schema: "public",
                table: "tenants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmContent",
                schema: "public",
                table: "tenants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmMedium",
                schema: "public",
                table: "tenants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmSource",
                schema: "public",
                table: "tenants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CtwaClid",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Fbclid",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Fbp",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MetaAdId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MetaAdsetId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MetaAttributionAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MetaAttributionSource",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MetaCampaignId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "UtmCampaign",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "UtmContent",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "UtmMedium",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "UtmSource",
                schema: "public",
                table: "tenants");
        }
    }
}
