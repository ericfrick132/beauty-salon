using BookingPro.API.Services;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/webhooks")]
    public class WebhooksController : ControllerBase
    {
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IChytapayService _chytapayService;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<WebhooksController> _logger;
        private readonly IWhatsAppConnectionService _whatsAppConnectionService;
        private readonly IFeatureAddonService _featureAddonService;
        private readonly BookingPro.API.Services.IWhatsAppAgentService _whatsAppAgentService;
        private readonly BookingPro.API.Services.ISalesHubHubClient _salesHubClient;

        public WebhooksController(
            IMercadoPagoService mercadoPagoService,
            ISubscriptionService subscriptionService,
            IChytapayService chytapayService,
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<WebhooksController> logger,
            IWhatsAppConnectionService whatsAppConnectionService,
            IFeatureAddonService featureAddonService,
            BookingPro.API.Services.IWhatsAppAgentService whatsAppAgentService,
            BookingPro.API.Services.ISalesHubHubClient salesHubClient)
        {
            _mercadoPagoService = mercadoPagoService;
            _subscriptionService = subscriptionService;
            _chytapayService = chytapayService;
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _whatsAppConnectionService = whatsAppConnectionService;
            _featureAddonService = featureAddonService;
            _whatsAppAgentService = whatsAppAgentService;
            _salesHubClient = salesHubClient;
        }

        [HttpPost("mercadopago/{tenantId}")]
        public async Task<IActionResult> MercadoPagoWebhook(string tenantId)
        {
            try
            {
                // Read the raw body for logging
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                _logger.LogInformation("Received MercadoPago webhook for tenant {TenantId}: {Body}", tenantId, body);

                // Parse the JSON body
                var data = JsonSerializer.Deserialize<Dictionary<string, object>>(body);
                if (data == null)
                {
                    _logger.LogWarning("Failed to parse webhook body");
                    return BadRequest();
                }

                // Route based on notification type. Subscription events (type "subscription_preapproval"
                // or payments with "SUB-" external_reference) go to the subscription handler;
                // booking payments go to the MercadoPago service handler. Both handlers are idempotent
                // and safely ignore notifications they do not own.
                var subResult = await _subscriptionService.ProcessSubscriptionWebhookAsync(data);
                if (!subResult.Success)
                {
                    _logger.LogWarning("Subscription webhook handler reported: {Error}", subResult.Message);
                }

                var result = await _mercadoPagoService.ProcessWebhookNotificationAsync(tenantId, data);
                if (!result.Success)
                {
                    _logger.LogWarning("Booking webhook handler reported: {Error}", result.Message);
                }

                // Always return 200 to MercadoPago to avoid aggressive retry storms.
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MercadoPago webhook for tenant {TenantId}", tenantId);
                return Ok(); // Return 200 even on error — retries would compound the problem.
            }
        }

        /// <summary>
        /// Chytapay webhook — fires when a payment_request transitions to
        /// PAID / PARTIAL_PAID. The URL is configured once at the Chytapay
        /// integration-admin level (no tenantId in the path), so we identify
        /// the transaction by the GUID referenceId we set when creating the
        /// payment_request.
        /// </summary>
        [HttpPost("chytapay")]
        public async Task<IActionResult> ChytapayWebhook()
        {
            try
            {
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                _logger.LogInformation("Received Chytapay webhook: {Body}", body);

                // Optional validation-token check (configured in Chytapay
                // integration-admin "client/url" with the same value we put
                // here). Per docs, the header name is "validation-token".
                var expected = _configuration["Chytapay:ValidationToken"];
                if (!string.IsNullOrEmpty(expected))
                {
                    var got = Request.Headers["validation-token"].ToString();
                    if (!string.Equals(got, expected, StringComparison.Ordinal))
                    {
                        _logger.LogWarning("Chytapay webhook rejected: validation-token mismatch");
                        return Unauthorized();
                    }
                }

                var payload = JsonSerializer.Deserialize<ChytapayWebhookPayloadDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (payload == null)
                {
                    _logger.LogWarning("Failed to parse Chytapay webhook body");
                    return Ok(); // 200 to suppress retries — body is unrecoverable.
                }

                var result = await _chytapayService.ProcessWebhookAsync(payload);
                if (!result.Success)
                {
                    _logger.LogWarning("Chytapay webhook processing reported: {Error}", result.Message);
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Chytapay webhook");
                return Ok();
            }
        }

        /// <summary>
        /// Evolution API webhook for WhatsApp connection status changes and message events.
        /// Called by Evolution API when instance state changes or messages are received/delivered.
        /// </summary>
        [HttpPost("evolution")]
        public async Task<IActionResult> EvolutionWebhook()
        {
            try
            {
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();

                _logger.LogInformation("Evolution API webhook: {Body}", body);

                var json = JsonSerializer.Deserialize<JsonElement>(body);

                var eventType = json.TryGetProperty("event", out var ev) ? ev.GetString() : null;
                var instanceName = "";
                if (json.TryGetProperty("instance", out var inst))
                {
                    instanceName = inst.GetString() ?? "";
                }

                if (string.IsNullOrEmpty(instanceName) || string.IsNullOrEmpty(eventType))
                {
                    return Ok();
                }

                switch (eventType)
                {
                    case "connection.update":
                        await HandleConnectionUpdate(instanceName, json);
                        break;

                    case "messages.update":
                        await HandleMessageStatusUpdate(instanceName, json);
                        break;

                    case "messages.upsert":
                        await HandleInboundMessage(instanceName, json);
                        break;
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Evolution API webhook");
                return Ok(); // Always return 200 to avoid retries
            }
        }

        private async Task HandleConnectionUpdate(string instanceName, JsonElement json)
        {
            var state = "close";
            if (json.TryGetProperty("data", out var data))
            {
                if (data.TryGetProperty("state", out var s))
                    state = s.GetString() ?? "close";
            }

            var connection = await _context.TenantWhatsAppConnections
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.InstanceName == instanceName);

            if (connection == null) return;

            connection.Status = state;
            connection.UpdatedAt = DateTime.UtcNow;

            if (state == "open")
            {
                connection.ConnectedAt ??= DateTime.UtcNow;
            }
            else if (state == "close")
            {
                connection.DisconnectedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("WhatsApp connection {Instance} status updated to {State}", instanceName, state);
        }

        private async Task HandleMessageStatusUpdate(string instanceName, JsonElement json)
        {
            if (!json.TryGetProperty("data", out var data)) return;

            string? messageId = null;
            string? status = null;

            if (data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray())
                {
                    messageId = item.TryGetProperty("key", out var key) && key.TryGetProperty("id", out var id)
                        ? id.GetString() : null;
                    status = item.TryGetProperty("update", out var upd) && upd.TryGetProperty("status", out var st)
                        ? st.GetString() : null;

                    if (messageId != null && status != null)
                        await UpdateMessageLogStatus(messageId, status);
                }
            }
            else
            {
                messageId = data.TryGetProperty("key", out var key) && key.TryGetProperty("id", out var id)
                    ? id.GetString() : null;
                status = data.TryGetProperty("update", out var upd) && upd.TryGetProperty("status", out var st)
                    ? st.GetString() : null;

                if (messageId != null && status != null)
                    await UpdateMessageLogStatus(messageId, status);
            }
        }

        // Bot de confirmación de turnos: procesa la respuesta del cliente
        // (1/sí = confirmar, 2/no = cancelar) al pedido enviado por BookingConfirmationBotService.
        private async Task HandleInboundMessage(string instanceName, JsonElement json)
        {
            if (!json.TryGetProperty("data", out var data)) return;

            if (data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray())
                {
                    await ProcessInboundMessage(instanceName, item);
                }
            }
            else
            {
                await ProcessInboundMessage(instanceName, data);
            }
        }

        // Relay al cerebro de sales-hub de un inbound de la línea de PLATAFORMA, sólo si el
        // teléfono corresponde a alguien que estamos siguiendo (OTP abandonado u onboarding).
        // Gate: SalesHub:RelayEnabled (default false). El hub igual descarta lo que no matchea
        // un lead; este filtro es defensa contra ruido, no correctness.
        private async Task RelayPlatformInboundAsync(string remoteJid, string text, JsonElement key, JsonElement item)
        {
            if (!_configuration.GetValue("SalesHub:RelayEnabled", false)) return;

            var phone = remoteJid.Split('@')[0];
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.Length < 8) return;
            var suffix = digits[^Math.Min(10, digits.Length)..];

            // Click-to-WhatsApp: el primer mensaje trae contextInfo.externalAdReply con el id del
            // anuncio (sourceId) y el ctwaClid. Con referral se relaya SIEMPRE: sales-hub es quien
            // guarda la atribución del lead y la devuelve al bot-register / enricher del tenant.
            var ad = ExtractAdReferral(item);

            var followed = await _context.PhoneVerifications
                .AnyAsync(p => p.FollowupCount > 0 && p.Phone.Replace(" ", "").Replace("-", "").Replace("+", "").EndsWith(suffix))
                || await _context.Tenants
                .AnyAsync(t => t.OnboardingFollowupCount > 0 && t.OwnerPhone != null
                            && t.OwnerPhone.Replace(" ", "").Replace("-", "").Replace("+", "").EndsWith(suffix));
            if (!followed && ad == null)
            {
                _logger.LogInformation("Inbound de línea plataforma sin seguimiento activo ({Phone}) — no se relaya", digits);
                return;
            }

            var providerMessageId = key.TryGetProperty("id", out var mid) ? mid.GetString() : null;
            long? timestampUnix = item.TryGetProperty("messageTimestamp", out var ts) && ts.ValueKind == JsonValueKind.Number
                ? ts.GetInt64() : null;

            await _salesHubClient.ForwardInboundAsync(phone, text, providerMessageId, timestampUnix, ad);
            _logger.LogInformation("Inbound de línea plataforma relayado al hub ({Phone}) ad={AdId}", digits, ad?.AdId ?? "-");
        }

        /// <summary>
        /// Baileys/Evolution reenvían tal cual el <c>contextInfo.externalAdReply</c> del mensaje con
        /// el que un lead abre un click-to-WhatsApp: sourceId (id del anuncio), title/body, sourceUrl
        /// y ctwaClid. Puede venir en extendedTextMessage, imageMessage, videoMessage, etc.
        /// </summary>
        internal static HubAdReferral? ExtractAdReferral(JsonElement item)
        {
            if (!item.TryGetProperty("message", out var msg) || msg.ValueKind != JsonValueKind.Object)
                return null;

            foreach (var prop in msg.EnumerateObject())
            {
                var m = prop.Value;
                if (m.ValueKind != JsonValueKind.Object) continue;
                // ephemeralMessage/viewOnceMessage envuelven el mensaje real en .message
                if (m.TryGetProperty("message", out var inner) && inner.ValueKind == JsonValueKind.Object)
                {
                    var nested = ExtractAdReferral(m);
                    if (nested != null) return nested;
                }
                if (!m.TryGetProperty("contextInfo", out var ctx) || ctx.ValueKind != JsonValueKind.Object) continue;
                if (!ctx.TryGetProperty("externalAdReply", out var ad) || ad.ValueKind != JsonValueKind.Object) continue;

                string? Get(string name) => ad.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
                var sourceId = Get("sourceId");
                var ctwa = Get("ctwaClid");
                if (sourceId == null && ctwa == null) continue;
                return new HubAdReferral(sourceId, Get("title"), Get("body"), Get("sourceUrl"), ctwa);
            }
            return null;
        }

        private async Task ProcessInboundMessage(string instanceName, JsonElement item)
        {
            if (!item.TryGetProperty("key", out var key) || key.ValueKind != JsonValueKind.Object) return;

            var fromMe = key.TryGetProperty("fromMe", out var fm) && fm.ValueKind == JsonValueKind.True;
            var remoteJid = key.TryGetProperty("remoteJid", out var jid) ? jid.GetString() ?? "" : "";
            if (string.IsNullOrEmpty(remoteJid) || remoteJid.Contains("@g.us")) return; // ignorar grupos

            var text = ExtractMessageText(item)?.Trim();

            // LÍNEA DE PLATAFORMA (la que manda OTPs y follow-ups al DUEÑO del negocio): si el
            // que escribe es un lead/tenant que estamos siguiendo, la respuesta va al cerebro
            // central de sales-hub (relay). No es la línea de ningún negocio: sin registro de actividad.
            var platformInstance = _configuration["EVOLUTION_API_INSTANCE"];
            if (!string.IsNullOrEmpty(platformInstance) && instanceName == platformInstance)
            {
                if (!fromMe && !string.IsNullOrWhiteSpace(text))
                    await RelayPlatformInboundAsync(remoteJid, text, key, item);
                return;
            }

            // Sólo chats individuales: estados, canales y grupos no se atienden ni se registran.
            var sender = WhatsAppSender.Resolve(key, item);
            if (sender == null) return;

            var connection = await _context.TenantWhatsAppConnections
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.InstanceName == instanceName);

            // Mensajes salientes del celular del negocio (las respuestas del propio bot, lo que el dueño
            // escribe a mano): no se atienden ni se registran, salvo el "mensaje a vos mismo", que es
            // como muchos prueban el asistente y hay que explicarles por qué no contesta.
            if (fromMe && !await IsSelfChatAsync(sender, connection)) return;

            var pushName = item.TryGetProperty("pushName", out var pnEl) && pnEl.ValueKind == JsonValueKind.String ? pnEl.GetString() : null;
            var ev = new WhatsAppInboundEvent
            {
                InstanceName = Clip(instanceName, 100)!,
                TenantId = connection?.TenantId,
                RemoteJid = Clip(remoteJid, 100),
                Phone = Clip(sender, 100),
                ContactName = Clip(pushName, 100),
                FromMe = fromMe,
                MessageType = Clip(MessageTypeOf(item), 60),
                Status = "queued",
            };
            _context.WhatsAppInboundEvents.Add(ev);
            await _context.SaveChangesAsync();

            InboundHandleResult result;
            try
            {
                if (fromMe)
                    result = InboundHandleResult.Ignored("from_me", "Mensaje enviado desde el mismo WhatsApp conectado (probá desde otro celular)");
                else if (connection == null)
                    result = InboundHandleResult.Ignored("no_tenant", "La instancia no está asociada a ningún negocio");
                else
                    result = await RouteInboundAsync(connection.TenantId, sender, remoteJid, pushName, text, item);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error atendiendo el mensaje entrante de WhatsApp {EventId} (instancia {Instance})", ev.Id, instanceName);
                result = InboundHandleResult.Failed("error", ex.GetBaseException().Message);
            }

            await RecordInboundResultAsync(ev.Id, result);
            await PurgeOldInboundEventsAsync();
        }

        /// <summary>
        /// Enruta un mensaje de la línea de un negocio: comprobante → detección de transferencias;
        /// respuesta a una confirmación pendiente → bot de confirmación; el resto → asistente por
        /// menú o agente IA. Devuelve qué pasó, para el registro de actividad.
        /// </summary>
        private async Task<InboundHandleResult> RouteInboundAsync(Guid tenantId, string sender, string remoteJid, string? pushName, string? text, JsonElement item)
        {
            if (WhatsAppSender.IsLid(sender))
                return InboundHandleResult.Ignored("lid", "WhatsApp ocultó el número del remitente (chat con Linked ID): no se puede responder por número");
            var senderDigits = sender;

            if (string.IsNullOrWhiteSpace(text))
            {
                // Una imagen o un PDF de un cliente es, casi siempre, el comprobante de la seña. Con el
                // add-on de detección de transferencias activo no se ignora: se contesta y se cruza
                // con Mercado Pago (no se lee la imagen; la identidad la da el teléfono que la mandó).
                if (IsReceiptMessage(item))
                {
                    return await TryRegisterReceiptAsync(tenantId, senderDigits, pushName)
                        ? new InboundHandleResult("replied", "receipt", "Comprobante recibido: se verifica contra Mercado Pago")
                        : InboundHandleResult.Ignored("no_text", "Imagen o archivo recibido, pero la detección de transferencias no está activa");
                }
                return InboundHandleResult.Ignored("no_text", $"Sólo se atienden mensajes de texto ({MessageTypeOf(item) ?? "sin contenido"})");
            }

            var settings = await _context.TenantMessagingSettings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            var hasAiAgent = await _featureAddonService.HasActiveAddonAsync(tenantId, BookingPro.API.Models.Constants.FeatureCodes.AiAgent);
            // Asistente por menú (add-on menu_bot): atiende todo lo que no sea una respuesta a un
            // pedido de confirmación pendiente. No usa IA, así que no depende de créditos ni de una API key.
            var menuBot = HttpContext.RequestServices.GetRequiredService<BookingPro.API.Services.Interfaces.IWhatsAppMenuBotService>();
            var hasMenuBotAddon = await _featureAddonService.HasActiveAddonAsync(tenantId, BookingPro.API.Models.Constants.FeatureCodes.MenuBot);
            var hasMenuBot = hasMenuBotAddon && await menuBot.IsActiveAsync(tenantId);
            var confirmationEnabled = settings != null && settings.ConfirmationBotEnabled
                && await _featureAddonService.HasActiveAddonAsync(tenantId, BookingPro.API.Models.Constants.FeatureCodes.ConfirmationBot);

            if (!hasAiAgent && !confirmationEnabled && !hasMenuBot)
                return hasMenuBotAddon
                    ? InboundHandleResult.Ignored("disabled", "El asistente está apagado en Asistente de WhatsApp")
                    : InboundHandleResult.Ignored("no_plan", "El negocio no tiene contratado el asistente de WhatsApp ni el agente IA");

            // Sin bot de confirmación: atiende el asistente por menú (o el agente IA, si lo tiene).
            if (!confirmationEnabled)
                return await DispatchAssistantAsync(tenantId, senderDigits, remoteJid, pushName, text, menuBot, hasMenuBot, hasMenuBotAddon, hasAiAgent);

            // Matchear el remitente con un pedido de confirmación pendiente (sufijo de 8 dígitos
            // para tolerar variantes de prefijo AR: 549..., 54..., 0..., 15...)
            var senderSuffix = senderDigits[^8..];

            var pendingRequests = await _context.BookingConfirmationRequests
                .IgnoreQueryFilters()
                .Where(r => r.TenantId == tenantId && r.Status == "sent")
                .OrderByDescending(r => r.SentAt)
                .Take(100)
                .ToListAsync();

            var request = pendingRequests.FirstOrDefault(r =>
                r.Phone.Length >= 8 && r.Phone.EndsWith(senderSuffix));
            if (request == null)
            {
                // No es respuesta a una confirmación pendiente → lo atiende el asistente por menú
                // (o el agente IA, si es lo único que tiene contratado).
                return await DispatchAssistantAsync(tenantId, senderDigits, remoteJid, pushName, text, menuBot, hasMenuBot, hasMenuBotAddon, hasAiAgent);
            }

            var booking = await _context.Bookings
                .IgnoreQueryFilters()
                .Include(b => b.Customer)
                .Include(b => b.Service)
                .FirstOrDefaultAsync(b => b.Id == request.BookingId && b.TenantId == tenantId);
            if (booking == null) return InboundHandleResult.Ignored("confirmation_missing", "El turno del pedido de confirmación ya no existe");

            if (booking.StartTime <= DateTime.UtcNow)
            {
                request.Status = "expired";
                request.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return InboundHandleResult.Ignored("confirmation_expired", "El turno ya pasó: el pedido de confirmación venció");
            }

            var intent = ParseConfirmationIntent(text);
            if (intent == null)
            {
                // Respuesta no reconocida: forzar la respuesta re-preguntando,
                // con tope de reintentos para no loopear si el cliente se pone a chatear
                const int maxReprompts = 2;
                if (request.RepromptCount >= maxReprompts) return InboundHandleResult.Ignored("confirmation_reprompt_limit", "No se entendió la respuesta y ya se repreguntó dos veces");

                request.RepromptCount++;
                request.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var repromptTime = booking.StartTime.ToLocalTime();
                var reprompt = $"No te entendí 🙂 Sobre tu turno del {repromptTime:dd/MM} a las {repromptTime:HH:mm}: " +
                    "respondé solo *1* para confirmarlo ✅ o *2* para cancelarlo ❌";
                try
                {
                    var repromptResult = await _whatsAppConnectionService.SendTextAsync(tenantId, senderDigits, reprompt);
                    _context.MessageLogs.Add(new MessageLog
                    {
                        TenantId = tenantId,
                        BookingId = booking.Id,
                        CustomerId = booking.CustomerId,
                        Channel = "whatsapp",
                        MessageType = "confirmation_reprompt",
                        Status = repromptResult.Success ? "sent" : "failed",
                        To = senderDigits,
                        Body = reprompt,
                        SentAt = repromptResult.Success ? DateTime.UtcNow : null,
                        ProviderMessageId = repromptResult.Data,
                        ErrorMessage = repromptResult.Success ? null : repromptResult.Message
                    });
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send confirmation reprompt to {Phone}", senderDigits);
                    return InboundHandleResult.Failed("send_failed", ex.Message);
                }
                return InboundHandleResult.Replied(reprompt, "confirmation");
            }

            var now = DateTime.UtcNow;
            var timeLocal = booking.StartTime.ToLocalTime();
            var firstName = booking.Customer?.FirstName ?? "";
            string ack;

            if (intent == "confirm")
            {
                if (booking.Status == "pending")
                {
                    _context.BookingStatusHistory.Add(new BookingStatusHistory
                    {
                        TenantId = tenantId,
                        BookingId = booking.Id,
                        FromStatus = booking.Status,
                        ToStatus = "confirmed",
                        Reason = "Confirmado por el cliente vía WhatsApp",
                        ChangedAt = now,
                        ChangedBy = "confirmation-bot"
                    });
                    booking.Status = "confirmed";
                    booking.UpdatedAt = now;
                }

                request.Status = "confirmed";
                ack = $"¡Gracias {firstName}! Tu turno del {timeLocal:dd/MM} a las {timeLocal:HH:mm} quedó confirmado. Te esperamos 😊";
            }
            else
            {
                if (booking.Status != "cancelled")
                {
                    _context.BookingStatusHistory.Add(new BookingStatusHistory
                    {
                        TenantId = tenantId,
                        BookingId = booking.Id,
                        FromStatus = booking.Status,
                        ToStatus = "cancelled",
                        Reason = "Cancelado por el cliente vía WhatsApp",
                        ChangedAt = now,
                        ChangedBy = "confirmation-bot"
                    });
                    booking.Status = "cancelled";
                    booking.CancelledAt = now;
                    booking.CancellationReason = "Cancelado por el cliente vía el bot de WhatsApp";
                    booking.UpdatedAt = now;
                }

                request.Status = "cancelled";
                ack = $"Listo {firstName}, tu turno del {timeLocal:dd/MM} a las {timeLocal:HH:mm} fue cancelado. ¡Podés reservar de nuevo cuando quieras!";
            }

            request.RespondedAt = now;
            request.ResponseText = text.Length > 500 ? text[..500] : text;
            request.UpdatedAt = now;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Confirmation bot: booking {BookingId} -> {Intent} (tenant {TenantId})",
                booking.Id, intent, tenantId);

            // Ack al cliente: no descuenta créditos del wallet
            try
            {
                var sendResult = await _whatsAppConnectionService.SendTextAsync(tenantId, senderDigits, ack);
                _context.MessageLogs.Add(new MessageLog
                {
                    TenantId = tenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Channel = "whatsapp",
                    MessageType = "confirmation_reply",
                    Status = sendResult.Success ? "sent" : "failed",
                    To = senderDigits,
                    Body = ack,
                    SentAt = sendResult.Success ? DateTime.UtcNow : null,
                    ProviderMessageId = sendResult.Data,
                    ErrorMessage = sendResult.Success ? null : sendResult.Message
                });
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send confirmation ack to {Phone}", senderDigits);
                return InboundHandleResult.Failed("send_failed", ex.Message);
            }
            return InboundHandleResult.Replied(ack, "confirmation");
        }


        /// <summary>Asistente por menú si está contratado y prendido; si no, agente IA; si no, se explica por qué no.</summary>
        private async Task<InboundHandleResult> DispatchAssistantAsync(Guid tenantId, string senderDigits, string remoteJid, string? pushName, string text,
            BookingPro.API.Services.Interfaces.IWhatsAppMenuBotService menuBot, bool hasMenuBot, bool hasMenuBotAddon, bool hasAiAgent)
        {
            if (hasMenuBot) return await menuBot.HandleIncomingDetailedAsync(tenantId, senderDigits, pushName, text);
            if (hasAiAgent) return await HandleAiAgentMessageAsync(tenantId, remoteJid, text);
            return hasMenuBotAddon
                ? InboundHandleResult.Ignored("disabled", "El asistente está apagado en Asistente de WhatsApp")
                : InboundHandleResult.Ignored("no_plan", "Sólo está activo el bot de confirmación y este mensaje no responde a un pedido pendiente");
        }

        /// <summary>Chat con el propio número del negocio (el conectado o el del dueño).</summary>
        private async Task<bool> IsSelfChatAsync(string sender, TenantWhatsAppConnection? connection)
        {
            if (connection == null || WhatsAppSender.IsLid(sender)) return false;
            var suffix = WhatsAppSender.Suffix(sender);
            if (suffix.Length < 8) return false;
            if (WhatsAppSender.Suffix(connection.ConnectedPhone) == suffix) return true;
            var ownerPhone = await _context.Tenants.IgnoreQueryFilters()
                .Where(t => t.Id == connection.TenantId)
                .Select(t => t.OwnerPhone)
                .FirstOrDefaultAsync();
            return !string.IsNullOrEmpty(ownerPhone) && WhatsAppSender.Suffix(ownerPhone) == suffix;
        }

        private async Task RecordInboundResultAsync(long eventId, InboundHandleResult result)
        {
            try
            {
                var detail = result.Detail is { Length: > 1000 } d ? d[..1000] : result.Detail;
                await _context.WhatsAppInboundEvents
                    .Where(e => e.Id == eventId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(e => e.Status, result.Status)
                        .SetProperty(e => e.Reason, result.Reason)
                        .SetProperty(e => e.Detail, detail)
                        .SetProperty(e => e.ProcessedAt, DateTime.UtcNow));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo registrar el resultado del mensaje de WhatsApp {EventId}", eventId);
            }
        }

        private static DateTime _lastInboundPurgeUtc = DateTime.MinValue;

        /// <summary>Borra el registro de mensajes de más de 14 días, a lo sumo una vez por hora.</summary>
        private async Task PurgeOldInboundEventsAsync()
        {
            if (DateTime.UtcNow - _lastInboundPurgeUtc < TimeSpan.FromHours(1)) return;
            _lastInboundPurgeUtc = DateTime.UtcNow;
            try
            {
                var cutoff = DateTime.UtcNow.AddDays(-14);
                await _context.WhatsAppInboundEvents.Where(e => e.ReceivedAt < cutoff).ExecuteDeleteAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo purgar el registro de mensajes de WhatsApp");
            }
        }

        private static string? Clip(string? value, int max) =>
            value == null ? null : value.Length <= max ? value : value[..max];

        /// <summary>Primer tipo de contenido del mensaje (conversation, audioMessage...).</summary>
        private static string? MessageTypeOf(JsonElement item)
        {
            if (!item.TryGetProperty("message", out var message) || message.ValueKind != JsonValueKind.Object)
                return item.TryGetProperty("messageType", out var mt) && mt.ValueKind == JsonValueKind.String ? mt.GetString() : null;
            foreach (var prop in message.EnumerateObject())
            {
                if (prop.Name is "messageContextInfo") continue;
                return prop.Name;
            }
            return null;
        }

        // Agente IA (add-on ai_agent): delega el turno del cliente al asistente conversacional,
        // que responde servicios/precios/disponibilidad y crea reservas reales. Envía la respuesta
        // por WhatsApp y la registra en MessageLogs.
        private async Task<InboundHandleResult> HandleAiAgentMessageAsync(Guid tenantId, string remoteJid, string text)
        {
            if (!_whatsAppAgentService.IsEnabled)
                return InboundHandleResult.Ignored("no_ai_key", "El agente IA no está configurado en el servidor");

            var senderDigits = new string(remoteJid.Split('@')[0].Where(char.IsDigit).ToArray());
            if (senderDigits.Length < 8)
                return InboundHandleResult.Ignored("lid", "WhatsApp ocultó el número del remitente: no se puede responder por número");

            string? reply;
            try
            {
                reply = await _whatsAppAgentService.HandleMessageAsync(tenantId, senderDigits, text);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI agent failed to handle message for tenant {TenantId}", tenantId);
                return InboundHandleResult.Failed("ai_error", ex.GetBaseException().Message);
            }
            if (string.IsNullOrWhiteSpace(reply))
                return InboundHandleResult.Ignored("no_reply", "El agente IA no tenía respuesta para este mensaje");

            try
            {
                var sendResult = await _whatsAppConnectionService.SendTextAsync(tenantId, senderDigits, reply);
                _context.MessageLogs.Add(new MessageLog
                {
                    TenantId = tenantId,
                    Channel = "whatsapp",
                    MessageType = "ai_agent_reply",
                    Status = sendResult.Success ? "sent" : "failed",
                    To = senderDigits,
                    Body = reply,
                    SentAt = sendResult.Success ? DateTime.UtcNow : null,
                    ProviderMessageId = sendResult.Data,
                    ErrorMessage = sendResult.Success ? null : sendResult.Message
                });
                await _context.SaveChangesAsync();
                return sendResult.Success
                    ? InboundHandleResult.Replied(reply, "ai_agent")
                    : InboundHandleResult.Failed("send_failed", sendResult.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send AI agent reply to {Phone}", senderDigits);
                return InboundHandleResult.Failed("send_failed", ex.Message);
            }
        }

        private static bool IsReceiptMessage(JsonElement item)
        {
            if (!item.TryGetProperty("message", out var message) || message.ValueKind != JsonValueKind.Object) return false;
            foreach (var prop in message.EnumerateObject())
            {
                var name = prop.Name;
                if (name.Contains("image", StringComparison.OrdinalIgnoreCase) || name.Contains("document", StringComparison.OrdinalIgnoreCase)) return true;
                if (name is "ephemeralMessage" or "viewOnceMessage" && prop.Value.ValueKind == JsonValueKind.Object && IsReceiptMessage(prop.Value)) return true;
            }
            return false;
        }

        /// <summary>Con el add-on de detección de transferencias activo, registra el comprobante. true si se atendió.</summary>
        private async Task<bool> TryRegisterReceiptAsync(Guid tenantId, string senderDigits, string? pushName)
        {
            var detection = HttpContext.RequestServices.GetRequiredService<BookingPro.API.Services.Interfaces.ITransferDetectionService>();
            if (!await detection.IsActiveAsync(tenantId)) return false;
            if (senderDigits.Length < 8) return false;
            await detection.RegisterReceiptAsync(tenantId, senderDigits, pushName);
            return true;
        }

        private static string? ExtractMessageText(JsonElement item)
        {
            if (!item.TryGetProperty("message", out var message)) return null;

            if (message.TryGetProperty("conversation", out var conv))
                return conv.GetString();

            if (message.TryGetProperty("extendedTextMessage", out var ext) &&
                ext.TryGetProperty("text", out var extText))
                return extText.GetString();

            // Mensajes efímeros envuelven el contenido real
            if (message.TryGetProperty("ephemeralMessage", out var eph) &&
                eph.TryGetProperty("message", out var ephMsg))
            {
                if (ephMsg.TryGetProperty("conversation", out var ephConv))
                    return ephConv.GetString();
                if (ephMsg.TryGetProperty("extendedTextMessage", out var ephExt) &&
                    ephExt.TryGetProperty("text", out var ephText))
                    return ephText.GetString();
            }

            return null;
        }

        // Interpreta la respuesta del cliente al bot de confirmación.
        // Reglas (sin IA, matcheo determinístico):
        //  - Se normaliza: minúsculas, sin acentos, sin signos al final.
        //  - CANCELAR se evalúa PRIMERO, para que frases como "no puedo confirmar"
        //    cancelen en vez de confirmar.
        //  - Devuelve "confirm", "cancel" o null (no entendido → se re-pregunta).
        private static string? ParseConfirmationIntent(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;

            var normalized = text.Trim().ToLowerInvariant()
                .Replace("í", "i").Replace("é", "e").Replace("á", "a").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u")
                .TrimEnd('.', '!', '?', ',', ' ');

            // 1) CANCELAR — número 2, negaciones y frases de "no puedo / reprogramar"
            string[] cancelExact = { "2", "no", "nop", "nope", "cancelar", "cancelo", "cancela" };
            string[] cancelContains =
            {
                "cancel", "no puedo", "no voy", "no llego", "no podre", "no asisto",
                "no me queda", "no la voy a poder", "reprogram", "posponer",
                "otro dia", "otra fecha", "mas adelante"
            };
            if (Array.Exists(cancelExact, o => normalized == o)
                || Array.Exists(cancelContains, o => normalized.Contains(o))
                || text.Contains("❌") || text.Contains("👎"))
            {
                return "cancel";
            }

            // 2) CONFIRMAR — número 1, afirmaciones y frases de "ahí voy / cuenten conmigo"
            string[] confirmExact =
            {
                "1", "si", "sii", "siii", "sip", "sisi", "ok", "oka", "okey", "okis",
                "dale", "listo", "perfecto", "confirmo", "confirmado", "va", "voy",
                "asisto", "obvio", "claro", "genial", "buenisimo"
            };
            string[] confirmContains =
            {
                "confirm", "ahi voy", "ahi estare", "ahi estoy", "voy a ir", "si voy",
                "cuenten conmigo", "alli estare", "nos vemos", "de una"
            };
            if (Array.Exists(confirmExact, o => normalized == o)
                || Array.Exists(confirmContains, o => normalized.Contains(o))
                || text.Contains("✅") || text.Contains("👍"))
            {
                return "confirm";
            }

            return null;
        }

        private async Task UpdateMessageLogStatus(string providerMessageId, string status)
        {
            var mappedStatus = status switch
            {
                "DELIVERY_ACK" or "READ" or "PLAYED" => "delivered",
                "SERVER_ACK" => "sent",
                "ERROR" => "failed",
                _ => null
            };

            if (mappedStatus == null) return;

            var log = await _context.MessageLogs
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => l.ProviderMessageId == providerMessageId);

            if (log == null) return;

            log.Status = mappedStatus;
            if (mappedStatus == "delivered")
                log.DeliveredAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}