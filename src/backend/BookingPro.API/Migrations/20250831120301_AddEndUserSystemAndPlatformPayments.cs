using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEndUserSystemAndPlatformPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "end_users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DemoStartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DemoEndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MembershipStartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MembershipEndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CurrentPlanType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CurrentPlanAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    LastRenewalReminderSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RenewalReminderCount = table.Column<int>(type: "integer", nullable: false),
                    WelcomeEmailSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Day3EmailSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Day5EmailSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Day7EmailSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RecoveryEmailSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RecoveryEmailCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_end_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "platform_mercadopago_config",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccessToken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PublicKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsSandbox = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_mercadopago_config", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenant_plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    DurationDays = table.Column<int>(type: "integer", nullable: false),
                    DiscountPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsMostPopular = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_plans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenant_subscription_payments",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlatformPaymentId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PreferenceId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    Period = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PayerEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_subscription_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_subscription_payments_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "memberships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    EndUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AmountPaid = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PreferenceId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IsAutoRenewal = table.Column<bool>(type: "boolean", nullable: false),
                    NextRenewalDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RenewalLinkGeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RenewalPaymentLink = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RenewalReminder3DaysSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RenewalReminder1DaySentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpirationNoticeSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_memberships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_memberships_end_users_EndUserId",
                        column: x => x.EndUserId,
                        principalTable: "end_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_memberships_tenant_plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "tenant_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "end_user_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    EndUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MembershipId = table.Column<Guid>(type: "uuid", nullable: true),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MercadoPagoPaymentId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PreferenceId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PaymentLink = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExternalReference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_end_user_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_end_user_payments_end_users_EndUserId",
                        column: x => x.EndUserId,
                        principalTable: "end_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_end_user_payments_memberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_end_user_payments_tenant_plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "tenant_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_end_user_payments_EndUserId",
                table: "end_user_payments",
                column: "EndUserId");

            migrationBuilder.CreateIndex(
                name: "IX_end_user_payments_ExternalReference",
                table: "end_user_payments",
                column: "ExternalReference");

            migrationBuilder.CreateIndex(
                name: "IX_end_user_payments_MembershipId",
                table: "end_user_payments",
                column: "MembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_end_user_payments_MercadoPagoPaymentId",
                table: "end_user_payments",
                column: "MercadoPagoPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_end_user_payments_PlanId",
                table: "end_user_payments",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_end_user_payments_Status",
                table: "end_user_payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_end_user_payments_TenantId",
                table: "end_user_payments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_end_users_DemoEndsAt",
                table: "end_users",
                column: "DemoEndsAt");

            migrationBuilder.CreateIndex(
                name: "IX_end_users_Email_TenantId",
                table: "end_users",
                columns: new[] { "Email", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_end_users_MembershipEndsAt",
                table: "end_users",
                column: "MembershipEndsAt");

            migrationBuilder.CreateIndex(
                name: "IX_end_users_Status",
                table: "end_users",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_end_users_TenantId",
                table: "end_users",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_memberships_EndDate",
                table: "memberships",
                column: "EndDate");

            migrationBuilder.CreateIndex(
                name: "IX_memberships_EndUserId",
                table: "memberships",
                column: "EndUserId");

            migrationBuilder.CreateIndex(
                name: "IX_memberships_PlanId",
                table: "memberships",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_memberships_Status",
                table: "memberships",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_memberships_TenantId",
                table: "memberships",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_platform_mercadopago_config_IsActive",
                schema: "public",
                table: "platform_mercadopago_config",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_platform_mercadopago_config_IsSandbox",
                schema: "public",
                table: "platform_mercadopago_config",
                column: "IsSandbox");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_plans_Code_TenantId",
                table: "tenant_plans",
                columns: new[] { "Code", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_plans_DisplayOrder",
                table: "tenant_plans",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_plans_IsActive",
                table: "tenant_plans",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_plans_TenantId",
                table: "tenant_plans",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscription_payments_PeriodEnd",
                schema: "public",
                table: "tenant_subscription_payments",
                column: "PeriodEnd");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscription_payments_PlatformPaymentId",
                schema: "public",
                table: "tenant_subscription_payments",
                column: "PlatformPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscription_payments_Status",
                schema: "public",
                table: "tenant_subscription_payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscription_payments_TenantId",
                schema: "public",
                table: "tenant_subscription_payments",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "end_user_payments");

            migrationBuilder.DropTable(
                name: "platform_mercadopago_config",
                schema: "public");

            migrationBuilder.DropTable(
                name: "tenant_subscription_payments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "memberships");

            migrationBuilder.DropTable(
                name: "end_users");

            migrationBuilder.DropTable(
                name: "tenant_plans");
        }
    }
}
