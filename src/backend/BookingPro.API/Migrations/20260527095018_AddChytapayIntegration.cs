using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddChytapayIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultPaymentProvider",
                schema: "public",
                table: "tenants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "chytapay_oauth_configurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    IdToken = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    IdTokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsTestMode = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRefreshAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RefreshAttempts = table.Column<int>(type: "integer", nullable: false),
                    LastRefreshError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chytapay_oauth_configurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "chytapay_oauth_states",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    State = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AuthorizationUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    IsExpired = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AuthorizationCode = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorCode = table.Column<string>(type: "text", nullable: true),
                    ErrorDescription = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chytapay_oauth_states", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_chytapay_oauth_configurations_IdTokenExpiresAt",
                table: "chytapay_oauth_configurations",
                column: "IdTokenExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_chytapay_oauth_configurations_IsActive",
                table: "chytapay_oauth_configurations",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_chytapay_oauth_configurations_TenantId",
                table: "chytapay_oauth_configurations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_chytapay_oauth_states_ExpiresAt",
                table: "chytapay_oauth_states",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_chytapay_oauth_states_IsCompleted",
                table: "chytapay_oauth_states",
                column: "IsCompleted");

            migrationBuilder.CreateIndex(
                name: "IX_chytapay_oauth_states_State",
                table: "chytapay_oauth_states",
                column: "State",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chytapay_oauth_states_TenantId",
                table: "chytapay_oauth_states",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chytapay_oauth_configurations");

            migrationBuilder.DropTable(
                name: "chytapay_oauth_states");

            migrationBuilder.DropColumn(
                name: "DefaultPaymentProvider",
                schema: "public",
                table: "tenants");
        }
    }
}
