using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBacklogMessagesToFollowupLocal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BacklogColdAfterDays",
                schema: "public",
                table: "followup_sequences_local",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BacklogColdMessage",
                schema: "public",
                table: "followup_sequences_local",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BacklogWarmMessage",
                schema: "public",
                table: "followup_sequences_local",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BacklogColdAfterDays",
                schema: "public",
                table: "followup_sequences_local");

            migrationBuilder.DropColumn(
                name: "BacklogColdMessage",
                schema: "public",
                table: "followup_sequences_local");

            migrationBuilder.DropColumn(
                name: "BacklogWarmMessage",
                schema: "public",
                table: "followup_sequences_local");
        }
    }
}
