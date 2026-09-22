using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuBot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MenuBotSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContactName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Step = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    DataJson = table.Column<string>(type: "text", nullable: true),
                    PausedUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MessagesIn = table.Column<int>(type: "integer", nullable: false),
                    BookingsCreated = table.Column<int>(type: "integer", nullable: false),
                    BookingsCancelled = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastMessageAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuBotSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MenuBotSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    CancellationCutoffHours = table.Column<int>(type: "integer", nullable: false),
                    MinBookingAdvanceMinutes = table.Column<int>(type: "integer", nullable: false),
                    DaysToOffer = table.Column<int>(type: "integer", nullable: false),
                    InfoText = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuBotSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MenuBotSessions_LastMessageAt",
                table: "MenuBotSessions",
                column: "LastMessageAt");

            migrationBuilder.CreateIndex(
                name: "IX_MenuBotSessions_TenantId_Phone",
                table: "MenuBotSessions",
                columns: new[] { "TenantId", "Phone" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MenuBotSettings_TenantId",
                table: "MenuBotSettings",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MenuBotSessions");

            migrationBuilder.DropTable(
                name: "MenuBotSettings");
        }
    }
}
