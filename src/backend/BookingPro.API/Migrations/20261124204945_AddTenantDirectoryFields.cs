using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantDirectoryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                schema: "public",
                table: "tenants",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsListed",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "IsListed",
                schema: "public",
                table: "tenants");
        }
    }
}
