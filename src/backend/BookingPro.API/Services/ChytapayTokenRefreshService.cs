using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Background service that refreshes Chytapay OAuth tokens before they
    /// expire. Mirrors MercadoPagoTokenRefreshService — runs once a day,
    /// refreshes any tokens that expire within 7 days.
    /// </summary>
    public class ChytapayTokenRefreshService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ChytapayTokenRefreshService> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

        public ChytapayTokenRefreshService(
            IServiceProvider serviceProvider,
            ILogger<ChytapayTokenRefreshService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ChytapayTokenRefreshService started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var oauthService = scope.ServiceProvider.GetRequiredService<IChytapayOAuthService>();

                    var result = await oauthService.RefreshExpiringTokensAsync();
                    if (!result.Success)
                    {
                        _logger.LogWarning("Chytapay token refresh job reported failure: {Message}", result.Message);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Chytapay token refresh background loop");
                }

                try
                {
                    await Task.Delay(Interval, stoppingToken);
                }
                catch (TaskCanceledException) { /* shutting down */ }
            }
        }
    }
}
