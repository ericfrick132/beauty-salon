using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationSettingsFollowUp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FollowUpDelayMinutes",
                table: "NotificationSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "FollowUpEmailEnabled",
                table: "NotificationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FollowUpEmailTemplateKey",
                table: "NotificationSettings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FollowUpWhatsAppEnabled",
                table: "NotificationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FollowUpWhatsAppMessage",
                table: "NotificationSettings",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PlatformPaymentConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AccessToken = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    PublicKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExternalAccountId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AccountEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Scope = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformPaymentConnections", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlatformPaymentConnections");

            migrationBuilder.DropColumn(
                name: "FollowUpDelayMinutes",
                table: "NotificationSettings");

            migrationBuilder.DropColumn(
                name: "FollowUpEmailEnabled",
                table: "NotificationSettings");

            migrationBuilder.DropColumn(
                name: "FollowUpEmailTemplateKey",
                table: "NotificationSettings");

            migrationBuilder.DropColumn(
                name: "FollowUpWhatsAppEnabled",
                table: "NotificationSettings");

            migrationBuilder.DropColumn(
                name: "FollowUpWhatsAppMessage",
                table: "NotificationSettings");
        }
    }
}
