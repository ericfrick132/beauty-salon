using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingPro.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Dni = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BirthDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Tags = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DailyReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalRevenue = table.Column<decimal>(type: "numeric", nullable: false),
                    CashRevenue = table.Column<decimal>(type: "numeric", nullable: false),
                    CardRevenue = table.Column<decimal>(type: "numeric", nullable: false),
                    TransferRevenue = table.Column<decimal>(type: "numeric", nullable: false),
                    MercadoPagoRevenue = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalBookings = table.Column<int>(type: "integer", nullable: false),
                    CompletedBookings = table.Column<int>(type: "integer", nullable: false),
                    CancelledBookings = table.Column<int>(type: "integer", nullable: false),
                    TotalCommissions = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalTips = table.Column<decimal>(type: "numeric", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    EmployeeType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CommissionPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    FixedSalary = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Specialties = table.Column<string>(type: "text", nullable: true),
                    WorkingHours = table.Column<string>(type: "text", nullable: true),
                    CanPerformServices = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeactivatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Id);
                });

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
                name: "mercadopago_oauth_configurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoUserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    AccessToken = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RefreshToken = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AccessTokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RefreshTokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AccountEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    AccountNickname = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CountryId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CurrencyId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsTestMode = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRefreshAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RefreshAttempts = table.Column<int>(type: "integer", nullable: false),
                    LastRefreshError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PublicKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mercadopago_oauth_configurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "mercadopago_oauth_states",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    State = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AuthorizationUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    IsExpired = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AuthorizationCode = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorCode = table.Column<string>(type: "text", nullable: true),
                    ErrorDescription = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mercadopago_oauth_states", x => x.Id);
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
                name: "service_categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    MaxBookingsPerMonth = table.Column<int>(type: "integer", nullable: false),
                    MaxServices = table.Column<int>(type: "integer", nullable: false),
                    MaxStaff = table.Column<int>(type: "integer", nullable: false),
                    MaxCustomers = table.Column<int>(type: "integer", nullable: false),
                    AllowOnlinePayments = table.Column<bool>(type: "boolean", nullable: false),
                    AllowCustomBranding = table.Column<bool>(type: "boolean", nullable: false),
                    AllowSmsNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    AllowEmailMarketing = table.Column<bool>(type: "boolean", nullable: false),
                    AllowReports = table.Column<bool>(type: "boolean", nullable: false),
                    AllowMultiLocation = table.Column<bool>(type: "boolean", nullable: false),
                    AllowWhatsApp = table.Column<bool>(type: "boolean", nullable: false),
                    WhatsAppMonthlyLimit = table.Column<int>(type: "integer", nullable: false),
                    WhatsAppExtraMessageCost = table.Column<decimal>(type: "numeric", nullable: false),
                    MercadoPagoPreapprovalPlanId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    TrialDays = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsPopular = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
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
                name: "verticals",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Domain = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DefaultTheme = table.Column<string>(type: "text", nullable: false),
                    DefaultServices = table.Column<string>(type: "text", nullable: false),
                    Terminology = table.Column<string>(type: "text", nullable: false),
                    Features = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verticals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Schedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Schedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Schedules_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    RequiresDeposit = table.Column<bool>(type: "boolean", nullable: false),
                    DepositPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    DepositFixedAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    DepositPolicy = table.Column<string>(type: "text", nullable: false),
                    DepositAdvanceDays = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_services", x => x.Id);
                    table.ForeignKey(
                        name: "FK_services_service_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "service_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
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
                name: "plans",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VerticalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PriceMonthly = table.Column<decimal>(type: "numeric", nullable: false),
                    PriceYearly = table.Column<decimal>(type: "numeric", nullable: true),
                    Features = table.Column<string>(type: "text", nullable: false),
                    Limits = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_plans_verticals_VerticalId",
                        column: x => x.VerticalId,
                        principalSchema: "public",
                        principalTable: "verticals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    ReminderSent = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancellationReason = table.Column<string>(type: "text", nullable: true),
                    RequiresDeposit = table.Column<bool>(type: "boolean", nullable: false),
                    DepositAmount = table.Column<decimal>(type: "numeric", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bookings_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "services",
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

            migrationBuilder.CreateTable(
                name: "tenants",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VerticalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Subdomain = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OwnerEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OwnerPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BusinessAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IsDemo = table.Column<bool>(type: "boolean", nullable: false),
                    DemoDays = table.Column<int>(type: "integer", nullable: true),
                    DemoExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomDomain = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ThemeOverrides = table.Column<string>(type: "text", nullable: true),
                    Settings = table.Column<string>(type: "text", nullable: false),
                    SchemaName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TrialEndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SuspendedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenants_plans_PlanId",
                        column: x => x.PlanId,
                        principalSchema: "public",
                        principalTable: "plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tenants_verticals_VerticalId",
                        column: x => x.VerticalId,
                        principalSchema: "public",
                        principalTable: "verticals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "booking_status_history",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ToStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ChangedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_booking_status_history", x => x.Id);
                    table.ForeignKey(
                        name: "FK_booking_status_history_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TransactionId = table.Column<string>(type: "text", nullable: true),
                    MercadoPagoPaymentId = table.Column<string>(type: "text", nullable: true),
                    MercadoPagoPreferenceId = table.Column<string>(type: "text", nullable: true),
                    PaymentLink = table.Column<string>(type: "text", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PayerEmail = table.Column<string>(type: "text", nullable: true),
                    PayerName = table.Column<string>(type: "text", nullable: true),
                    FailureReason = table.Column<string>(type: "text", nullable: true),
                    CommissionAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    TipAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    PaymentType = table.Column<string>(type: "text", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payments_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_payments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_payments_services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "services",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "invitations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VerticalId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: true),
                    Token = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Subdomain = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    BusinessAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AdminEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    AdminPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsDemo = table.Column<bool>(type: "boolean", nullable: false),
                    DemoDays = table.Column<int>(type: "integer", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedTenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_invitations_plans_PlanId",
                        column: x => x.PlanId,
                        principalSchema: "public",
                        principalTable: "plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_invitations_tenants_CreatedTenantId",
                        column: x => x.CreatedTenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_invitations_verticals_VerticalId",
                        column: x => x.VerticalId,
                        principalSchema: "public",
                        principalTable: "verticals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "mercadopago_configurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccessToken = table.Column<string>(type: "text", nullable: true),
                    RefreshToken = table.Column<string>(type: "text", nullable: true),
                    PublicKey = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<string>(type: "text", nullable: true),
                    UserEmail = table.Column<string>(type: "text", nullable: true),
                    TokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaymentExpirationMinutes = table.Column<int>(type: "integer", nullable: false),
                    UseSandbox = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mercadopago_configurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_mercadopago_configurations_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_configurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoPublicKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MercadoPagoAccessToken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsSandbox = table.Column<bool>(type: "boolean", nullable: false),
                    RequireImmediatePayment = table.Column<bool>(type: "boolean", nullable: false),
                    MinimumDepositPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    MinimumDepositAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    WebhookSecret = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ServiceFeePercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_configurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payment_configurations_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payment_transactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    MercadoPagoPaymentId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MercadoPagoPreferenceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MercadoPagoMerchantOrderId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PaymentMethodId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProcessorResponseCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ProcessorResponseMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsRefunded = table.Column<bool>(type: "boolean", nullable: false),
                    RefundedAmount = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    RefundedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RefundReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_transactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payment_transactions_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_payment_transactions_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payment_transactions_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MonthlyAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    MercadoPagoPreapprovalId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    MercadoPagoPreapprovalPlanId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PayerEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActivatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextPaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancellationReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsTrialPeriod = table.Column<bool>(type: "boolean", nullable: false),
                    TrialEndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Subscriptions_plans_PlanId",
                        column: x => x.PlanId,
                        principalSchema: "public",
                        principalTable: "plans",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Subscriptions_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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
                name: "users",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastLogin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoPaymentId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubscriptionPayments_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SubscriptionPayments_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_booking_status_history_BookingId",
                table: "booking_status_history",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_booking_status_history_ChangedAt",
                table: "booking_status_history",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_booking_status_history_TenantId",
                table: "booking_status_history",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_CustomerId",
                table: "bookings",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_EmployeeId",
                table: "bookings",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_ServiceId",
                table: "bookings",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_StartTime",
                table: "bookings",
                column: "StartTime");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_Status",
                table: "bookings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TenantId",
                table: "bookings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_customers_Email_TenantId",
                table: "customers",
                columns: new[] { "Email", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customers_Phone_TenantId",
                table: "customers",
                columns: new[] { "Phone", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customers_TenantId",
                table: "customers",
                column: "TenantId");

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
                name: "IX_invitations_CreatedTenantId",
                schema: "public",
                table: "invitations",
                column: "CreatedTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_ExpiresAt",
                schema: "public",
                table: "invitations",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_PlanId",
                schema: "public",
                table: "invitations",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_Status",
                schema: "public",
                table: "invitations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_Subdomain_VerticalId",
                schema: "public",
                table: "invitations",
                columns: new[] { "Subdomain", "VerticalId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invitations_Token",
                schema: "public",
                table: "invitations",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invitations_VerticalId",
                schema: "public",
                table: "invitations",
                column: "VerticalId");

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
                name: "IX_mercadopago_configurations_TenantId",
                table: "mercadopago_configurations",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_AccessTokenExpiresAt",
                table: "mercadopago_oauth_configurations",
                column: "AccessTokenExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_IsActive",
                table: "mercadopago_oauth_configurations",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_MercadoPagoUserId",
                table: "mercadopago_oauth_configurations",
                column: "MercadoPagoUserId");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_configurations_TenantId",
                table: "mercadopago_oauth_configurations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_ExpiresAt",
                table: "mercadopago_oauth_states",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_IsCompleted",
                table: "mercadopago_oauth_states",
                column: "IsCompleted");

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_State",
                table: "mercadopago_oauth_states",
                column: "State",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mercadopago_oauth_states_TenantId",
                table: "mercadopago_oauth_states",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_configurations_TenantId",
                table: "payment_configurations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_BookingId",
                table: "payment_transactions",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_CustomerId",
                table: "payment_transactions",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_TenantId",
                table: "payment_transactions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_BookingId",
                table: "payments",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_CustomerId",
                table: "payments",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_EmployeeId",
                table: "payments",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_ServiceId",
                table: "payments",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_Status",
                table: "payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_payments_TenantId",
                table: "payments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_plans_VerticalId",
                schema: "public",
                table: "plans",
                column: "VerticalId");

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
                name: "IX_Schedules_EmployeeId",
                table: "Schedules",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_service_categories_Name",
                table: "service_categories",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_service_categories_TenantId",
                table: "service_categories",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_services_CategoryId",
                table: "services",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_services_IsActive",
                table: "services",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_services_Name",
                table: "services",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_services_TenantId",
                table: "services",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPayments_SubscriptionId",
                table: "SubscriptionPayments",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPayments_TenantId",
                table: "SubscriptionPayments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_PlanId",
                table: "Subscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_TenantId",
                table: "Subscriptions",
                column: "TenantId");

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

            migrationBuilder.CreateIndex(
                name: "IX_tenants_CustomDomain",
                schema: "public",
                table: "tenants",
                column: "CustomDomain",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_PlanId",
                schema: "public",
                table: "tenants",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_tenants_SchemaName",
                schema: "public",
                table: "tenants",
                column: "SchemaName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_Subdomain_VerticalId",
                schema: "public",
                table: "tenants",
                columns: new[] { "Subdomain", "VerticalId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_VerticalId",
                schema: "public",
                table: "tenants",
                column: "VerticalId");

            migrationBuilder.CreateIndex(
                name: "IX_users_Email_TenantId",
                schema: "public",
                table: "users",
                columns: new[] { "Email", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_TenantId",
                schema: "public",
                table: "users",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_verticals_Code",
                schema: "public",
                table: "verticals",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_verticals_Domain",
                schema: "public",
                table: "verticals",
                column: "Domain",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "booking_status_history");

            migrationBuilder.DropTable(
                name: "DailyReports");

            migrationBuilder.DropTable(
                name: "end_user_payments");

            migrationBuilder.DropTable(
                name: "invitations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "mercadopago_configurations");

            migrationBuilder.DropTable(
                name: "mercadopago_oauth_configurations");

            migrationBuilder.DropTable(
                name: "mercadopago_oauth_states");

            migrationBuilder.DropTable(
                name: "payment_configurations");

            migrationBuilder.DropTable(
                name: "payment_transactions");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "platform_mercadopago_config",
                schema: "public");

            migrationBuilder.DropTable(
                name: "Schedules");

            migrationBuilder.DropTable(
                name: "SubscriptionPayments");

            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropTable(
                name: "tenant_subscription_payments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "users",
                schema: "public");

            migrationBuilder.DropTable(
                name: "memberships");

            migrationBuilder.DropTable(
                name: "bookings");

            migrationBuilder.DropTable(
                name: "Subscriptions");

            migrationBuilder.DropTable(
                name: "end_users");

            migrationBuilder.DropTable(
                name: "tenant_plans");

            migrationBuilder.DropTable(
                name: "Employees");

            migrationBuilder.DropTable(
                name: "customers");

            migrationBuilder.DropTable(
                name: "services");

            migrationBuilder.DropTable(
                name: "tenants",
                schema: "public");

            migrationBuilder.DropTable(
                name: "service_categories");

            migrationBuilder.DropTable(
                name: "plans",
                schema: "public");

            migrationBuilder.DropTable(
                name: "verticals",
                schema: "public");
        }
    }
}
