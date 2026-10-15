using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMercadoPagoCredentialsMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConnectionMode",
                table: "mercadopago_oauth_configurations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SiteId",
                table: "mercadopago_oauth_configurations",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConnectionMode",
                table: "mercadopago_oauth_configurations");

            migrationBuilder.DropColumn(
                name: "SiteId",
                table: "mercadopago_oauth_configurations");
        }
    }
}
