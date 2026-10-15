using System.Globalization;
using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Utilities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Asistente de WhatsApp por menú (add-on FeatureCodes.MenuBot). Calcado del bot de PlayCrew y
    /// adaptado a turnos: en vez de canchas por horario, el cliente elige servicio, profesional,
    /// día y hora. Sin LLM ni tokens: todo se resuelve con el estado de la conversación
    /// (<see cref="MenuBotSession"/>) y las mismas consultas que usa la reserva pública, así lo que
    /// el bot ofrece es exactamente lo que está libre en la agenda.
    ///
    /// Convención de horarios: el negocio trabaja en hora local (offset del tenant, "-3"). Los
    /// turnos se guardan en UTC, igual que en el agente IA: startUtc = localSlot - offset.
    /// </summary>
    public class WhatsAppMenuBotService : IWhatsAppMenuBotService
    {
        // Pasos de la conversación
        private const string StepMenu = "menu";
        private const string StepService = "book_service";
        private const string StepPro = "book_pro";
        private const string StepDate = "book_date";
        private const string StepTime = "book_time";
        private const string StepName = "book_name";
        private const string StepConfirm = "book_confirm";
        private const string StepCancelPick = "cancel_pick";
        private const string StepCancelConfirm = "cancel_confirm";
        private const string StepPaused = "paused";

        private const int SessionTimeoutMinutes = 30;
        private const int HumanPauseHours = 4;
        private const int MaxOptions = 12;

        private readonly ApplicationDbContext _context;
        private readonly IPublicService _public;
        private readonly IFeatureAddonService _addons;
        private readonly IWhatsAppConnectionService _whatsApp;
        private readonly ITenantService _tenantService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IMercadoPagoService _mercadoPago;
        private readonly IStripeConnectService _stripeConnect;
        private readonly ILogger<WhatsAppMenuBotService> _logger;

        public WhatsAppMenuBotService(
            ApplicationDbContext context,
            IPublicService publicService,
            IFeatureAddonService addons,
            IWhatsAppConnectionService whatsApp,
            ITenantService tenantService,
            IHttpContextAccessor httpContextAccessor,
            IMercadoPagoService mercadoPago,
            IStripeConnectService stripeConnect,
            ILogger<WhatsAppMenuBotService> logger)
        {
            _context = context;
            _public = publicService;
            _addons = addons;
            _whatsApp = whatsApp;
            _tenantService = tenantService;
            _httpContextAccessor = httpContextAccessor;
            _mercadoPago = mercadoPago;
            _stripeConnect = stripeConnect;
            _logger = logger;
        }

        public async Task<bool> IsActiveAsync(Guid tenantId)
        {
            if (!await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.MenuBot)) return false;
            var settings = await _context.MenuBotSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);
            return settings == null || settings.Enabled;
        }

        public async Task<MenuBotSettings> GetOrCreateSettingsAsync(Guid tenantId)
        {
            var settings = await _context.MenuBotSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.TenantId == tenantId);
            if (settings != null) return settings;
            settings = new MenuBotSettings { TenantId = tenantId };
            _context.MenuBotSettings.Add(settings);
            await _context.SaveChangesAsync();
            return settings;
        }

        // ---------------------------------------------------------------------------------
        // Entrada
        // ---------------------------------------------------------------------------------

        public async Task<string?> HandleIncomingMessageAsync(Guid tenantId, string phone, string? contactName, string text, CancellationToken ct = default)
            => (await HandleCoreAsync(tenantId, phone, contactName, text, ct)).Reply;

        public async Task<InboundHandleResult> HandleIncomingDetailedAsync(Guid tenantId, string phone, string? contactName, string text, CancellationToken ct = default)
            => (await HandleCoreAsync(tenantId, phone, contactName, text, ct)).Result;

        private async Task<(string? Reply, InboundHandleResult Result)> HandleCoreAsync(Guid tenantId, string phone, string? contactName, string text, CancellationToken ct)
        {
            var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return (null, InboundHandleResult.Ignored("no_tenant", "El negocio no existe"));

            // Contexto de tenant: el filtro global del DbContext lee HttpContext.Items["TenantId"],
            // y PublicService resuelve el negocio desde ITenantService (mismo patrón que el agente IA).
            var httpCtx = _httpContextAccessor.HttpContext;
            if (httpCtx != null) httpCtx.Items["TenantId"] = tenantId.ToString();
            _tenantService.SetCurrentTenant(new TenantInfo
            {
                Id = tenantId,
                Subdomain = tenant.Subdomain ?? "",
                BusinessName = tenant.BusinessName ?? "",
                TimeZone = TenantTime.ResolveId(tenant.TimeZone, tenant.Country),
                Country = CountryProfile.For(tenant).Code,
                Currency = CountryProfile.CurrencyFor(tenant),
            });

            var settings = await GetOrCreateSettingsAsync(tenantId);
            var session = await LoadSessionAsync(tenantId, phone, contactName, ct);

            // "Hablar con el negocio": el bot se calla hasta que el cliente escribe "menu".
            if (session.PausedUntil.HasValue && session.PausedUntil.Value > DateTime.UtcNow)
            {
                if (!IsMenuWord(text))
                {
                    await _context.SaveChangesAsync(ct);
                    return (null, InboundHandleResult.Ignored("no_reply", "El cliente pidió hablar con el negocio: el asistente está en pausa hasta que escriba \"menu\""));
                }
                session.PausedUntil = null;
                session.Step = StepMenu;
            }

            var reply = await BuildReplyAsync(tenant, settings, session, text, ct);
            session.LastMessageAt = DateTime.UtcNow;
            session.UpdatedAt = DateTime.UtcNow;
            session.MessagesIn++;
            await _context.SaveChangesAsync(ct);

            if (string.IsNullOrWhiteSpace(reply)) return (null, InboundHandleResult.Ignored("no_reply", "El asistente no tenía respuesta para este mensaje"));
            // La vista previa del panel corre el mismo bot pero no manda nada por WhatsApp.
            if (phone.StartsWith("preview", StringComparison.OrdinalIgnoreCase)) return (reply, InboundHandleResult.Replied(reply));
            try
            {
                var send = await _whatsApp.SendTextAsync(tenantId, phone, reply);
                if (!send.Success)
                {
                    _logger.LogWarning("Bot por menú: no se pudo responder a {Phone} del tenant {TenantId}: {Error}", phone, tenantId, send.Message);
                    return (reply, InboundHandleResult.Failed("send_failed", send.Message));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bot por menú: no se pudo responder a {Phone} del tenant {TenantId}", phone, tenantId);
                return (reply, InboundHandleResult.Failed("send_failed", ex.Message));
            }
            return (reply, InboundHandleResult.Replied(reply));
        }

        private async Task<MenuBotSession> LoadSessionAsync(Guid tenantId, string phone, string? contactName, CancellationToken ct)
        {
            var session = await _context.MenuBotSessions.IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Phone == phone, ct);
            if (session == null)
            {
                session = new MenuBotSession { TenantId = tenantId, Phone = phone, ContactName = contactName };
                _context.MenuBotSessions.Add(session);
                return session;
            }
            if (!string.IsNullOrWhiteSpace(contactName)) session.ContactName = contactName;
            // Sesión vieja: se arranca de cero para no retomar una reserva a medias de ayer.
            if (session.LastMessageAt < DateTime.UtcNow.AddMinutes(-SessionTimeoutMinutes) && session.Step != StepPaused)
                Reset(session);
            return session;
        }

        private static void Reset(MenuBotSession s)
        {
            s.Step = StepMenu;
            s.DataJson = null;
        }

        // ---------------------------------------------------------------------------------
        // Máquina de estados
        // ---------------------------------------------------------------------------------

        private async Task<string?> BuildReplyAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession session, string text, CancellationToken ct)
        {
            var data = SessionData.From(session.DataJson);
            var p = Parse(text, OffsetHours(tenant));

            // Atajos que valen en cualquier paso
            if (IsMenuWord(text)) { Reset(session); return RenderMenu(tenant, session, greet: false); }
            if (p.Intent == Intent.Human) return StartHuman(tenant, session);

            string? reply;
            switch (session.Step)
            {
                case StepMenu: reply = await OnMenuAsync(tenant, settings, session, data, p, ct); break;
                case StepService: reply = await OnServiceAsync(tenant, settings, session, data, p, ct); break;
                case StepPro: reply = await OnProAsync(tenant, settings, session, data, p, ct); break;
                case StepDate: reply = await OnDateAsync(tenant, settings, session, data, p, ct); break;
                case StepTime: reply = await OnTimeAsync(tenant, settings, session, data, p, ct); break;
                case StepName: reply = await OnNameAsync(tenant, settings, session, data, text, ct); break;
                case StepConfirm: reply = await OnConfirmAsync(tenant, settings, session, data, p, ct); break;
                case StepCancelPick: reply = await OnCancelPickAsync(tenant, settings, session, data, p, ct); break;
                case StepCancelConfirm: reply = await OnCancelConfirmAsync(tenant, settings, session, data, p, ct); break;
                default: Reset(session); reply = RenderMenu(tenant, session, greet: true); break;
            }

            session.DataJson = data.ToJson();
            return reply;
        }

        private async Task<string?> OnMenuAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            switch (p.Option)
            {
                case 1: return await StartBookingAsync(tenant, settings, s, d, ct);
                case 2: return await RenderMyBookingsAsync(tenant, s, ct);
                case 3: return await StartCancelAsync(tenant, settings, s, d, ct);
                case 4: return await RenderInfoAsync(tenant, settings, ct);
                case 5: return StartHuman(tenant, s);
            }
            return p.Intent switch
            {
                Intent.Book => await StartBookingAsync(tenant, settings, s, d, ct),
                Intent.MyBookings => await RenderMyBookingsAsync(tenant, s, ct),
                Intent.Cancel => await StartCancelAsync(tenant, settings, s, d, ct),
                Intent.Info => await RenderInfoAsync(tenant, settings, ct),
                Intent.Thanks => W(tenant).T("¡De nada! 🙌 Cuando necesites algo, escribí *menu*.", "¡De nada! 🙌 Cuando necesites algo, escribe *menu*."),
                _ => RenderMenu(tenant, s, greet: true),
            };
        }

        // ---------- Reservar ----------

        private async Task<string> StartBookingAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, CancellationToken ct)
        {
            var services = (await _public.GetServicesAsync()).Where(x => x.IsActive).OrderBy(x => x.Name).Take(MaxOptions).ToList();
            if (services.Count == 0)
                return W(tenant).T("😕 Todavía no hay servicios cargados para reservar. Escribí *5* para hablar con el negocio.",
                    "😕 Todavía no hay servicios cargados para reservar. Escribe *5* para hablar con el negocio.");

            d.ServiceOptions = services.Select(x => x.Id).ToList();
            if (services.Count == 1)
            {
                d.ServiceId = services[0].Id;
                return await GoToProAsync(tenant, settings, s, d, ct);
            }

            s.Step = StepService;
            var sb = new StringBuilder(W(tenant).T("💇 ¿Qué servicio querés?\n", "💇 ¿Qué servicio quieres?\n"));
            for (var i = 0; i < services.Count; i++)
                sb.AppendLine($"{i + 1}) {services[i].Name} · {Money(tenant, services[i].Price)} · {services[i].DurationMinutes} min");
            sb.AppendLine("0) Volver al menú");
            return sb.ToString().TrimEnd();
        }

        private async Task<string> OnServiceAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            if (p.Option == 0) { Reset(s); return RenderMenu(tenant, s, greet: false); }
            var picked = PickById(d.ServiceOptions, p.Option);
            if (picked == null)
            {
                var services = await ServicesByIdsAsync(d.ServiceOptions, ct);
                var byName = services.FirstOrDefault(x => Normalize(x.Name).Contains(Normalize(p.Raw)) && Normalize(p.Raw).Length >= 3);
                if (byName == null) return W(tenant).T("No entendí 🙈 Respondé con el número del servicio, o *0* para volver.", "No entendí 🙈 Responde con el número del servicio, o *0* para volver.");
                picked = byName.Id;
            }
            d.ServiceId = picked;
            return await GoToProAsync(tenant, settings, s, d, ct);
        }

        private async Task<string> GoToProAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, CancellationToken ct)
        {
            var pros = (await _public.GetEmployeesAsync())
                .Where(e => e.IsActive && e.CanPerformServices && CanDoService(e, d.ServiceId!.Value))
                .OrderBy(e => e.Name).Take(MaxOptions).ToList();

            if (pros.Count == 0)
                return W(tenant).T("😕 No hay nadie disponible para ese servicio ahora mismo. Escribí *5* para hablar con el negocio.",
                    "😕 No hay nadie disponible para ese servicio ahora mismo. Escribe *5* para hablar con el negocio.");

            d.ProOptions = pros.Select(x => x.Id).ToList();
            if (pros.Count == 1)
            {
                d.EmployeeId = pros[0].Id;
                return await GoToDateAsync(tenant, settings, s, d);
            }

            s.Step = StepPro;
            var sb = new StringBuilder("🙋 ¿Con quién te gustaría atenderte?\n");
            for (var i = 0; i < pros.Count; i++) sb.AppendLine($"{i + 1}) {pros[i].Name}");
            sb.AppendLine($"{pros.Count + 1}) " + W(tenant).T("Me da igual, el primero que haya", "Me da igual, el primero que esté libre", "Me da igual, el primero que haya"));
            sb.AppendLine("0) Volver al menú");
            return sb.ToString().TrimEnd();
        }

        private async Task<string> OnProAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            if (p.Option == 0) { Reset(s); return RenderMenu(tenant, s, greet: false); }
            if (p.Option == (d.ProOptions?.Count ?? 0) + 1) { d.EmployeeId = null; return await GoToDateAsync(tenant, settings, s, d); }

            var picked = PickById(d.ProOptions, p.Option);
            if (picked == null)
            {
                var pros = await EmployeesByIdsAsync(d.ProOptions, ct);
                var byName = pros.FirstOrDefault(x => Normalize(x.Name).Contains(Normalize(p.Raw)) && Normalize(p.Raw).Length >= 3);
                if (byName == null) return W(tenant).T("No entendí 🙈 Respondé con el número del profesional, o *0* para volver.", "No entendí 🙈 Responde con el número del profesional, o *0* para volver.");
                picked = byName.Id;
            }
            d.EmployeeId = picked;
            return await GoToDateAsync(tenant, settings, s, d);
        }

        private Task<string> GoToDateAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d)
        {
            s.Step = StepDate;
            var today = NowLocal(tenant).Date;
            var days = Math.Clamp(settings.DaysToOffer, 1, 30);
            var sb = new StringBuilder("📅 ¿Para qué día?\n");
            for (var i = 0; i < days && i < 9; i++)
            {
                var day = today.AddDays(i);
                var label = i == 0 ? "Hoy" : i == 1 ? "Mañana" : Capitalize(day.ToString("dddd", Es));
                sb.AppendLine($"{i + 1}) {label} ({day:dd/MM})");
            }
            sb.AppendLine("0) Volver al menú");
            sb.AppendLine(W(tenant).T("_Podés escribir el día: «jueves», «12/09», «pasado mañana»._", "_Puedes escribir el día: «jueves», «12/09», «pasado mañana»._"));
            return Task.FromResult(sb.ToString().TrimEnd());
        }

        private async Task<string> OnDateAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            if (p.Option == 0) { Reset(s); return RenderMenu(tenant, s, greet: false); }

            var today = NowLocal(tenant).Date;
            var days = Math.Clamp(settings.DaysToOffer, 1, 30);
            DateTime? date = null;
            if (p.Option is >= 1 and <= 9 && p.Option.Value <= days) date = today.AddDays(p.Option.Value - 1);
            else if (p.Date.HasValue) date = p.Date.Value;

            var w = W(tenant);
            if (date == null) return w.T("No entendí la fecha 🙈 Respondé con el número del día, o escribí «jueves» o «12/09».", "No entendí la fecha 🙈 Responde con el número del día, o escribe «jueves» o «12/09».");
            if (date.Value < today) return w.T("Esa fecha ya pasó 😅 Elegí un día de la lista.", "Esa fecha ya pasó 😅 Elige un día de la lista.");
            if (date.Value > today.AddDays(days)) return w.T($"Por ahora tomamos turnos hasta {days} días adelante. Elegí un día de la lista.", $"Por ahora damos citas hasta {days} días adelante. Elige un día de la lista.");

            d.Date = date.Value.ToString("yyyy-MM-dd");
            return await GoToTimesAsync(tenant, settings, s, d);
        }

        private async Task<string> GoToTimesAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d)
        {
            var date = DateTime.ParseExact(d.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            var slots = await FreeSlotsAsync(tenant, settings, d, date);

            if (slots.Count == 0)
            {
                s.Step = StepDate;
                return $"😕 No quedan horarios para el {date:dd/MM}.\n\n" + await GoToDateAsync(tenant, settings, s, d);
            }

            s.Step = StepTime;
            d.TimeOptions = slots.Take(MaxOptions * 2).ToList();
            var sb = new StringBuilder($"🕐 Horarios libres el {Capitalize(date.ToString("ddd dd/MM", Es))}:\n");
            for (var i = 0; i < d.TimeOptions.Count; i++)
            {
                sb.Append($"{i + 1}) {d.TimeOptions[i]}   ");
                if ((i + 1) % 3 == 0) sb.AppendLine();
            }
            sb.AppendLine();
            sb.AppendLine(W(tenant).T("Respondé con el número o escribí la hora («a las 16», «16:30»).", "Responde con el número o escribe la hora («a las 16», «16:30»)."));
            sb.AppendLine("0) Elegir otro día");
            return sb.ToString().TrimEnd();
        }

        private async Task<string> OnTimeAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            if (p.Option == 0) return await GoToDateAsync(tenant, settings, s, d);

            string? chosen = null;
            if (p.Option is >= 1 && p.Option <= (d.TimeOptions?.Count ?? 0)) chosen = d.TimeOptions![p.Option.Value - 1];
            else if (p.Time != null) chosen = d.TimeOptions?.FirstOrDefault(t => t == p.Time);

            if (chosen == null)
            {
                if (p.Time != null) return $"😕 A las {p.Time} no hay lugar ese día.\n\n" + await GoToTimesAsync(tenant, settings, s, d);
                return W(tenant).T("No entendí el horario 🙈 Respondé con el número o escribí la hora (ej: 16:30).", "No entendí el horario 🙈 Responde con el número o escribe la hora (ej: 16:30).");
            }

            d.Time = chosen;

            // Si ya lo conocemos por el teléfono, no le pedimos el nombre otra vez.
            var known = await FindCustomerAsync(s.Phone, ct);
            if (known != null)
            {
                d.Name = $"{known.FirstName} {known.LastName}".Trim();
                s.Step = StepConfirm;
                return await RenderConfirmAsync(tenant, s, d, ct);
            }

            s.Step = StepName;
            return W(tenant).T("🙋 ¿A nombre de quién reservo el turno?", "🙋 ¿A nombre de quién reservo la cita?");
        }

        private async Task<string> OnNameAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, string text, CancellationToken ct)
        {
            var name = (text ?? "").Trim();
            if (name.Length < 2 || name.Length > 80) return W(tenant).T("Decime un nombre para la reserva 🙏 (ej: María Pérez)", "Dime un nombre para la reserva 🙏 (ej: María Pérez)");
            d.Name = name;
            s.Step = StepConfirm;
            return await RenderConfirmAsync(tenant, s, d, ct);
        }

        private async Task<string> RenderConfirmAsync(Tenant tenant, MenuBotSession s, SessionData d, CancellationToken ct)
        {
            var service = await _context.Services.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == d.ServiceId, ct);
            var pro = d.EmployeeId.HasValue
                ? await _context.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == d.EmployeeId, ct)
                : null;
            var date = DateTime.ParseExact(d.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture);

            var w = W(tenant);
            var sb = new StringBuilder(w.T("📋 Confirmá tu turno:\n", "📋 Confirma tu cita:\n"));
            sb.AppendLine($"• {Capitalize(date.ToString("dddd dd/MM", Es))} a las {d.Time}");
            sb.AppendLine($"• {service?.Name ?? "Servicio"}{(service != null ? $" ({service.DurationMinutes} min)" : "")}");
            if (pro != null) sb.AppendLine($"• Con {pro.Name}");
            if (service != null && service.Price > 0) sb.AppendLine($"• Precio: {Money(tenant, service.Price)}");
            var deposit = DepositFor(service);
            if (deposit.HasValue && service != null)
            {
                // Con Mercado Pago (o Stripe en España) conectado la seña se cobra con link al confirmar, con la
                // misma política que la reserva pública (puede no corresponder, p.ej. cliente habitual); si no,
                // queda como antes: se arregla con el negocio.
                if (await CanChargeDepositOnlineAsync(tenant, ct))
                {
                    var startUtc = date.Add(TimeSpan.Parse(d.Time!)).AddHours(-OffsetHours(tenant));
                    var customer = await FindCustomerAsync(s.Phone, ct);
                    var mpDeposit = await DepositByPolicyAsync(service.Id, customer?.Id, startUtc);
                    if (mpDeposit.HasValue) sb.AppendLine(w.T(
                        $"• Seña: {Money(tenant, mpDeposit.Value)} (al confirmar te paso el link de Mercado Pago)",
                        $"• Anticipo: {Money(tenant, mpDeposit.Value)} (al confirmar te paso el link de Mercado Pago)",
                        $"• Señal: {Money(tenant, mpDeposit.Value)} (al confirmar te paso el enlace para pagar con tarjeta)"));
                }
                else sb.AppendLine($"• {w.SenaTitle}: {Money(tenant, deposit.Value)} (se coordina con el negocio)");
            }
            sb.AppendLine($"• A nombre de: {d.Name}");
            sb.AppendLine();
            sb.AppendLine("1) ✅ Confirmar");
            sb.AppendLine("2) ❌ No, volver al menú");
            return sb.ToString().TrimEnd();
        }

        private async Task<string> OnConfirmAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            var w = W(tenant);
            if (p.Option == 2 || p.YesNo == false) { Reset(s); return "👍 Listo, no reservé nada.\n\n" + RenderMenu(tenant, s, greet: false); }
            if (p.Option != 1 && p.YesNo != true) return w.T("Respondé *1* para confirmar o *2* para cancelar.", "Responde *1* para confirmar o *2* para cancelar.");

            var service = await _context.Services.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == d.ServiceId, ct);
            if (service == null) { Reset(s); return "😕 Ese servicio ya no está disponible.\n\n" + RenderMenu(tenant, s, greet: false); }

            var employeeId = d.EmployeeId ?? (await FirstFreeEmployeeAsync(tenant, settings, d, ct));
            if (employeeId == null)
            {
                d.Time = null;
                return W(tenant).T("😕 Ese horario se ocupó recién.\n\n", "😕 Ese horario se acaba de ocupar.\n\n") + await GoToTimesAsync(tenant, settings, s, d);
            }

            var date = DateTime.ParseExact(d.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            var startUtc = TenantTime.ToUtc(date.Add(TimeSpan.Parse(d.Time!)), TenantTime.For(tenant));
            var endUtc = startUtc.AddMinutes(service.DurationMinutes);

            if (startUtc <= DateTime.UtcNow.AddMinutes(settings.MinBookingAdvanceMinutes))
            {
                d.Time = null;
                var retry = await GoToTimesAsync(tenant, settings, s, d);
                return (settings.MinBookingAdvanceMinutes > 0
                    ? w.T($"😕 Los turnos se reservan con al menos {HumanMinutes(settings.MinBookingAdvanceMinutes)} de anticipación.\n\n",
                          $"😕 Las citas se reservan con al menos {HumanMinutes(settings.MinBookingAdvanceMinutes)} de anticipación.\n\n",
                          $"😕 Las citas se reservan con al menos {HumanMinutes(settings.MinBookingAdvanceMinutes)} de antelación.\n\n")
                    : "😕 Ese horario ya pasó.\n\n") + retry;
            }

            try
            {
                // Cliente previo (por teléfono) para la política de seña "solo clientes nuevos".
                var knownCustomer = await FindCustomerAsync(s.Phone, ct);
                var booking = await _public.CreatePublicBookingAsync(new CreatePublicBookingDto
                {
                    CustomerName = d.Name!,
                    CustomerPhone = s.Phone,
                    EmployeeId = employeeId.Value,
                    ServiceId = service.Id,
                    StartTime = startUtc,
                    EndTime = endUtc,
                    Notes = "Turno creado por el asistente de WhatsApp",
                });

                s.BookingsCreated++;
                Reset(s);

                var pro = await _context.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == employeeId, ct);
                var whenText = $"{Capitalize(date.ToString("dddd dd/MM", Es))} a las {d.Time}";

                // Seña con el Mercado Pago del negocio (o Stripe Connect en España): mismo camino que la reserva
                // pública (CalculateDepositAsync + CreatePaymentPreferenceAsync, que deriva a Stripe). Si no hay
                // cobro online o falla, sigue como antes.
                var depositLink = await TryCreateDepositLinkAsync(tenant, booking, service, knownCustomer?.Id ?? booking.CustomerId, d.Name!, ct);
                if (depositLink != null)
                {
                    var pay = new StringBuilder();
                    var withPro = pro != null ? $" con {pro.Name}" : "";
                    var depositMoney = Money(tenant, depositLink.Value.Amount);
                    pay.AppendLine(w.T($"📅 Reservamos tu turno: {service.Name}{withPro}, {whenText}.", $"📅 Reservamos tu cita: {service.Name}{withPro}, {whenText}."));
                    pay.AppendLine(w.T(
                        $"Para confirmarlo, aboná la seña de {depositMoney} acá 👇",
                        $"Para confirmarla, paga el anticipo de {depositMoney} aquí 👇",
                        $"Para confirmarla, paga la señal de {depositMoney} aquí 👇"));
                    pay.AppendLine(depositLink.Value.Link);
                    pay.AppendLine(w.T("Apenas se acredite te aviso por acá ✅", "En cuanto se acredite te aviso por aquí ✅"));
                    pay.AppendLine();
                    pay.AppendLine(CancelHint(w, settings.CancellationCutoffHours));
                    pay.Append(w.T("Escribí *menu* para volver al inicio.", "Escribe *menu* para volver al inicio."));
                    return pay.ToString();
                }

                var sb = new StringBuilder(w.T("✅ ¡Turno confirmado!\n", "✅ ¡Cita confirmada!\n"));
                sb.AppendLine($"• {whenText}");
                sb.AppendLine($"• {service.Name}{(pro != null ? $" con {pro.Name}" : "")}");
                if (service.Price > 0) sb.AppendLine($"• Precio: {Money(tenant, service.Price)}");
                var deposit = DepositFor(service);
                if (deposit.HasValue) sb.AppendLine($"• {w.SenaTitle}: {Money(tenant, deposit.Value)} (se coordina con el negocio)");
                sb.AppendLine();
                sb.AppendLine(CancelHint(w, settings.CancellationCutoffHours));
                sb.Append(w.T("Escribí *menu* para volver al inicio.", "Escribe *menu* para volver al inicio."));
                return sb.ToString();
            }
            catch (InvalidOperationException)
            {
                d.Time = null;
                return w.T("😕 Ese horario se ocupó recién. Elegí otro:\n\n", "😕 Ese horario se acaba de ocupar. Elige otro:\n\n") + await GoToTimesAsync(tenant, settings, s, d);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bot por menú: error creando el turno del tenant {TenantId}", tenant.Id);
                Reset(s);
                return w.T("😕 No pude cerrar el turno. Escribí *5* y te atiende alguien del negocio.", "😕 No pude cerrar la cita. Escribe *5* y te atiende alguien del negocio.");
            }
        }

        // ---------- Mis turnos / cancelar ----------

        private async Task<string> RenderMyBookingsAsync(Tenant tenant, MenuBotSession s, CancellationToken ct)
        {
            var w = W(tenant);
            var bookings = await UpcomingBookingsAsync(tenant, s.Phone, ct);
            if (bookings.Count == 0)
                return w.T("📭 No encontré turnos próximos con este número.\n\nEscribí *1* para reservar uno o *menu* para volver.",
                    "📭 No encontré citas próximas con este número.\n\nEscribe *1* para reservar una o *menu* para volver.");

            var sb = new StringBuilder(w.T("📌 Tus próximos turnos:\n", "📌 Tus próximas citas:\n"));
            foreach (var b in bookings) sb.AppendLine($"• {Describe(tenant, b)}");
            sb.AppendLine();
            sb.Append(w.T("Escribí *cancelar* para cancelar uno o *menu* para volver.", "Escribe *cancelar* para cancelar una o *menu* para volver."));
            return sb.ToString();
        }

        private async Task<string> StartCancelAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, CancellationToken ct)
        {
            var w = W(tenant);
            var bookings = await UpcomingBookingsAsync(tenant, s.Phone, ct);
            if (bookings.Count == 0)
                return w.T("📭 No encontré turnos próximos con este número.\n\nEscribí *menu* para volver.",
                    "📭 No encontré citas próximas con este número.\n\nEscribe *menu* para volver.");

            var limit = DateTime.UtcNow.AddHours(settings.CancellationCutoffHours);
            var cancellable = bookings.Where(b => b.StartTime >= limit).ToList();
            var locked = bookings.Where(b => b.StartTime < limit).ToList();

            if (cancellable.Count == 0)
            {
                var sb0 = new StringBuilder(w.T(
                    $"⛔ Tus turnos próximos están a menos de {settings.CancellationCutoffHours} hs, así que no se pueden cancelar por acá.\n",
                    $"⛔ Tus próximas citas están a menos de {settings.CancellationCutoffHours} h, así que no se pueden cancelar por aquí.\n"));
                foreach (var b in locked) sb0.AppendLine($"• {Describe(tenant, b)}");
                sb0.AppendLine();
                sb0.Append(w.T("Escribí *5* para hablar con el negocio.", "Escribe *5* para hablar con el negocio."));
                return sb0.ToString();
            }

            s.Step = StepCancelPick;
            d.BookingOptions = cancellable.Select(b => b.Id).ToList();
            var sb = new StringBuilder(w.T("❌ ¿Cuál querés cancelar?\n", "❌ ¿Cuál quieres cancelar?\n"));
            for (var i = 0; i < cancellable.Count; i++) sb.AppendLine($"{i + 1}) {Describe(tenant, cancellable[i])}");
            sb.AppendLine("0) Volver al menú");
            if (locked.Count > 0)
            {
                sb.AppendLine();
                sb.AppendLine(w.T($"_No se pueden cancelar por acá (menos de {settings.CancellationCutoffHours} hs de anticipación):_",
                    $"_No se pueden cancelar por aquí (menos de {settings.CancellationCutoffHours} h de anticipación):_",
                    $"_No se pueden cancelar por aquí (menos de {settings.CancellationCutoffHours} h de antelación):_"));
                foreach (var b in locked) sb.AppendLine($"• {Describe(tenant, b)}");
            }
            return sb.ToString().TrimEnd();
        }

        private async Task<string> OnCancelPickAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            if (p.Option == 0) { Reset(s); return RenderMenu(tenant, s, greet: false); }
            var picked = PickById(d.BookingOptions, p.Option);
            var w = W(tenant);
            if (picked == null) return w.T("No entendí 🙈 Respondé con el número del turno, o *0* para volver.", "No entendí 🙈 Responde con el número de la cita, o *0* para volver.");

            var booking = await BookingByIdAsync(picked.Value, ct);
            if (booking == null) { Reset(s); return w.T("😕 No encontré ese turno.\n\n", "😕 No encontré esa cita.\n\n") + RenderMenu(tenant, s, greet: false); }

            d.BookingId = picked;
            s.Step = StepCancelConfirm;
            return w.T($"¿Seguro que querés cancelar el turno del {Describe(tenant, booking)}?\n\n1) Sí, cancelar\n2) No, dejarlo",
                $"¿Seguro que quieres cancelar la cita del {Describe(tenant, booking)}?\n\n1) Sí, cancelar\n2) No, dejarla");
        }

        private async Task<string> OnCancelConfirmAsync(Tenant tenant, MenuBotSettings settings, MenuBotSession s, SessionData d, Parsed p, CancellationToken ct)
        {
            var w = W(tenant);
            if (p.Option == 2 || p.YesNo == false) { Reset(s); return "👍 Listo, no cancelé nada.\n\n" + RenderMenu(tenant, s, greet: false); }
            if (p.Option != 1 && p.YesNo != true) return w.T("Respondé *1* para cancelar el turno o *2* para dejarlo.", "Responde *1* para cancelar la cita o *2* para dejarla.");

            var booking = d.BookingId.HasValue ? await BookingByIdAsync(d.BookingId.Value, ct) : null;
            if (booking == null) { Reset(s); return w.T("😕 No encontré ese turno.\n\n", "😕 No encontré esa cita.\n\n") + RenderMenu(tenant, s, greet: false); }

            // Se revalida la anticipación: entre que lo eligió y confirmó pudo cruzarse el límite.
            if (booking.StartTime < DateTime.UtcNow.AddHours(settings.CancellationCutoffHours))
            {
                Reset(s);
                return w.T($"⛔ Ese turno ya está a menos de {settings.CancellationCutoffHours} hs. Escribí *5* para hablar con el negocio.",
                    $"⛔ Esa cita ya está a menos de {settings.CancellationCutoffHours} h. Escribe *5* para hablar con el negocio.");
            }

            var previous = booking.Status;
            booking.Status = "cancelled";
            booking.CancelledAt = DateTime.UtcNow;
            booking.CancellationReason = "Cancelado por el cliente desde WhatsApp";
            booking.UpdatedAt = DateTime.UtcNow;
            _context.BookingStatusHistory.Add(new BookingStatusHistory
            {
                TenantId = tenant.Id,
                BookingId = booking.Id,
                FromStatus = previous,
                ToStatus = "cancelled",
                Reason = "Cancelado por el cliente desde WhatsApp",
                ChangedBy = "whatsapp-bot",
            });
            s.BookingsCancelled++;
            var label = Describe(tenant, booking);
            Reset(s);
            await _context.SaveChangesAsync(ct);
            PushDispatch.BookingEvent(tenant.Id, booking.Id, "cancelled");
            return w.T($"✅ Listo, cancelé tu turno del {label}.\n\nEscribí *menu* para volver al inicio.",
                $"✅ Listo, cancelé tu cita del {label}.\n\nEscribe *menu* para volver al inicio.");
        }

        // ---------- Info / humano / menú ----------

        private async Task<string> RenderInfoAsync(Tenant tenant, MenuBotSettings settings, CancellationToken ct)
        {
            var services = (await _public.GetServicesAsync()).Where(x => x.IsActive).OrderBy(x => x.Name).Take(15).ToList();
            var sb = new StringBuilder($"ℹ️ *{tenant.BusinessName}*\n");
            if (services.Count > 0)
            {
                sb.AppendLine();
                sb.AppendLine("💇 *Servicios y precios*");
                foreach (var x in services)
                    sb.AppendLine($"• {x.Name}: {Money(tenant, x.Price)} · {x.DurationMinutes} min");
            }
            if (!string.IsNullOrWhiteSpace(settings.InfoText))
            {
                sb.AppendLine();
                sb.AppendLine(settings.InfoText);
            }
            sb.AppendLine();
            sb.Append(W(tenant).T("Escribí *1* para reservar o *menu* para volver.", "Escribe *1* para reservar o *menu* para volver."));
            return sb.ToString();
        }

        private string StartHuman(Tenant tenant, MenuBotSession s)
        {
            Reset(s);
            s.Step = StepPaused;
            s.PausedUntil = DateTime.UtcNow.AddHours(HumanPauseHours);
            return W(tenant).T(
                $"🙋 Dale, le aviso a {tenant.BusinessName} y te responden por acá.\n\n_Dejo de contestar automáticamente por un rato. Si querés volver al asistente, escribí *menu*._",
                $"🙋 Claro, le aviso a {tenant.BusinessName} y te responden por aquí.\n\n_Dejo de contestar automáticamente por un rato. Si quieres volver al asistente, escribe *menu*._",
                $"🙋 Vale, le aviso a {tenant.BusinessName} y te responden por aquí.\n\n_Dejo de contestar automáticamente por un rato. Si quieres volver al asistente, escribe *menu*._");
        }

        private static string RenderMenu(Tenant tenant, MenuBotSession s, bool greet)
        {
            var name = FirstName(s.ContactName);
            var hello = greet
                ? $"¡Hola{(string.IsNullOrEmpty(name) ? "" : $" {name}")}! 👋 Soy el asistente de *{tenant.BusinessName}*.\n"
                : "";
            var w = W(tenant);
            if (w.UsesTu)
                return hello +
                    "¿Qué quieres hacer? Responde con el número o escríbelo:\n\n" +
                    "1️⃣ Reservar una cita\n" +
                    "2️⃣ Ver mis citas\n" +
                    "3️⃣ Cancelar una cita\n" +
                    "4️⃣ Servicios y precios\n" +
                    "5️⃣ Hablar con el negocio\n\n" +
                    "_También puedes escribir directamente, por ejemplo: «quiero una cita». Escribe *menu* para volver aquí._";
            return hello +
                "¿Qué querés hacer? Respondé con el número o escribilo:\n\n" +
                "1️⃣ Reservar un turno\n" +
                "2️⃣ Ver mis turnos\n" +
                "3️⃣ Cancelar un turno\n" +
                "4️⃣ Servicios y precios\n" +
                "5️⃣ Hablar con el negocio\n\n" +
                "_También podés escribir directo, por ejemplo: «quiero un turno». Escribí *menu* para volver acá._";
        }

        // ---------------------------------------------------------------------------------
        // Datos
        // ---------------------------------------------------------------------------------

        /// <summary>Horarios libres, ya filtrados por la anticipación mínima del negocio.</summary>
        private async Task<List<string>> FreeSlotsAsync(Tenant tenant, MenuBotSettings settings, SessionData d, DateTime date)
        {
            var pros = d.EmployeeId.HasValue
                ? new List<Guid> { d.EmployeeId.Value }
                : (d.ProOptions ?? new List<Guid>());
            if (pros.Count == 0) return new List<string>();

            var slots = new SortedSet<string>(StringComparer.Ordinal);
            foreach (var proId in pros)
            {
                var free = await _public.GetAvailableTimeSlotsAsync(proId, date, d.ServiceId!.Value);
                foreach (var slot in free)
                {
                    // PublicService marca con "PAST:" los horarios que ya pasaron.
                    if (slot.StartsWith("PAST:", StringComparison.Ordinal)) continue;
                    slots.Add(slot);
                }
            }

            var earliest = NowLocal(tenant).AddMinutes(settings.MinBookingAdvanceMinutes);
            return slots
                .Where(t => TimeSpan.TryParse(t, out var ts) && date.Date.Add(ts) >= earliest)
                .ToList();
        }

        /// <summary>Primer profesional con ese horario libre (cuando el cliente eligió "me da igual").</summary>
        private async Task<Guid?> FirstFreeEmployeeAsync(Tenant tenant, MenuBotSettings settings, SessionData d, CancellationToken ct)
        {
            var date = DateTime.ParseExact(d.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            foreach (var proId in d.ProOptions ?? new List<Guid>())
            {
                var free = await _public.GetAvailableTimeSlotsAsync(proId, date, d.ServiceId!.Value);
                if (free.Any(t => t == d.Time)) return proId;
            }
            return null;
        }

        private async Task<List<Booking>> UpcomingBookingsAsync(Tenant tenant, string phone, CancellationToken ct)
        {
            var customer = await FindCustomerAsync(phone, ct);
            if (customer == null) return new List<Booking>();
            return await _context.Bookings.IgnoreQueryFilters()
                .Include(b => b.Service).Include(b => b.Employee)
                .Where(b => b.TenantId == tenant.Id && b.CustomerId == customer.Id
                    && b.Status != "cancelled" && b.StartTime >= DateTime.UtcNow)
                .OrderBy(b => b.StartTime).Take(10).ToListAsync(ct);
        }

        private Task<Booking?> BookingByIdAsync(Guid id, CancellationToken ct) =>
            _context.Bookings.IgnoreQueryFilters().Include(b => b.Service).Include(b => b.Employee)
                .FirstOrDefaultAsync(b => b.Id == id, ct);

        /// <summary>Busca el cliente por los últimos 8 dígitos del teléfono (absorbe 54 / 549 / 0 / 15).</summary>
        private async Task<Customer?> FindCustomerAsync(string phone, CancellationToken ct)
        {
            var digits = Digits(phone);
            if (digits.Length < 8) return null;
            var suffix = digits[^8..];
            var candidates = await _context.Customers.Where(c => c.Phone != null && c.Phone != "").ToListAsync(ct);
            return candidates.FirstOrDefault(c => Digits(c.Phone).EndsWith(suffix, StringComparison.Ordinal));
        }

        private Task<List<Service>> ServicesByIdsAsync(List<Guid>? ids, CancellationToken ct) =>
            ids == null || ids.Count == 0
                ? Task.FromResult(new List<Service>())
                : _context.Services.IgnoreQueryFilters().Where(x => ids.Contains(x.Id)).ToListAsync(ct);

        private Task<List<Employee>> EmployeesByIdsAsync(List<Guid>? ids, CancellationToken ct) =>
            ids == null || ids.Count == 0
                ? Task.FromResult(new List<Employee>())
                : _context.Employees.IgnoreQueryFilters().Where(x => ids.Contains(x.Id)).ToListAsync(ct);

        /// <summary>Specialties es un JSON con los ids de servicios que hace. Vacío = hace de todo.</summary>
        private static bool CanDoService(Employee e, Guid serviceId)
        {
            if (string.IsNullOrWhiteSpace(e.Specialties)) return true;
            try
            {
                var ids = JsonSerializer.Deserialize<List<string>>(e.Specialties);
                if (ids == null || ids.Count == 0) return true;
                return ids.Any(x => Guid.TryParse(x, out var g) && g == serviceId);
            }
            catch { return true; }
        }

        /// <summary>
        /// ¿Se puede cobrar la seña con link? Igual que la reserva pública: proveedor por defecto Mercado Pago
        /// (con Chytapay el cobro va por otro lado) y cuenta conectada por OAuth o credenciales manuales.
        /// </summary>
        private async Task<bool> CanChargeDepositOnlineAsync(Tenant tenant, CancellationToken ct)
        {
            // España: la seña va con Stripe Connect (CreatePaymentPreferenceAsync arma el Checkout en su cuenta).
            if (CountryProfile.For(tenant).StripeDeposits) return await _stripeConnect.CanChargeDepositsAsync(tenant.Id);

            var provider = (tenant.DefaultPaymentProvider ?? "mercadopago").ToLowerInvariant();
            if (provider != "mercadopago") return false;
            if (await _context.MercadoPagoOAuthConfigurations.IgnoreQueryFilters()
                    .AnyAsync(c => c.TenantId == tenant.Id && c.IsActive, ct)) return true;
            return await _context.PaymentConfigurations.IgnoreQueryFilters()
                .AnyAsync(c => c.TenantId == tenant.Id && c.MercadoPagoAccessToken != null && c.MercadoPagoAccessToken != "", ct);
        }

        /// <summary>Monto de seña según la política del servicio (la misma cuenta que usa la reserva pública).</summary>
        private async Task<decimal?> DepositByPolicyAsync(Guid serviceId, Guid? customerId, DateTime startUtc)
        {
            var calc = await _mercadoPago.CalculateDepositAsync(serviceId, customerId, startUtc);
            return calc.Success && calc.Data != null && calc.Data.RequiresDeposit && calc.Data.Amount > 0 ? calc.Data.Amount : null;
        }

        /// <summary>
        /// Crea el link de pago de la seña con el Mercado Pago del negocio y deja el turno como la reserva
        /// pública: RequiresDeposit + DepositAmount + "pending_payment" hasta que el webhook de MP lo apruebe
        /// (ahí pasa a "confirmed", se registra el Payment y se le avisa al cliente). El pago queda atado al
        /// turno por external_reference = booking.Id. Devuelve null si no corresponde seña, no hay MP o falla:
        /// en ese caso el turno queda confirmado como antes.
        /// </summary>
        private async Task<(decimal Amount, string Link)?> TryCreateDepositLinkAsync(Tenant tenant, Booking booking, Service service, Guid? customerId, string customerName, CancellationToken ct)
        {
            if (!service.RequiresDeposit) return null;
            try
            {
                if (!await CanChargeDepositOnlineAsync(tenant, ct)) return null;
                var amount = await DepositByPolicyAsync(service.Id, customerId, booking.StartTime);
                if (!amount.HasValue) return null;

                var result = await _mercadoPago.CreatePaymentPreferenceAsync(new BookingPro.API.Models.DTOs.CreatePaymentDto
                {
                    BookingId = booking.Id,
                    Amount = amount.Value,
                    PaymentMethod = "mercadopago",
                    PaymentType = "deposit",
                    CustomerName = customerName,
                    Subdomain = tenant.Subdomain,
                    Origin = BookingPro.API.Models.DTOs.CreatePaymentDto.WhatsAppBotOrigin,
                });
                var link = !string.IsNullOrWhiteSpace(result.Data?.InitPoint) ? result.Data!.InitPoint : result.Data?.SandboxInitPoint;
                if (!result.Success || string.IsNullOrWhiteSpace(link))
                {
                    _logger.LogWarning("Bot por menú: no se pudo crear el link de seña del turno {BookingId}: {Error}", booking.Id, result.Message);
                    return null;
                }

                booking.RequiresDeposit = true;
                booking.DepositAmount = result.Data!.Amount;
                booking.Price ??= service.Price;
                booking.Status = "pending_payment";
                booking.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(ct);
                return (result.Data.Amount, link);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bot por menú: error creando el link de seña del turno {BookingId}", booking.Id);
                return null;
            }
        }

        private static decimal? DepositFor(Service? service)
        {
            if (service == null || !service.RequiresDeposit) return null;
            if (service.DepositFixedAmount is > 0) return service.DepositFixedAmount;
            if (service.DepositPercentage is > 0) return Math.Round(service.Price * service.DepositPercentage.Value / 100m, 2);
            return null;
        }

        private string Describe(Tenant tenant, Booking b)
        {
            var local = TenantTime.ToLocal(b.StartTime, TenantTime.For(tenant));
            var what = b.Service?.Name ?? (W(tenant).UsesTu ? "Cita" : "Turno");
            var who = b.Employee != null ? $" con {b.Employee.Name}" : "";
            return $"{Capitalize(local.ToString("ddd dd/MM", Es))} {local:HH:mm} · {what}{who}";
        }

        // ---------------------------------------------------------------------------------
        // Parser
        // ---------------------------------------------------------------------------------

        private enum Intent { None, Book, Cancel, MyBookings, Info, Human, Thanks }

        private sealed class Parsed
        {
            public string Raw { get; set; } = "";
            public int? Option { get; set; }
            public bool? YesNo { get; set; }
            public DateTime? Date { get; set; }
            public string? Time { get; set; }
            public Intent Intent { get; set; } = Intent.None;
        }

        private Parsed Parse(string text, int offsetHours)
        {
            var raw = (text ?? "").Trim();
            var n = Normalize(raw);
            var p = new Parsed { Raw = raw };

            if (int.TryParse(n.Trim(), out var opt) && opt >= 0 && opt <= 99) p.Option = opt;

            if (n is "si" or "si!" or "sii" or "dale" or "ok" or "okey" or "listo" or "confirmo" or "confirmar" or "correcto") p.YesNo = true;
            else if (n is "no" or "nop" or "negativo" or "mejor no") p.YesNo = false;

            // Hora: "16", "16:30", "a las 16", "16hs"
            var timeMatch = System.Text.RegularExpressions.Regex.Match(n, @"(?:a las\s*)?(\d{1,2})(?::|\.|h|hs)?(\d{2})?\s*(?:hs|h)?\b");
            if (timeMatch.Success && (n.Contains("a las") || n.Contains(":") || n.Contains("hs") || n.Contains("h")))
            {
                if (int.TryParse(timeMatch.Groups[1].Value, out var hh) && hh is >= 0 and <= 23)
                {
                    var mm = timeMatch.Groups[2].Success && int.TryParse(timeMatch.Groups[2].Value, out var m) ? m : 0;
                    if (mm is >= 0 and <= 59) p.Time = $"{hh:D2}:{mm:D2}";
                }
            }

            p.Date = ParseDate(n, offsetHours);

            if (Contains(n, "reservar", "reserva", "turno", "quiero un turno", "sacar turno", "agendar", "cita", "pedir hora")) p.Intent = Intent.Book;
            if (Contains(n, "cancelar", "anular", "dar de baja")) p.Intent = Intent.Cancel;
            if (Contains(n, "mis turnos", "mi turno", "que turno tengo", "tengo turno", "mis citas", "mi cita", "que cita tengo", "tengo cita")) p.Intent = Intent.MyBookings;
            if (Contains(n, "precio", "precios", "cuanto sale", "cuanto cuesta", "servicios", "horarios")) p.Intent = Intent.Info;
            if (Contains(n, "hablar", "humano", "persona", "atencion", "consulta", "pagar", "pago", "transferencia")) p.Intent = Intent.Human;
            if (Contains(n, "gracias", "muchas gracias", "genial")) p.Intent = Intent.Thanks;

            return p;
        }

        private DateTime? ParseDate(string n, int offsetHours)
        {
            var today = DateTime.UtcNow.AddHours(offsetHours).Date;
            if (n.Contains("pasado manana")) return today.AddDays(2);
            if (n.Contains("manana")) return today.AddDays(1);
            if (n.Contains("hoy")) return today;

            var dayNames = new[] { "domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado" };
            for (var i = 0; i < dayNames.Length; i++)
            {
                if (!n.Contains(dayNames[i])) continue;
                var delta = ((i - (int)today.DayOfWeek) + 7) % 7;
                if (delta == 0) delta = 7;
                return today.AddDays(delta);
            }

            var m = System.Text.RegularExpressions.Regex.Match(n, @"\b(\d{1,2})[/\-](\d{1,2})\b");
            if (m.Success && int.TryParse(m.Groups[1].Value, out var d) && int.TryParse(m.Groups[2].Value, out var mo))
            {
                try
                {
                    var year = today.Year;
                    var date = new DateTime(year, mo, d);
                    if (date < today) date = date.AddYears(1);
                    return date;
                }
                catch { return null; }
            }
            return null;
        }

        private static bool Contains(string normalized, params string[] words) => words.Any(normalized.Contains);

        private static bool IsMenuWord(string text)
        {
            var n = Normalize(text);
            return n is "menu" or "inicio" or "volver" or "hola";
        }

        private static Guid? PickById(List<Guid>? options, int? option)
        {
            if (options == null || option is null) return null;
            if (option.Value < 1 || option.Value > options.Count) return null;
            return options[option.Value - 1];
        }

        // ---------------------------------------------------------------------------------
        // Utilidades
        // ---------------------------------------------------------------------------------

        private static readonly CultureInfo Es = new("es-AR");

        // Hora local del negocio (zona IANA; los offsets viejos "-3" y "sin configurar" siguen siendo Argentina).
        private static int OffsetHours(Tenant tenant) => TenantTime.OffsetHours(TenantTime.For(tenant));

        private static DateTime NowLocal(Tenant tenant) => TenantTime.NowLocal(TenantTime.For(tenant));

        private static string Digits(string? s) => new((s ?? "").Where(char.IsDigit).ToArray());

        private static string Money(Tenant tenant, decimal amount) => MoneyFormat.Format(amount, tenant);

        /// <summary>Voseo para Argentina y Uruguay, tú y "cita" para México y España.</summary>
        private static Wording W(Tenant tenant) => Wording.For(tenant);

        private static string CancelHint(Wording w, int hours) => w.T(
            $"Podés cancelarlo por acá hasta {hours} hs antes (escribí *cancelar*).",
            $"Puedes cancelarla por aquí hasta {hours} h antes (escribe *cancelar*).");

        private static string HumanMinutes(int minutes) =>
            minutes % 60 == 0 ? (minutes / 60 == 1 ? "1 hora" : $"{minutes / 60} horas") : $"{minutes} minutos";

        private static string Capitalize(string s) => string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s[1..];

        private static string FirstName(string? name) =>
            string.IsNullOrWhiteSpace(name) ? "" : name.Trim().Split(' ')[0];

        /// <summary>Minúsculas, sin tildes, ñ→n: las listas de palabras están escritas así.</summary>
        private static string Normalize(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var decomposed = s.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
                sb.Append(c);
            }
            return sb.ToString().Normalize(NormalizationForm.FormC);
        }

        /// <summary>Lo que el cliente ya eligió en la conversación (se serializa en MenuBotSession.DataJson).</summary>
        private sealed class SessionData
        {
            public Guid? ServiceId { get; set; }
            public Guid? EmployeeId { get; set; }
            public string? Date { get; set; }   // yyyy-MM-dd (local)
            public string? Time { get; set; }   // HH:mm (local)
            public string? Name { get; set; }
            public Guid? BookingId { get; set; }
            public List<Guid>? ServiceOptions { get; set; }
            public List<Guid>? ProOptions { get; set; }
            public List<string>? TimeOptions { get; set; }
            public List<Guid>? BookingOptions { get; set; }

            public static SessionData From(string? json)
            {
                if (string.IsNullOrWhiteSpace(json)) return new SessionData();
                try { return JsonSerializer.Deserialize<SessionData>(json) ?? new SessionData(); }
                catch { return new SessionData(); }
            }

            public string ToJson() => JsonSerializer.Serialize(this);
        }
    }
}
