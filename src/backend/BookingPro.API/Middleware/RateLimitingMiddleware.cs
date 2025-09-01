using System.Net;
using Microsoft.Extensions.Caching.Memory;

namespace BookingPro.API.Middleware
{
    public class RateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;
        private readonly ILogger<RateLimitingMiddleware> _logger;

        // Rate limiting configuration
        private readonly Dictionary<string, RateLimitRule> _rules = new()
        {
            { "/api/self-registration", new RateLimitRule { MaxAttempts = 3, WindowMinutes = 15 } },
            { "/api/invitation/accept", new RateLimitRule { MaxAttempts = 5, WindowMinutes = 10 } }
        };

        public RateLimitingMiddleware(
            RequestDelegate next, 
            IMemoryCache cache, 
            ILogger<RateLimitingMiddleware> logger)
        {
            _next = next;
            _cache = cache;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var endpoint = context.Request.Path.Value?.ToLowerInvariant();
            
            if (endpoint != null && _rules.ContainsKey(endpoint) && 
                context.Request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                var clientId = GetClientIdentifier(context);
                var rule = _rules[endpoint];
                
                if (await IsRateLimitedAsync(clientId, endpoint, rule))
                {
                    _logger.LogWarning("Rate limit exceeded for client {ClientId} on endpoint {Endpoint}", 
                        clientId, endpoint);
                        
                    context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                    context.Response.ContentType = "application/json";
                    
                    var response = new
                    {
                        success = false,
                        message = $"Demasiados intentos. Intenta nuevamente en {rule.WindowMinutes} minutos.",
                        retryAfter = rule.WindowMinutes * 60
                    };
                    
                    await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(response));
                    return;
                }
                
                await RecordAttemptAsync(clientId, endpoint, rule);
            }

            await _next(context);
        }

        private string GetClientIdentifier(HttpContext context)
        {
            // Try to get real IP from headers (for load balancers/proxies)
            var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwarded))
            {
                return forwarded.Split(',')[0].Trim();
            }

            var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(realIp))
            {
                return realIp;
            }

            // Fallback to connection remote IP
            return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }

        private async Task<bool> IsRateLimitedAsync(string clientId, string endpoint, RateLimitRule rule)
        {
            var key = $"rate_limit:{clientId}:{endpoint}";
            var attempts = _cache.Get<List<DateTime>>(key) ?? new List<DateTime>();
            
            // Remove old attempts outside the window
            var cutoff = DateTime.UtcNow.AddMinutes(-rule.WindowMinutes);
            attempts = attempts.Where(a => a > cutoff).ToList();
            
            return attempts.Count >= rule.MaxAttempts;
        }

        private async Task RecordAttemptAsync(string clientId, string endpoint, RateLimitRule rule)
        {
            var key = $"rate_limit:{clientId}:{endpoint}";
            var attempts = _cache.Get<List<DateTime>>(key) ?? new List<DateTime>();
            
            // Remove old attempts outside the window
            var cutoff = DateTime.UtcNow.AddMinutes(-rule.WindowMinutes);
            attempts = attempts.Where(a => a > cutoff).ToList();
            
            // Add current attempt
            attempts.Add(DateTime.UtcNow);
            
            // Store with expiration
            var expiration = TimeSpan.FromMinutes(rule.WindowMinutes);
            _cache.Set(key, attempts, expiration);
        }
    }

    public class RateLimitRule
    {
        public int MaxAttempts { get; set; }
        public int WindowMinutes { get; set; }
    }

    public static class RateLimitingMiddlewareExtensions
    {
        public static IApplicationBuilder UseRateLimiting(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<RateLimitingMiddleware>();
        }
    }
}