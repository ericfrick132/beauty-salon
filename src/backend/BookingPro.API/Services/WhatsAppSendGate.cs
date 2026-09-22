namespace BookingPro.API.Services
{
    /// <summary>De qué tipo es un envío por la línea del negocio. Decide cuánto freno se le aplica.</summary>
    public enum WaSendKind
    {
        /// <summary>
        /// Contestación a un mensaje que el cliente acaba de mandar (bot de confirmación,
        /// agente IA, menú). Pasa siempre: hacer esperar a alguien que está chateando es
        /// peor que no frenar, y una línea que RESPONDE es justo la que WhatsApp no castiga.
        /// Igual se registra: también cuenta contra el número.
        /// </summary>
        Reply,

        /// <summary>
        /// Lo iniciamos nosotros (recordatorio, pedido de confirmación, aviso al dueño).
        /// Va con hueco aleatorio, tope por hora y por día.
        /// </summary>
        Outbound
    }

    /// <summary>
    /// Freno de mano de la línea de WhatsApp del NEGOCIO (la instancia del tenant, la que
    /// le escribe a sus clientes). Hasta ahora sólo existía un gauge para la línea de
    /// plataforma (<see cref="WhatsAppLine"/>); el recordatorio y el bot de confirmación
    /// mandaban uno atrás del otro con 1,5 s fijos, por una instancia Baileys que no es la
    /// API oficial: exactamente el patrón por el que Meta bloquea el número.
    ///
    /// El presupuesto es POR TENANT porque el bloqueo también lo es: cada negocio tiene su
    /// propia instancia y su propio número.
    ///
    /// El estado es estático y por proceso; la app corre en un solo contenedor. Como un
    /// deploy lo pondría en cero, <see cref="WhatsAppConnectionService"/> lo siembra desde
    /// WhatsAppOutboundEvents la primera vez que un tenant manda algo.
    ///
    /// Config: WhatsAppThrottle:* (override por env con WhatsAppThrottle__Key).
    /// </summary>
    public static class WhatsAppSendGate
    {
        private sealed class TenantBudget
        {
            public DateTime NextAllowedAt;
            public readonly Queue<DateTime> Sends = new();
        }

        private static readonly object Lock = new();
        private static readonly Dictionary<Guid, TenantBudget> Budgets = new();
        private static readonly HashSet<Guid> Seeded = new();

        private static int Cfg(IConfiguration c, string key, int def) =>
            c.GetValue<int?>($"WhatsAppThrottle:{key}") ?? def;

        public static bool NeedsSeeding(Guid tenantId)
        {
            lock (Lock) return !Seeded.Contains(tenantId);
        }

        /// <summary>Carga los envíos de las últimas 24 h ya registrados. Una vez por tenant y por proceso.</summary>
        public static void Seed(Guid tenantId, IEnumerable<DateTime> recentSendsUtc)
        {
            lock (Lock)
            {
                if (!Seeded.Add(tenantId)) return;
                var b = BudgetFor(tenantId);
                var now = DateTime.UtcNow;
                foreach (var at in recentSendsUtc.Where(t => (now - t).TotalHours < 24).OrderBy(t => t))
                    b.Sends.Enqueue(at);
            }
        }

        /// <summary>
        /// Pide un turno. Devuelve false —con el motivo— si el tenant ya gastó su presupuesto;
        /// el caller NO manda y lo deja para el tick siguiente, así el trabajo se derrama a
        /// lo largo del día.
        ///
        /// Cuando el único impedimento es el hueco entre mensajes, espera ese rato (acotado
        /// por MaxWaitSeconds) en vez de rechazar. El turno se reserva adentro del lock antes
        /// de soltarlo: dos envíos en paralelo no se quedan con el mismo slot.
        ///
        /// Un <see cref="WaSendKind.Reply"/> nunca espera ni se rechaza: sólo registra.
        /// </summary>
        public static async Task<(bool allowed, string? reason)> TryAcquireAsync(
            Guid tenantId, WaSendKind kind, IConfiguration config, CancellationToken ct = default)
        {
            // Los topes salen del consenso público sobre clientes no oficiales (Meta no publica
            // umbrales para Baileys): hasta ~30 msg/h es zona segura, 30-60 alerta; arriba de
            // 200/día el número entra en riesgo. Se elige el piso de cada banda a propósito.
            var maxPerHour = Cfg(config, "MaxPerHour", 25);
            var maxPerDay = Cfg(config, "MaxPerDay", 150);
            var minGap = Cfg(config, "MinGapSeconds", 8);
            var maxGap = Cfg(config, "MaxGapSeconds", 20);
            var maxWait = Cfg(config, "MaxWaitSeconds", 60);

            TimeSpan wait;
            lock (Lock)
            {
                var now = DateTime.UtcNow;
                var b = BudgetFor(tenantId);
                while (b.Sends.Count > 0 && (now - b.Sends.Peek()).TotalHours >= 24) b.Sends.Dequeue();

                if (kind == WaSendKind.Reply)
                {
                    b.Sends.Enqueue(now);
                    return (true, null);
                }

                if (b.Sends.Count >= maxPerDay)
                    return (false, $"límite diario de la línea alcanzado ({maxPerDay} mensajes/24h)");

                var lastHour = b.Sends.Count(t => (now - t).TotalMinutes < 60);
                if (lastHour >= maxPerHour)
                    return (false, $"límite por hora de la línea alcanzado ({maxPerHour} mensajes/h)");

                wait = b.NextAllowedAt > now ? b.NextAllowedAt - now : TimeSpan.Zero;
                if (wait.TotalSeconds > maxWait)
                    return (false, "envíos demasiado seguidos");

                var sendAt = now + wait;
                b.Sends.Enqueue(sendAt);
                b.NextAllowedAt = sendAt.AddSeconds(Random.Shared.Next(minGap, Math.Max(minGap + 1, maxGap + 1)));
            }

            if (wait > TimeSpan.Zero) await Task.Delay(wait, ct);
            return (true, null);
        }

        /// <summary>Gasto de la última hora y de las últimas 24 h. Sólo diagnóstico.</summary>
        public static (int lastHour, int last24h) UsageFor(Guid tenantId)
        {
            lock (Lock)
            {
                if (!Budgets.TryGetValue(tenantId, out var b)) return (0, 0);
                var now = DateTime.UtcNow;
                while (b.Sends.Count > 0 && (now - b.Sends.Peek()).TotalHours >= 24) b.Sends.Dequeue();
                return (b.Sends.Count(t => (now - t).TotalMinutes < 60), b.Sends.Count);
            }
        }

        private static TenantBudget BudgetFor(Guid tenantId)
        {
            if (!Budgets.TryGetValue(tenantId, out var b))
            {
                b = new TenantBudget();
                Budgets[tenantId] = b;
            }
            return b;
        }
    }
}
