using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOtpFollowupColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FollowupCount",
                schema: "public",
                table: "phone_verifications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastFollowupAt",
                schema: "public",
                table: "phone_verifications",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FollowupCount",
                schema: "public",
                table: "phone_verifications");

            migrationBuilder.DropColumn(
                name: "LastFollowupAt",
                schema: "public",
                table: "phone_verifications");
        }
    }
}
