using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using BookingPro.API.Data;
using BookingPro.API.Services;
using BookingPro.API.Utilities;
using BookingPro.API.Middleware;
using Serilog;

Console.WriteLine("=== INICIANDO APLICACIÓN BOOKINGPRO ===");
Console.WriteLine($"Puerto Environment Variable: {Environment.GetEnvironmentVariable("PORT")}");
Console.WriteLine($"Environment: {Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")}");

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("Application", "BookingPro")
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            // Permitir cualquier subdominio de localhost en puertos 3000 y 3001
            if (origin.Contains("localhost:3000") || origin.Contains("localhost:3001"))
                return true;

            // Permitir turnos-pro.com y cualquier subdominio HTTPS
            try
            {
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    var host = uri.Host;
                    if (host.Equals("turnos-pro.com", StringComparison.OrdinalIgnoreCase) ||
                        host.EndsWith(".turnos-pro.com", StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }
            catch { }

            // Permitir dominios específicos adicionales por lista blanca exacta
            var allowedOrigins = new[] {
                "https://turnos-pro.com",
                "https://www.turnos-pro.com"
            };

            if (allowedOrigins.Contains(origin))
                return true;

            // Permitir FrontendUrl configurado
            var frontendUrl = builder.Configuration["FrontendUrl"];
            if (!string.IsNullOrEmpty(frontendUrl) && origin == frontendUrl)
                return true;

            // Permitir orígenes adicionales configurados
            var additionalOrigins = builder.Configuration["AdditionalCorsOrigins"];
            if (!string.IsNullOrEmpty(additionalOrigins))
            {
                var origins = additionalOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (origins.Any(o => origin == o.Trim()))
                    return true;
            }

            return false;
        })
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// Configure JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"] ?? "your-secret-key-here-min-32-characters")),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

// Configure DbContext
var connectionString = ConfigurationHelper.GetConnectionString(builder.Configuration);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// Register Services
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITenantProvisioningService, TenantProvisioningService>();
builder.Services.AddScoped<ITenantProvider, TenantProvider>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IInvitationService, InvitationService>();

// Register Repositories
builder.Services.AddScoped(typeof(BookingPro.API.Repositories.IRepository<>), typeof(BookingPro.API.Repositories.GenericRepository<>));

// Register Business Services
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IBookingService, BookingPro.API.Services.BookingService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IBookingStatusService, BookingPro.API.Services.BookingStatusService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.ICustomerService, BookingPro.API.Services.CustomerService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IEmployeeService, BookingPro.API.Services.EmployeeService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IReportService, BookingPro.API.Services.ReportService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IPaymentService, BookingPro.API.Services.PaymentService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IPublicService, BookingPro.API.Services.PublicService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IMercadoPagoService, BookingPro.API.Services.MercadoPagoService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IMercadoPagoOAuthService, BookingPro.API.Services.MercadoPagoOAuthService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IWhatsAppService, BookingPro.API.Services.WhatsAppService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.ISubscriptionService, BookingPro.API.Services.SubscriptionService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IInventoryService, BookingPro.API.Services.InventoryService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();

// New B2B/B2C services
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IPlatformPaymentService, BookingPro.API.Services.PlatformPaymentService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IEndUserService, BookingPro.API.Services.EndUserService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.IEmailAutomationService, BookingPro.API.Services.EmailAutomationService>();
builder.Services.AddScoped<BookingPro.API.Services.Interfaces.ISuperAdminService, BookingPro.API.Services.SuperAdminService>();
builder.Services.AddScoped<BookingPro.API.Services.IPreapprovalService, BookingPro.API.Services.PreapprovalService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

// Add MercadoPago token refresh background service
builder.Services.AddHostedService<BookingPro.API.Services.MercadoPagoTokenRefreshService>();

// Configure Swagger with JWT support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "BookingPro API",
        Version = "v1",
        Description = "API for SaaS Multi-Tenant Booking Management Platform"
    });
   
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
   
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Apply migrations and seed data on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        context.Database.Migrate();
       
        if (app.Environment.IsDevelopment() || Environment.GetEnvironmentVariable("SEED_DATA") == "true")
        {
            await ApplicationDbContextSeed.SeedAsync(context);
            await SuperAdminSeeder.SeedSuperAdminAsync(context);
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database or seeding data.");
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("EnableSwaggerInProduction", false))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "BookingPro API v1");
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// Rate limiting middleware before tenant resolution
app.UseRateLimiting();

// Tenant resolution middleware debe ir antes de la autenticación
app.UseMiddleware<TenantResolutionMiddleware>();

app.UseAuthentication();
// Impersonation audit middleware after authentication
app.UseMiddleware<BookingPro.API.Middleware.ImpersonationAuditMiddleware>();
app.UseAuthorization();

// Add subscription verification middleware
app.UseMiddleware<BookingPro.API.Middleware.SubscriptionMiddleware>();

// Health check endpoints
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
app.MapGet("/ping", () => Results.Ok(new { status = "pong", timestamp = DateTime.UtcNow }));

app.MapControllers();

// Initialize subscription plans on startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var subscriptionService = scope.ServiceProvider.GetRequiredService<BookingPro.API.Services.Interfaces.ISubscriptionService>();
        var initResult = await subscriptionService.InitializePlansAsync();
        if (initResult.Success)
        {
            Console.WriteLine("Subscription plans initialized successfully");
        }
        else
        {
            Console.WriteLine($"Warning: Could not initialize subscription plans: {initResult.Message}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Warning: Error initializing subscription plans: {ex.Message}");
        // Don't fail startup if plans can't be initialized
    }
}

// Configure port for Digital Ocean (CRITICAL for deployment)
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
var url = $"http://0.0.0.0:{port}";
Console.WriteLine($"Aplicación escuchará en: {url}");

app.Run(url);
