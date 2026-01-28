using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBlockSeriesSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RecurrencePattern",
                table: "employee_time_blocks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SeriesId",
                table: "employee_time_blocks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "tenant_preapprovals",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoPreapprovalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InitPoint = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SandboxInitPoint = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PayerEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PayerId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FrequencyValue = table.Column<int>(type: "integer", nullable: false),
                    FrequencyType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TransactionAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    CurrencyId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ExternalReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Reason = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AuthorizedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextPaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastPaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PausedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConsecutiveFailedPayments = table.Column<int>(type: "integer", nullable: false),
                    LastFailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TotalPaymentsProcessed = table.Column<int>(type: "integer", nullable: false),
                    TotalAmountPaid = table.Column<decimal>(type: "numeric", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_preapprovals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_preapprovals_SubscriptionPlans_SubscriptionPlanId",
                        column: x => x.SubscriptionPlanId,
                        principalTable: "SubscriptionPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tenant_preapprovals_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "preapproval_payments",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantPreapprovalId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoPaymentId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MercadoPagoPreapprovalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    CurrencyId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StatusDetail = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PaymentMethodId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PaymentTypeId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CardLastFourDigits = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: true),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MoneyReleaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RetryAttempt = table.Column<int>(type: "integer", nullable: false),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExternalReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RawResponse = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_preapproval_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_preapproval_payments_tenant_preapprovals_TenantPreapprovalId",
                        column: x => x.TenantPreapprovalId,
                        principalSchema: "public",
                        principalTable: "tenant_preapprovals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_preapproval_payments_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_preapproval_payments_ExternalReference",
                schema: "public",
                table: "preapproval_payments",
                column: "ExternalReference");

            migrationBuilder.CreateIndex(
                name: "IX_preapproval_payments_MercadoPagoPaymentId",
                schema: "public",
                table: "preapproval_payments",
                column: "MercadoPagoPaymentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_preapproval_payments_PaymentDate",
                schema: "public",
                table: "preapproval_payments",
                column: "PaymentDate");

            migrationBuilder.CreateIndex(
                name: "IX_preapproval_payments_Status",
                schema: "public",
                table: "preapproval_payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_preapproval_payments_TenantId",
                schema: "public",
                table: "preapproval_payments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_preapproval_payments_TenantPreapprovalId",
                schema: "public",
                table: "preapproval_payments",
                column: "TenantPreapprovalId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_preapprovals_ExternalReference",
                schema: "public",
                table: "tenant_preapprovals",
                column: "ExternalReference");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_preapprovals_MercadoPagoPreapprovalId",
                schema: "public",
                table: "tenant_preapprovals",
                column: "MercadoPagoPreapprovalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_preapprovals_NextPaymentDate",
                schema: "public",
                table: "tenant_preapprovals",
                column: "NextPaymentDate");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_preapprovals_PayerEmail",
                schema: "public",
                table: "tenant_preapprovals",
                column: "PayerEmail");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_preapprovals_Status",
                schema: "public",
                table: "tenant_preapprovals",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_preapprovals_SubscriptionPlanId",
                schema: "public",
                table: "tenant_preapprovals",
                column: "SubscriptionPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_preapprovals_TenantId",
                schema: "public",
                table: "tenant_preapprovals",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "preapproval_payments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "tenant_preapprovals",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "RecurrencePattern",
                table: "employee_time_blocks");

            migrationBuilder.DropColumn(
                name: "SeriesId",
                table: "employee_time_blocks");
        }
    }
}
