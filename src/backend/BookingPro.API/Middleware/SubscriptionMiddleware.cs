using System;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using BookingPro.API.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Middleware
{
    public class SubscriptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SubscriptionMiddleware> _logger;

        // Paths that don't require subscription
        private readonly string[] _exemptPaths = new[]
        {
            "/api/auth",
            "/api/subscription",
            "/api/webhooks",
            "/api/tenant/config",
            "/api/super-admin",
            "/swagger",
            "/health"
        };

        public SubscriptionMiddleware(RequestDelegate next, ILogger<SubscriptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, ApplicationDbContext db)
        {
            try
            {
                // Skip for exempt paths
                var path = context.Request.Path.Value?.ToLower() ?? "";
                if (_exemptPaths.Any(exemptPath => path.StartsWith(exemptPath)))
                {
                    await _next(context);
                    return;
                }

                // Skip if not authenticated
                if (!context.User.Identity?.IsAuthenticated ?? true)
                {
                    await _next(context);
                    return;
                }

                // Get tenant ID from claims
                var tenantIdClaim = context.User.FindFirst("tenantId")?.Value ??
                                   context.User.FindFirst("tenant_id")?.Value;

                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    await _next(context);
                    return;
                }

                // Check subscription status
                var subscription = await db.Subscriptions
                    .Where(s => s.TenantId == tenantId)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (subscription == null)
                {
                    // No subscription found - check if within demo period
                    var tenant = await db.Tenants.FindAsync(tenantId);
                    
                    if (tenant == null)
                    {
                        await _next(context);
                        return;
                    }

                    // Check if demo/trial period expired
                    if (tenant.TrialEndsAt.HasValue && tenant.TrialEndsAt.Value < DateTime.UtcNow)
                    {
                        await ReturnSubscriptionRequired(context);
                        return;
                    }
                }
                else
                {
                    // Check subscription status
                    var isActive = subscription.Status == "active" ||
                                  (subscription.IsTrialPeriod && (
                                      (subscription.TrialEndsAt.HasValue && subscription.TrialEndsAt > DateTime.UtcNow) ||
                                      (!subscription.TrialEndsAt.HasValue && subscription.NextPaymentDate.HasValue && subscription.NextPaymentDate > DateTime.UtcNow)
                                  ));

                    if (!isActive)
                    {
                        // Check if it's a read-only operation (GET requests to certain endpoints)
                        if (context.Request.Method == "GET" && IsReadOnlyPath(path))
                        {
                            context.Items["SubscriptionReadOnly"] = true;
                        }
                        else
                        {
                            await ReturnSubscriptionRequired(context);
                            return;
                        }
                    }

                    // Add subscription info to context
                    context.Items["SubscriptionPlan"] = subscription.PlanType;
                    context.Items["SubscriptionStatus"] = subscription.Status;
                    context.Items["IsTrialPeriod"] = subscription.IsTrialPeriod;
                    
                    if (subscription.TrialEndsAt.HasValue)
                    {
                        var daysRemaining = (subscription.TrialEndsAt.Value - DateTime.UtcNow).TotalDays;
                        context.Items["TrialDaysRemaining"] = Math.Max(0, (int)daysRemaining);
                    }
                }

                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in subscription middleware");
                await _next(context); // Continue on error to avoid blocking the app
            }
        }

        private bool IsReadOnlyPath(string path)
        {
            // Allow reading certain data even with expired subscription
            var readOnlyPaths = new[]
            {
                "/api/tenant",
                "/api/customers",
                "/api/bookings",
                "/api/reports"
            };

            return readOnlyPaths.Any(p => path.StartsWith(p));
        }

        private async Task ReturnSubscriptionRequired(HttpContext context)
        {
            context.Response.StatusCode = 402; // Payment Required
            context.Response.ContentType = "application/json";

            var response = new
            {
                error = "Subscription Required",
                message = "Tu período de prueba ha expirado. Por favor, suscríbete para continuar usando Turnos Pro.",
                subscriptionUrl = "/subscription/plans",
                code = "SUBSCRIPTION_REQUIRED"
            };

            var json = JsonSerializer.Serialize(response);
            await context.Response.WriteAsync(json);
        }
    }

    // Extension method to register the middleware
    public static class SubscriptionMiddlewareExtensions
    {
        public static IApplicationBuilder UseSubscriptionVerification(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SubscriptionMiddleware>();
        }
    }
}
