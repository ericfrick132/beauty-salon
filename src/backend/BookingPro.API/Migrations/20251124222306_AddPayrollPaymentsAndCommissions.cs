using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPayrollPaymentsAndCommissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ProductCommissionPercentage",
                table: "Employees",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceCommissionPercentage",
                table: "Employees",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            // Inicializar los nuevos porcentajes con el valor de CommissionPercentage existente
            migrationBuilder.Sql(
                "UPDATE \"Employees\" SET \"ServiceCommissionPercentage\" = \"CommissionPercentage\", \"ProductCommissionPercentage\" = \"CommissionPercentage\";");

            migrationBuilder.CreateTable(
                name: "payroll_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    PeriodKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payroll_payments_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_payroll_payments_EmployeeId",
                table: "payroll_payments",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_payments_PeriodKey",
                table: "payroll_payments",
                column: "PeriodKey");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_payments_TenantId",
                table: "payroll_payments",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "payroll_payments");

            migrationBuilder.DropColumn(
                name: "ProductCommissionPercentage",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "ServiceCommissionPercentage",
                table: "Employees");
        }
    }
}
