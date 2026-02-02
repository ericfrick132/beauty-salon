using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantSubscriptionPlanId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SubscriptionPlanId",
                schema: "public",
                table: "tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_SubscriptionPlanId",
                schema: "public",
                table: "tenants",
                column: "SubscriptionPlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_tenants_SubscriptionPlans_SubscriptionPlanId",
                schema: "public",
                table: "tenants",
                column: "SubscriptionPlanId",
                principalTable: "SubscriptionPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tenants_SubscriptionPlans_SubscriptionPlanId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropIndex(
                name: "IX_tenants_SubscriptionPlanId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SubscriptionPlanId",
                schema: "public",
                table: "tenants");
        }
    }
}
