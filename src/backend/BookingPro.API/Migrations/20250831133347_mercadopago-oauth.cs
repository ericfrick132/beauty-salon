using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class mercadopagooauth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mercadopago_oauth_configurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoUserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    AccessToken = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AccessTokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RefreshTokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AccountEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    AccountNickname = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CountryId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CurrencyId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsTestMode = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRefreshAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RefreshAttempts = table.Column<int>(type: "integer", nullable: false),
                    LastRefreshError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PublicKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mercadopago_oauth_configurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "mercadopago_oauth_states",
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
                    table.PrimaryKey("PK_mercadopago_oauth_states", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_AccessTokenExpiresAt",
                table: "mercadopago_oauth_configurations",
                column: "AccessTokenExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_IsActive",
                table: "mercadopago_oauth_configurations",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_MercadoPagoUserId",
                table: "mercadopago_oauth_configurations",
                column: "MercadoPagoUserId");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_TenantId",
                table: "mercadopago_oauth_configurations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_ExpiresAt",
                table: "mercadopago_oauth_states",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_IsCompleted",
                table: "mercadopago_oauth_states",
                column: "IsCompleted");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_State",
                table: "mercadopago_oauth_states",
                column: "State",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_TenantId",
                table: "mercadopago_oauth_states",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mercadopago_oauth_configurations");

            migrationBuilder.DropTable(
                name: "mercadopago_oauth_states");
        }
    }
}
