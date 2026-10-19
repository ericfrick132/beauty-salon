using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class WhatsAppMarketingOptIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "WhatsAppMarketingOptIn",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "WhatsAppMarketingOptInAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppMarketingOptInSource",
                schema: "public",
                table: "tenants",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WhatsAppMarketingOptIn",
                schema: "public",
                table: "email_verifications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppMarketingOptInSource",
                schema: "public",
                table: "email_verifications",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WhatsAppMarketingOptIn",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "WhatsAppMarketingOptInAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "WhatsAppMarketingOptInSource",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "WhatsAppMarketingOptIn",
                schema: "public",
                table: "email_verifications");

            migrationBuilder.DropColumn(
                name: "WhatsAppMarketingOptInSource",
                schema: "public",
                table: "email_verifications");
        }
    }
}
