using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppLineGuardAndOwnerNotify : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoReplyBotEnabled",
                table: "tenant_messaging_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "OwnerDailyReportEnabled",
                table: "tenant_messaging_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "OwnerDailyReportLastSentOn",
                table: "tenant_messaging_settings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerDailyReportTime",
                table: "tenant_messaging_settings",
                type: "character varying(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "08:30");

            migrationBuilder.AddColumn<bool>(
                name: "OwnerNotifyOnBooking",
                table: "tenant_messaging_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OwnerNotifyPhone",
                table: "tenant_messaging_settings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "whatsapp_inbound_events",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HandledBy = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_whatsapp_inbound_events", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "whatsapp_outbound_events",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Section = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    Error = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ToKnownContact = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_whatsapp_outbound_events", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_whatsapp_inbound_events_TenantId_Phone",
                table: "whatsapp_inbound_events",
                columns: new[] { "TenantId", "Phone" });

            migrationBuilder.CreateIndex(
                name: "IX_whatsapp_inbound_events_TenantId_ReceivedAt",
                table: "whatsapp_inbound_events",
                columns: new[] { "TenantId", "ReceivedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_whatsapp_outbound_events_TenantId_SentAt",
                table: "whatsapp_outbound_events",
                columns: new[] { "TenantId", "SentAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "whatsapp_inbound_events");
            migrationBuilder.DropTable(name: "whatsapp_outbound_events");

            migrationBuilder.DropColumn(name: "AutoReplyBotEnabled", table: "tenant_messaging_settings");
            migrationBuilder.DropColumn(name: "OwnerDailyReportEnabled", table: "tenant_messaging_settings");
            migrationBuilder.DropColumn(name: "OwnerDailyReportLastSentOn", table: "tenant_messaging_settings");
            migrationBuilder.DropColumn(name: "OwnerDailyReportTime", table: "tenant_messaging_settings");
            migrationBuilder.DropColumn(name: "OwnerNotifyOnBooking", table: "tenant_messaging_settings");
            migrationBuilder.DropColumn(name: "OwnerNotifyPhone", table: "tenant_messaging_settings");
        }
    }
}
