using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <summary>
    /// Soporte para registro sin contraseña (magic link por email):
    /// - pending_registrations gana los datos del negocio (BusinessName, FullName,
    ///   Mobile) y un flag IsPasswordless, para poder crear la cuenta recién al
    ///   confirmar el enlace.
    /// - users gana MustSetPassword, que fuerza a definir contraseña en el primer
    ///   ingreso (la cuenta nace con una contraseña aleatoria inutilizable).
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260601120000_AddPasswordlessRegistration")]
    public partial class AddPasswordlessRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusinessName",
                schema: "public",
                table: "pending_registrations",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FullName",
                schema: "public",
                table: "pending_registrations",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Mobile",
                schema: "public",
                table: "pending_registrations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPasswordless",
                schema: "public",
                table: "pending_registrations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "MustSetPassword",
                schema: "public",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusinessName",
                schema: "public",
                table: "pending_registrations");

            migrationBuilder.DropColumn(
                name: "FullName",
                schema: "public",
                table: "pending_registrations");

            migrationBuilder.DropColumn(
                name: "Mobile",
                schema: "public",
                table: "pending_registrations");

            migrationBuilder.DropColumn(
                name: "IsPasswordless",
                schema: "public",
                table: "pending_registrations");

            migrationBuilder.DropColumn(
                name: "MustSetPassword",
                schema: "public",
                table: "users");
        }
    }
}
