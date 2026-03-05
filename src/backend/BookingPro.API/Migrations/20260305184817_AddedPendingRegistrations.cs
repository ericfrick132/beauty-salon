using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddedPendingRegistrations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tenants_Subdomain_VerticalId",
                schema: "public",
                table: "tenants");

            migrationBuilder.AlterColumn<Guid>(
                name: "VerticalId",
                schema: "public",
                table: "tenants",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateTable(
                name: "pending_registrations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    RememberToken = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pending_registrations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenant_whatsapp_connections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstanceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    InstanceToken = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ConnectedPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ProfileName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_whatsapp_connections", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tenants_Subdomain",
                schema: "public",
                table: "tenants",
                column: "Subdomain",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pending_registrations_Email",
                schema: "public",
                table: "pending_registrations",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pending_registrations_RememberToken",
                schema: "public",
                table: "pending_registrations",
                column: "RememberToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_whatsapp_connections_InstanceName",
                table: "tenant_whatsapp_connections",
                column: "InstanceName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_whatsapp_connections_TenantId",
                table: "tenant_whatsapp_connections",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pending_registrations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "tenant_whatsapp_connections");

            migrationBuilder.DropIndex(
                name: "IX_tenants_Subdomain",
                schema: "public",
                table: "tenants");

            migrationBuilder.AlterColumn<Guid>(
                name: "VerticalId",
                schema: "public",
                table: "tenants",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_Subdomain_VerticalId",
                schema: "public",
                table: "tenants",
                columns: new[] { "Subdomain", "VerticalId" },
                unique: true);
        }
    }
}
