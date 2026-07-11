namespace BookingPro.API.Services
{
    /// <summary>
    /// Modelo AppManagedTransport: sales-hub (CRM/cerebro) COMPONE los mensajes; ESTA app los
    /// TRANSPORTA por su propia línea de plataforma — así la conversación nunca cambia de número.
    /// Cada tick baja los pendientes de /api/hub/outbound (ya paceados por línea en el hub),
    /// los manda por la Evolution de turnos-pro y ackea el resultado.
    ///
    /// Son respuestas conversacionales (soporte/venta en caliente), por eso NO esperan al gauge:
    /// se mandan al toque, pero registran el envío para que el follow-up le deje aire a la línea.
    /// Gate: SalesHub:RelayEnabled (default false). DryRun/allowlist: sección "OutboundRelay".
    /// </summary>
    public class OutboundRelayBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<OutboundRelayBackgroundService> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromSeconds(15);

        public OutboundRelayBackgroundService(
            IServiceProvider serviceProvider,
            IHttpClientFactory httpClientFactory,
            ILogger<OutboundRelayBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try { await RunTickAsync(stoppingToken); }
                catch (Exception ex) { _logger.LogError(ex, "OutboundRelay tick failed"); }

                try { await Task.Delay(Interval, stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private async Task RunTickAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            if (!config.GetValue("SalesHub:RelayEnabled", false)) return;

            var hub = scope.ServiceProvider.GetRequiredService<ISalesHubHubClient>();
            var msgs = await hub.GetOutboundAsync(ct);
            if (msgs.Count == 0) return;

            var sent = 0;
            foreach (var m in msgs)
            {
                if (ct.IsCancellationRequested) break;
                if (string.IsNullOrWhiteSpace(m.Phone) || string.IsNullOrWhiteSpace(m.Text))
                {
                    await hub.AckOutboundAsync(m.Id, false, "mensaje sin teléfono o texto", ct);
                    continue;
                }

                var result = await WhatsAppLine.SendAsync(_httpClientFactory, config, _logger, "OutboundRelay", m.Phone, m.Text, ct);
                switch (result)
                {
                    case WaSendResult.Sent:
                        await hub.AckOutboundAsync(m.Id, true, null, ct);
                        WhatsAppLine.RecordSend(config);
                        sent++;
                        break;
                    case WaSendResult.SkippedAllowlist:
                        await hub.AckOutboundAsync(m.Id, false, "fuera de TestPhoneAllowlist", ct);
                        break;
                    case WaSendResult.BadNumber:
                        await hub.AckOutboundAsync(m.Id, false, "número inválido", ct);
                        break;
                    default:
                        await hub.AckOutboundAsync(m.Id, false, "fallo transitorio de Evolution", ct);
                        break;
                }
            }
            if (sent > 0) _logger.LogInformation("OutboundRelay: {N} mensaje(s) transportados por la línea de turnos-pro", sent);
        }
    }
}
