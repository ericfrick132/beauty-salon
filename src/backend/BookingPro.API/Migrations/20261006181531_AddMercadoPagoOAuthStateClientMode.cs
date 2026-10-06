using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMercadoPagoOAuthStateClientMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientMode",
                table: "mercadopago_oauth_states",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "InitiatedByUserId",
                table: "mercadopago_oauth_states",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClientMode",
                table: "mercadopago_oauth_states");

            migrationBuilder.DropColumn(
                name: "InitiatedByUserId",
                table: "mercadopago_oauth_states");
        }
    }
}
