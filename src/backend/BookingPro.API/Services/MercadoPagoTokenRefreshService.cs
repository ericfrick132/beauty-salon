using BookingPro.API.Data;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class MercadoPagoTokenRefreshService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MercadoPagoTokenRefreshService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24); // Check daily

        public MercadoPagoTokenRefreshService(
            IServiceProvider serviceProvider,
            ILogger<MercadoPagoTokenRefreshService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RefreshExpiringTokens();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in MercadoPago token refresh service");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }
        }

        private async Task RefreshExpiringTokens()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var mercadoPagoService = scope.ServiceProvider.GetRequiredService<IMercadoPagoService>();

            // Get tokens that will expire in the next 30 days
            var expirationThreshold = DateTime.UtcNow.AddDays(30);
            
            var configurationsToRefresh = await context.MercadoPagoConfigurations
                .Where(c => c.IsActive && 
                           c.TokenExpiresAt != null && 
                           c.TokenExpiresAt < expirationThreshold)
                .ToListAsync();

            _logger.LogInformation($"Found {configurationsToRefresh.Count} MercadoPago configurations to refresh");

            foreach (var config in configurationsToRefresh)
            {
                try
                {
                    _logger.LogInformation($"Refreshing MercadoPago token for tenant {config.TenantId}");
                    
                    // Call the refresh method
                    var result = await mercadoPagoService.RefreshTokenAsync(config.TenantId.ToString());
                    
                    if (result.Success)
                    {
                        _logger.LogInformation($"Successfully refreshed token for tenant {config.TenantId}");
                    }
                    else
                    {
                        _logger.LogWarning($"Failed to refresh token for tenant {config.TenantId}: {result.Message}");
                        
                        // Send notification to tenant about token expiration
                        // You could implement email notification here
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error refreshing token for tenant {config.TenantId}");
                }
            }
        }
    }
}