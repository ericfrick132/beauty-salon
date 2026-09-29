using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingIdToSales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BookingId",
                table: "sales",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_BookingId",
                table: "sales",
                column: "BookingId");

            migrationBuilder.AddForeignKey(
                name: "FK_sales_bookings_BookingId",
                table: "sales",
                column: "BookingId",
                principalTable: "bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_bookings_BookingId",
                table: "sales");

            migrationBuilder.DropIndex(
                name: "IX_sales_BookingId",
                table: "sales");

            migrationBuilder.DropColumn(
                name: "BookingId",
                table: "sales");
        }
    }
}
