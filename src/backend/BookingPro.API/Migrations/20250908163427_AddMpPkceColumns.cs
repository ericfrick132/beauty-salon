using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMpPkceColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CodeChallenge",
                table: "mercadopago_oauth_states",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeChallengeMethod",
                table: "mercadopago_oauth_states",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodeVerifier",
                table: "mercadopago_oauth_states",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodeChallenge",
                table: "mercadopago_oauth_states");

            migrationBuilder.DropColumn(
                name: "CodeChallengeMethod",
                table: "mercadopago_oauth_states");

            migrationBuilder.DropColumn(
                name: "CodeVerifier",
                table: "mercadopago_oauth_states");
        }
    }
}
