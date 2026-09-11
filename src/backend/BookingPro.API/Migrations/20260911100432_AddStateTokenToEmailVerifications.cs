using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStateTokenToEmailVerifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttributionJson",
                schema: "public",
                table: "email_verifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StateToken",
                schema: "public",
                table: "email_verifications",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_email_verifications_StateToken",
                schema: "public",
                table: "email_verifications",
                column: "StateToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_email_verifications_StateToken",
                schema: "public",
                table: "email_verifications");

            migrationBuilder.DropColumn(
                name: "AttributionJson",
                schema: "public",
                table: "email_verifications");

            migrationBuilder.DropColumn(
                name: "StateToken",
                schema: "public",
                table: "email_verifications");
        }
    }
}
