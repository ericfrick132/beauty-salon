using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "email_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ToEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Subject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TemplateKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_email_logs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_email_logs_CreatedAt",
                table: "email_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_email_logs_Status",
                table: "email_logs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_email_logs_TemplateKey",
                table: "email_logs",
                column: "TemplateKey");

            migrationBuilder.CreateIndex(
                name: "IX_email_logs_TenantId",
                table: "email_logs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_email_logs_ToEmail",
                table: "email_logs",
                column: "ToEmail");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "email_logs");
        }
    }
}
