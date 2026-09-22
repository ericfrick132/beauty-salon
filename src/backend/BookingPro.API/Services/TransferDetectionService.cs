using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using BookingPro.API.Data;
using BookingPro.API.Models.Constants;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Calcado de GymHero (MercadoPagoReconciliationService) y PlayCrew, adaptado a turnos: en vez
    /// de "cuota del socio" acá se paga la seña o el saldo de un turno, y el cliente se identifica
    /// por DNI, cuenta aprendida o nombre (el teléfono lo aporta el comprobante por WhatsApp).
    ///
    /// Usa /v1/payments/search en vez de los reportes de MP: el reporte es batch (se genera async)
    /// mientras que search responde en el momento y cubre los últimos 12 meses.
    /// </summary>
    public class TransferDetectionService : ITransferDetectionService
    {
        private const string BaseUrl = "https://api.mercadopago.com";
        private const decimal AmountTolerance = 1m;
        private static readonly TimeZoneInfo ArgentinaTz = ResolveTz();

        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMercadoPagoOAuthService _mpOAuth;
        private readonly IFeatureAddonService _addons;
        private readonly IWhatsAppConnectionService _whatsApp;
        private readonly ILogger<TransferDetectionService> _logger;

        public TransferDetectionService(
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory,
            IMercadoPagoOAuthService mpOAuth,
            IFeatureAddonService addons,
            IWhatsAppConnectionService whatsApp,
            ILogger<TransferDetectionService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _mpOAuth = mpOAuth;
            _addons = addons;
            _whatsApp = whatsApp;
            _logger = logger;
        }

        public async Task<TransferDetectionSettings> GetOrCreateSettingsAsync(Guid tenantId)
        {
            var settings = await _context.TransferDetectionSettings.IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);
            if (settings != null) return settings;

            // Arranca prendido y "desde ahora": lo anterior el negocio ya lo cargó a mano y volver a
            // aplicarlo le duplicaría las señas.
            settings = new TransferDetectionSettings { TenantId = tenantId, Enabled = true, StartedAt = DateTime.UtcNow };
            _context.TransferDetectionSettings.Add(settings);
            await _context.SaveChangesAsync();
            return settings;
        }

        public async Task<bool> IsActiveAsync(Guid tenantId)
        {
            if (!await _addons.HasActiveAddonAsync(tenantId, FeatureCodes.TransferDetection)) return false;
            var settings = await _context.TransferDetectionSettings.IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);
            return settings == null || settings.Enabled;
        }

        // ---------------------------------------------------------------------------------
        // Escaneo + aplicación automática
        // ---------------------------------------------------------------------------------

        public async Task<TransferReconcileResult> ReconcileAsync(Guid tenantId, DateTime from, DateTime to)
        {
            var result = new TransferReconcileResult();

            var tokenResult = await _mpOAuth.GetValidAccessTokenAsync(tenantId);
            if (!tokenResult.Success || string.IsNullOrWhiteSpace(tokenResult.Data))
            {
                result.Error = "El negocio no tiene Mercado Pago conectado (o el token no se pudo renovar).";
                return result;
            }
            var collectorId = await _context.Set<MercadoPagoOAuthConfiguration>().IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId && c.IsActive)
                .OrderByDescending(c => c.AccessTokenExpiresAt)
                .Select(c => c.MercadoPagoUserId)
                .FirstOrDefaultAsync();

            var (transfers, error) = await FetchIncomingAsync(tokenResult.Data!, collectorId, from, to);
            if (error != null) { result.Error = error; return result; }

            result.Scanned = transfers.Count;
            if (transfers.Count == 0) return result;

            var mpIds = transfers.Select(t => t.PaymentId).ToList();
            var known = (await _context.IncomingPayments.IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId && mpIds.Contains(i.MpPaymentId))
                .Select(i => i.MpPaymentId).ToListAsync()).ToHashSet();

            // Cobros que el sistema ya registró por otro camino (checkout de MP del turno, link de pago).
            var loadedIds = (await _context.Payments.IgnoreQueryFilters()
                .Where(p => p.TenantId == tenantId && p.MercadoPagoPaymentId != null && mpIds.Contains(p.MercadoPagoPaymentId))
                .Select(p => p.MercadoPagoPaymentId!).ToListAsync()).ToHashSet();
            var loadedTx = (await _context.Set<PaymentTransaction>()
                .Where(p => p.TenantId == tenantId && p.MercadoPagoPaymentId != null && mpIds.Contains(p.MercadoPagoPaymentId))
                .Select(p => p.MercadoPagoPaymentId!).ToListAsync()).ToHashSet();
            loadedIds.UnionWith(loadedTx);

            var mappings = await _context.PayerCustomerMappings.IgnoreQueryFilters()
                .Where(m => m.TenantId == tenantId)
                .ToDictionaryAsync(m => m.PayerKey, m => m.CustomerId);

            const string by = "Detección automática";
            foreach (var t in transfers.OrderBy(t => t.DateApproved))
            {
                if (string.IsNullOrEmpty(t.PaymentId) || known.Contains(t.PaymentId)) { result.AlreadyKnown++; continue; }
                known.Add(t.PaymentId);

                var incoming = NewIncoming(tenantId, t);

                if (loadedIds.Contains(t.PaymentId) || LooksLikeOwnCheckout(t.ExternalReference))
                {
                    incoming.Status = IncomingPaymentStatus.Ignored;
                    incoming.MatchType = loadedIds.Contains(t.PaymentId) ? "ya-cargado" : "checkout-propio";
                    incoming.ResolvedAt = DateTime.UtcNow;
                    incoming.ResolvedBy = by;
                    result.AlreadyLoaded++;
                    _context.IncomingPayments.Add(incoming);
                    continue;
                }

                var candidates = await LoadCandidatesAsync(tenantId, t.DateApproved);
                var match = Match(t, candidates, mappings);
                incoming.MatchType = match.MatchType;
                incoming.SuggestedBookingId = match.Suggested?.Id;
                incoming.CustomerId = match.CustomerId;

                if (match.Apply != null)
                {
                    if (await HasSimilarPaymentAsync(tenantId, match.Apply.Id, t.Amount, t.DateApproved))
                    {
                        incoming.MatchType = "posible-duplicado";
                        incoming.SuggestedBookingId = match.Apply.Id;
                        result.Pending++; result.PossibleDuplicates++;
                        _context.IncomingPayments.Add(incoming);
                        continue;
                    }

                    var payment = await ApplyToBookingAsync(tenantId, match.Apply, t.PaymentId, t.Amount, t.PayerName, t.PayerEmail, by);
                    incoming.BookingId = match.Apply.Id;
                    incoming.CustomerId = match.Apply.CustomerId;
                    incoming.PaymentId = payment.Id;
                    incoming.Status = IncomingPaymentStatus.Applied;
                    incoming.ResolvedAt = DateTime.UtcNow;
                    incoming.ResolvedBy = by;
                    result.Applied++; result.AppliedAmount += t.Amount;
                    _context.IncomingPayments.Add(incoming);
                    await _context.SaveChangesAsync();
                    await NotifyCustomerAsync(tenantId, match.Apply, t.Amount);
                    continue;
                }

                result.Pending++;
                _context.IncomingPayments.Add(incoming);
            }

            await _context.SaveChangesAsync();
            return result;
        }

        private static IncomingPayment NewIncoming(Guid tenantId, IncomingTransfer t) => new()
        {
            TenantId = tenantId,
            MpPaymentId = t.PaymentId,
            DateApproved = t.DateApproved,
            Amount = t.Amount,
            NetAmount = t.NetAmount,
            PayerDocument = Cap(t.PayerDocument, 30),
            PayerDni = Cap(t.PayerDni, 20),
            PayerId = Cap(t.PayerId, 50),
            PayerEmail = Cap(t.PayerEmail, 150),
            PayerName = Cap(t.PayerName, 150),
            PaymentMethodId = Cap(t.PaymentMethodId, 50),
            OperationType = Cap(t.OperationType, 50),
            Description = Cap(t.Description, 500),
            ExternalReference = Cap(t.ExternalReference, 200),
        };

        /// <summary>external_reference de cobros propios del sistema (add-ons, mensajes, suscripción, checkout de un turno por su Guid).</summary>
        private static bool LooksLikeOwnCheckout(string? externalReference)
        {
            if (string.IsNullOrWhiteSpace(externalReference)) return false;
            foreach (var prefix in new[] { "ADDON-", "MSG-", "SUB-", "PLAN-", "PREAPPROVAL-" })
                if (externalReference.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return true;
            return Regex.IsMatch(externalReference, @"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
        }

        // ---------------------------------------------------------------------------------
        // Matching cobro → turno
        // ---------------------------------------------------------------------------------

        private sealed class MatchOutcome
        {
            public Booking? Apply { get; set; }
            public Booking? Suggested { get; set; }
            public Guid? CustomerId { get; set; }
            public string MatchType { get; set; } = "ninguno";
        }

        /// <summary>
        /// La identidad sale, en orden, del mapeo aprendido de la cuenta pagadora, del DNI (que MP
        /// manda como CUIL) y del nombre exacto. Se aplica solo únicamente cuando la identidad deja
        /// UN turno cuya seña o saldo coincide con el monto; si no, queda pendiente con la mejor
        /// sugerencia. Sin identidad, coincidir sólo por monto es sugerencia, nunca se aplica.
        /// </summary>
        private static MatchOutcome Match(IncomingTransfer t, List<Booking> candidates, Dictionary<string, Guid> mappings)
        {
            var outcome = new MatchOutcome();
            if (candidates.Count == 0) return outcome;

            if (!string.IsNullOrEmpty(t.PayerKey) && mappings.TryGetValue(t.PayerKey, out var mappedCustomer))
            {
                var mine = candidates.Where(b => b.CustomerId == mappedCustomer).ToList();
                outcome.CustomerId = mappedCustomer;
                if (mine.Count > 0) return Decide(outcome, mine, t.Amount, "mapeo");
            }

            var payerKeys = DocumentKeys(t.PayerDocument).ToHashSet();
            if (payerKeys.Count > 0)
            {
                var byDni = candidates.Where(b => b.Customer?.Dni != null && DocumentKeys(b.Customer.Dni).Any(payerKeys.Contains)).ToList();
                var customers = byDni.Select(b => b.CustomerId).Distinct().ToList();
                if (customers.Count == 1) { outcome.CustomerId = customers[0]; return Decide(outcome, byDni, t.Amount, "dni"); }
                if (customers.Count > 1) { outcome.MatchType = "ambiguo"; outcome.Suggested = Nearest(byDni); return outcome; }
            }

            var payerName = Normalize(t.PayerName);
            if (!string.IsNullOrEmpty(payerName))
            {
                var byName = candidates.Where(b => Normalize(CustomerLabel(b)) == payerName).ToList();
                if (byName.Count > 0)
                {
                    outcome.CustomerId = byName.Select(b => b.CustomerId).Distinct().Count() == 1 ? byName[0].CustomerId : null;
                    return Decide(outcome, byName, t.Amount, "nombre");
                }
            }

            var byAmount = candidates.Where(b => AmountMatches(b, t.Amount)).ToList();
            if (byAmount.Count == 1) { outcome.MatchType = "monto"; outcome.Suggested = byAmount[0]; }
            else if (byAmount.Count > 1) { outcome.MatchType = "ambiguo"; outcome.Suggested = Nearest(byAmount); }
            return outcome;
        }

        private static MatchOutcome Decide(MatchOutcome outcome, List<Booking> identified, decimal amount, string matchType)
        {
            var exact = identified.Where(b => AmountMatches(b, amount)).ToList();
            if (exact.Count == 1) { outcome.Apply = exact[0]; outcome.Suggested = exact[0]; outcome.MatchType = matchType; return outcome; }
            outcome.Suggested = Nearest(exact.Count > 0 ? exact : identified);
            outcome.MatchType = exact.Count > 1 ? "ambiguo" : $"{matchType}-monto-distinto";
            return outcome;
        }

        private static Booking? Nearest(List<Booking> bookings)
        {
            var now = DateTime.UtcNow;
            return bookings.OrderBy(b => b.StartTime >= now ? 0 : 1).ThenBy(b => Math.Abs((b.StartTime - now).Ticks)).FirstOrDefault();
        }

        public static decimal TotalPrice(Booking b) => b.Price ?? b.Service?.Price ?? 0m;
        public static decimal AmountPaid(Booking b) => b.Payments.Where(p => p.Status == "completed").Sum(p => p.Amount);
        public static decimal Outstanding(Booking b) => Math.Max(0, TotalPrice(b) - AmountPaid(b));

        /// <summary>Seña del turno: la propia del turno, o la que define el servicio (porcentaje o monto fijo).</summary>
        public static decimal? DepositRequired(Booking b)
        {
            if (b.RequiresDeposit && b.DepositAmount is > 0) return b.DepositAmount;
            if (b.Service != null && b.Service.RequiresDeposit)
            {
                if (b.Service.DepositFixedAmount is > 0) return b.Service.DepositFixedAmount;
                if (b.Service.DepositPercentage is > 0) return Math.Round(TotalPrice(b) * b.Service.DepositPercentage.Value / 100m, 2);
            }
            return null;
        }

        public static decimal? DepositOutstanding(Booking b)
        {
            var required = DepositRequired(b);
            if (!required.HasValue) return null;
            var left = required.Value - AmountPaid(b);
            return left > 0 ? left : null;
        }

        public static bool AmountMatches(Booking b, decimal amount)
        {
            if (amount <= 0) return false;
            var outstanding = Outstanding(b);
            if (outstanding > 0 && Math.Abs(outstanding - amount) <= AmountTolerance) return true;
            var deposit = DepositOutstanding(b);
            if (deposit.HasValue && Math.Abs(deposit.Value - amount) <= AmountTolerance) return true;
            var total = TotalPrice(b);
            return total > 0 && outstanding > 0 && Math.Abs(total - amount) <= AmountTolerance;
        }

        private async Task<List<Booking>> LoadCandidatesAsync(Guid tenantId, DateTime around)
        {
            var at = around == default ? DateTime.UtcNow : around;
            var from = at.AddDays(-1);
            var to = at.AddDays(60);
            var list = await _context.Bookings.IgnoreQueryFilters()
                .Include(b => b.Customer).Include(b => b.Service).Include(b => b.Employee).Include(b => b.Payments)
                .Where(b => b.TenantId == tenantId
                    && (b.Status == "pending" || b.Status == "confirmed")
                    && b.StartTime >= from && b.StartTime <= to)
                .OrderBy(b => b.StartTime)
                .ToListAsync();
            return list.Where(b => TotalPrice(b) > 0 && Outstanding(b) > 0).ToList();
        }

        public async Task<List<BookingCandidate>> CandidatesAsync(Guid tenantId, IncomingPayment incoming)
        {
            var bookings = await LoadCandidatesAsync(tenantId, incoming.DateApproved);
            return bookings.Select(b => ToCandidate(b, incoming.Amount)).ToList();
        }

        public static BookingCandidate ToCandidate(Booking b, decimal amount) => new()
        {
            BookingId = b.Id,
            ServiceName = b.Service?.Name ?? "Turno",
            EmployeeName = b.Employee?.Name,
            StartTime = b.StartTime,
            EndTime = b.EndTime,
            CustomerName = CustomerLabel(b),
            CustomerPhone = b.Customer?.Phone,
            TotalPrice = TotalPrice(b),
            AmountPaid = AmountPaid(b),
            Outstanding = Outstanding(b),
            DepositRequired = DepositRequired(b),
            DepositOutstanding = DepositOutstanding(b),
            Status = b.Status,
            AmountMatches = AmountMatches(b, amount),
        };

        public static string? CustomerLabel(Booking b) =>
            b.Customer == null ? null : $"{b.Customer.FirstName} {b.Customer.LastName}".Trim();

        private async Task<bool> HasSimilarPaymentAsync(Guid tenantId, Guid bookingId, decimal amount, DateTime date)
        {
            var when = date == default ? DateTime.UtcNow : date;
            return await _context.Payments.IgnoreQueryFilters()
                .AnyAsync(p => p.TenantId == tenantId && p.BookingId == bookingId && p.Status == "completed"
                    && p.Amount == amount && p.PaymentDate >= when.AddDays(-3) && p.PaymentDate <= when.AddDays(3));
        }

        // ---------------------------------------------------------------------------------
        // Aplicar el cobro al turno
        // ---------------------------------------------------------------------------------

        private async Task<Payment> ApplyToBookingAsync(Guid tenantId, Booking booking, string mpPaymentId, decimal amount,
            string? payerName, string? payerEmail, string by)
        {
            var outstandingBefore = Outstanding(booking);
            var payment = new Payment
            {
                TenantId = tenantId,
                BookingId = booking.Id,
                CustomerId = booking.CustomerId,
                Amount = amount,
                PaymentMethod = "mercadopago",
                Status = "completed",
                MercadoPagoPaymentId = mpPaymentId,
                TransactionId = mpPaymentId,
                PayerName = Cap(payerName, 150),
                PayerEmail = Cap(payerEmail, 150),
                PaymentDate = DateTime.UtcNow,
                PaymentType = amount + AmountPaid(booking) >= TotalPrice(booking) - AmountTolerance ? (AmountPaid(booking) > 0 ? "balance" : "full") : "deposit",
                Notes = $"Transferencia detectada en Mercado Pago ({by})",
            };
            _context.Payments.Add(payment);
            booking.Payments.Add(payment);

            // Con la seña (o el total) cubierta, el turno pendiente de pago queda confirmado.
            var deposit = DepositRequired(booking);
            var covered = amount >= outstandingBefore - AmountTolerance || (deposit.HasValue && amount >= deposit.Value - AmountTolerance);
            if (booking.Status == "pending" && covered) booking.Status = "confirmed";
            booking.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return payment;
        }

        private async Task NotifyCustomerAsync(Guid tenantId, Booking booking, decimal amount)
        {
            var phone = Digits(booking.Customer?.Phone);
            if (phone.Length < 8) return;
            var connection = await _whatsApp.GetConnectionByTenantIdAsync(tenantId);
            if (connection == null || connection.Status != "open") return;

            var tenant = await _context.Tenants.FindAsync(tenantId);
            var paidInFull = Outstanding(booking) <= AmountTolerance;
            var msg = $"✅ ¡Listo! Vimos tu transferencia de {Money(amount)} en Mercado Pago.\n" +
                      (paidInFull ? "Tu turno quedó *pago por completo*" : "Tu *seña quedó acreditada*") +
                      $": {When(booking)} · {booking.Service?.Name ?? "turno"}.\n" +
                      (paidInFull ? "" : $"Saldo a pagar en el local: {Money(Outstanding(booking))}.\n") +
                      $"¡Te esperamos en {tenant?.BusinessName ?? "el local"}!";
            try { await _whatsApp.SendTextAsync(tenantId, phone, msg); }
            catch (Exception ex) { _logger.LogWarning(ex, "Detección de transferencias: no se pudo avisar por WhatsApp a {Phone}", phone); }
        }

        // ---------------------------------------------------------------------------------
        // Resolución manual
        // ---------------------------------------------------------------------------------

        public async Task<(bool Ok, string Message)> ResolveAsync(Guid tenantId, Guid incomingPaymentId, Guid bookingId, bool remember, string? by)
        {
            var incoming = await _context.IncomingPayments.IgnoreQueryFilters()
                .FirstOrDefaultAsync(i => i.Id == incomingPaymentId && i.TenantId == tenantId);
            if (incoming == null) return (false, "No se encontró el cobro.");
            if (incoming.Status != IncomingPaymentStatus.Pending) return (false, "Ese cobro ya estaba resuelto.");

            var booking = await _context.Bookings.IgnoreQueryFilters()
                .Include(b => b.Customer).Include(b => b.Service).Include(b => b.Employee).Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);
            if (booking == null) return (false, "No se encontró el turno.");
            if (booking.Status == "cancelled") return (false, "Ese turno está cancelado.");

            var payment = await ApplyToBookingAsync(tenantId, booking, incoming.MpPaymentId, incoming.Amount, incoming.PayerName, incoming.PayerEmail, by ?? "Admin");
            incoming.BookingId = booking.Id;
            incoming.CustomerId = booking.CustomerId;
            incoming.PaymentId = payment.Id;
            incoming.Status = IncomingPaymentStatus.Applied;
            incoming.MatchType = "manual";
            incoming.ResolvedAt = DateTime.UtcNow;
            incoming.ResolvedBy = by;

            var learned = false;
            var key = KeyOf(incoming);
            if (remember && key != null)
            {
                var existing = await _context.PayerCustomerMappings.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(m => m.TenantId == tenantId && m.PayerKey == key);
                if (existing == null)
                    _context.PayerCustomerMappings.Add(new PayerCustomerMapping
                    {
                        TenantId = tenantId, PayerKey = key, CustomerId = booking.CustomerId,
                        PayerLabel = Cap(incoming.PayerName ?? incoming.PayerEmail ?? incoming.PayerDocument, 150), CreatedBy = by,
                    });
                else existing.CustomerId = booking.CustomerId;
                learned = true;
            }

            await _context.SaveChangesAsync();
            await NotifyCustomerAsync(tenantId, booking, incoming.Amount);
            var who = CustomerLabel(booking) ?? "el cliente";
            return (true, learned ? $"Pago registrado. Los próximos pagos de esa cuenta van a ir solos a {who}." : "Pago registrado sobre el turno.");
        }

        public async Task<(bool Ok, string Message)> IgnoreAsync(Guid tenantId, Guid incomingPaymentId, string? by)
        {
            var incoming = await _context.IncomingPayments.IgnoreQueryFilters()
                .FirstOrDefaultAsync(i => i.Id == incomingPaymentId && i.TenantId == tenantId);
            if (incoming == null) return (false, "No se encontró el cobro.");
            if (incoming.Status != IncomingPaymentStatus.Pending) return (false, "Ese cobro ya estaba resuelto.");
            incoming.Status = IncomingPaymentStatus.Ignored;
            incoming.ResolvedAt = DateTime.UtcNow;
            incoming.ResolvedBy = by;
            await _context.SaveChangesAsync();
            return (true, "Cobro descartado.");
        }

        private static string? KeyOf(IncomingPayment i) =>
            !string.IsNullOrEmpty(i.PayerId) ? $"mp:{i.PayerId}" : !string.IsNullOrEmpty(i.PayerDocument) ? $"doc:{i.PayerDocument}" : null;

        // ---------------------------------------------------------------------------------
        // Comprobantes por WhatsApp
        // ---------------------------------------------------------------------------------

        public async Task RegisterReceiptAsync(Guid tenantId, string phone, string? contactName)
        {
            var recent = await _context.WhatsAppReceiptClaims.IgnoreQueryFilters()
                .AnyAsync(c => c.TenantId == tenantId && c.Phone == phone && c.Status == ReceiptClaimStatus.Pending && c.CreatedAt > DateTime.UtcNow.AddMinutes(-15));
            if (recent) return; // tres capturas del mismo comprobante son un solo reclamo

            var bookings = await BookingsByPhoneAsync(tenantId, phone);
            var booking = bookings.FirstOrDefault();
            var claim = new WhatsAppReceiptClaim { TenantId = tenantId, Phone = phone, ContactName = Cap(contactName, 100), BookingId = booking?.Id };
            _context.WhatsAppReceiptClaims.Add(claim);

            var ack = booking != null
                ? $"📎 ¡Gracias! Recibimos tu comprobante. Lo estamos verificando con Mercado Pago y en cuanto se acredite te confirmamos por acá el pago de tu turno del {When(booking)} ({booking.Service?.Name ?? "turno"}).\n_Suele tardar menos de un minuto._"
                : "📎 Recibimos tu comprobante, pero no encontramos un turno pendiente de pago con este número. Si reservaste con otro teléfono, escribinos el nombre con el que reservaste.";
            try
            {
                var sent = await _whatsApp.SendTextAsync(tenantId, phone, ack);
                claim.AckSent = sent.Success;
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Comprobante WhatsApp: no se pudo contestar a {Phone}", phone); }

            await _context.SaveChangesAsync();
            if (booking != null)
            {
                try { await ProcessReceiptClaimsAsync(tenantId); }
                catch (Exception ex) { _logger.LogWarning(ex, "Comprobante WhatsApp: falló el cruce inmediato del tenant {TenantId}", tenantId); }
            }
        }

        public async Task<int> ProcessReceiptClaimsAsync(Guid tenantId)
        {
            var now = DateTime.UtcNow;
            var claims = await _context.WhatsAppReceiptClaims.IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId && c.Status == ReceiptClaimStatus.Pending)
                .OrderBy(c => c.CreatedAt).ToListAsync();
            if (claims.Count == 0) return 0;

            foreach (var stale in claims.Where(c => c.CreatedAt < now.AddHours(-6))) { stale.Status = ReceiptClaimStatus.Expired; stale.ResolvedAt = now; }
            claims = claims.Where(c => c.Status == ReceiptClaimStatus.Pending).ToList();
            if (claims.Count == 0) { await _context.SaveChangesAsync(); return 0; }

            if (!await IsActiveAsync(tenantId)) { await _context.SaveChangesAsync(); return 0; }

            var earliest = claims.Min(c => c.CreatedAt).AddHours(-24);
            await ReconcileAsync(tenantId, earliest, now);

            var resolved = 0;
            var pendingIncoming = await _context.IncomingPayments.IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId && i.Status == IncomingPaymentStatus.Pending && i.DateApproved >= earliest)
                .OrderByDescending(i => i.DateApproved).ToListAsync();

            foreach (var claim in claims)
            {
                var bookings = await BookingsByPhoneAsync(tenantId, claim.Phone, includePaid: true);
                var primary = claim.BookingId.HasValue ? bookings.FirstOrDefault(b => b.Id == claim.BookingId.Value) : null;

                if (primary != null && primary.Payments.Any(p => p.Status == "completed" && p.PaymentDate >= claim.CreatedAt.AddMinutes(-30)))
                {
                    claim.Status = ReceiptClaimStatus.Matched; claim.ResolvedAt = now; resolved++; continue;
                }

                var open = bookings.Where(b => Outstanding(b) > 0).ToList();
                if (open.Count == 0) continue;

                var pairs = pendingIncoming.SelectMany(i => open.Where(b => AmountMatches(b, i.Amount)).Select(b => (Incoming: i, Booking: b))).ToList();
                if (pairs.Count == 0) continue;

                var pick = pairs.FirstOrDefault(p => primary != null && p.Booking.Id == primary.Id);
                if (pick.Incoming == null)
                {
                    if (pairs.Select(p => p.Incoming.Id).Distinct().Count() != 1) continue;
                    pick = pairs[0];
                }

                var payment = await ApplyToBookingAsync(tenantId, pick.Booking, pick.Incoming.MpPaymentId, pick.Incoming.Amount, pick.Incoming.PayerName, pick.Incoming.PayerEmail, "Comprobante por WhatsApp");
                pick.Incoming.BookingId = pick.Booking.Id;
                pick.Incoming.CustomerId = pick.Booking.CustomerId;
                pick.Incoming.PaymentId = payment.Id;
                pick.Incoming.Status = IncomingPaymentStatus.Applied;
                pick.Incoming.MatchType = "comprobante";
                pick.Incoming.ResolvedAt = now;
                pick.Incoming.ResolvedBy = "Comprobante por WhatsApp";
                pendingIncoming.Remove(pick.Incoming);

                claim.Status = ReceiptClaimStatus.Matched; claim.IncomingPaymentId = pick.Incoming.Id; claim.ResolvedAt = now;
                resolved++;
                await _context.SaveChangesAsync();
                await NotifyCustomerAsync(tenantId, pick.Booking, pick.Incoming.Amount);
            }

            await _context.SaveChangesAsync();
            return resolved;
        }

        private async Task<List<Booking>> BookingsByPhoneAsync(Guid tenantId, string phone, bool includePaid = false)
        {
            var key = Digits(phone);
            if (key.Length < 8) return new List<Booking>();
            var now = DateTime.UtcNow;
            var list = await _context.Bookings.IgnoreQueryFilters()
                .Include(b => b.Customer).Include(b => b.Service).Include(b => b.Employee).Include(b => b.Payments)
                .Where(b => b.TenantId == tenantId && (b.Status == "pending" || b.Status == "confirmed")
                    && b.StartTime >= now.AddDays(-1) && b.StartTime <= now.AddDays(60))
                .OrderBy(b => b.StartTime).ToListAsync();
            return list.Where(b => TotalPrice(b) > 0 && (includePaid || Outstanding(b) > 0) && SamePhone(b.Customer?.Phone, key)).ToList();
        }

        private static string Digits(string? s) => new string((s ?? "").Where(char.IsDigit).ToArray());

        /// <summary>Compara por los últimos 8 dígitos: absorbe 54 / 549 / 0 / 15.</summary>
        private static bool SamePhone(string? a, string b)
        {
            var da = Digits(a); var db = Digits(b);
            return da.Length >= 8 && db.Length >= 8 && da[^8..] == db[^8..];
        }

        // ---------------------------------------------------------------------------------
        // Mercado Pago
        // ---------------------------------------------------------------------------------

        private async Task<(List<IncomingTransfer> Transfers, string? Error)> FetchIncomingAsync(string token, string? collectorId, DateTime from, DateTime to)
        {
            var all = new List<IncomingTransfer>();
            var http = _httpClientFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(30);
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

            foreach (var operationType in new[] { "money_transfer", "regular_payment" })
            {
                var offset = 0; const int limit = 50;
                while (true)
                {
                    var url = $"{BaseUrl}/v1/payments/search?range=date_approved&begin_date={Uri.EscapeDataString(IsoDate(from))}&end_date={Uri.EscapeDataString(IsoDate(to))}" +
                              $"&status=approved&operation_type={operationType}&sort=date_approved&criteria=desc&limit={limit}&offset={offset}";
                    string json;
                    try
                    {
                        var response = await http.GetAsync(url);
                        json = await response.Content.ReadAsStringAsync();
                        if (!response.IsSuccessStatusCode)
                        {
                            _logger.LogWarning("payments/search devolvió {Status}: {Body}", response.StatusCode, Truncate(json, 500));
                            return (all, $"Mercado Pago respondió {(int)response.StatusCode}: {Truncate(json, 200)}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error consultando payments/search");
                        return (all, $"No se pudo consultar Mercado Pago: {ex.Message}");
                    }

                    var doc = JsonSerializer.Deserialize<JsonElement>(json);
                    if (!doc.TryGetProperty("results", out var results) || results.ValueKind != JsonValueKind.Array) break;
                    var count = results.GetArrayLength();
                    if (count == 0) break;
                    foreach (var item in results.EnumerateArray())
                    {
                        var t = Parse(item, operationType);
                        // payments/search devuelve las dos direcciones: lo cobrado y lo gastado con la misma cuenta.
                        if (!string.IsNullOrEmpty(collectorId) && !string.IsNullOrEmpty(t.CollectorId) && t.CollectorId != collectorId) continue;
                        all.Add(t);
                    }
                    if (count < limit) break;
                    offset += limit;
                    if (offset >= 1000) break;
                }
            }
            return (all, null);
        }

        private static IncomingTransfer Parse(JsonElement p, string operationType)
        {
            var t = new IncomingTransfer
            {
                OperationType = operationType,
                PaymentId = Str(p, "id") ?? "",
                Amount = Dec(p, "transaction_amount"),
                PaymentMethodId = Str(p, "payment_method_id") ?? "",
                Description = Str(p, "description"),
                ExternalReference = Str(p, "external_reference"),
                CollectorId = Str(p, "collector_id"),
            };
            if (string.IsNullOrEmpty(t.CollectorId) && p.TryGetProperty("collector", out var collector) && collector.ValueKind == JsonValueKind.Object)
                t.CollectorId = Str(collector, "id");
            if (p.TryGetProperty("date_approved", out var da) && da.ValueKind == JsonValueKind.String &&
                DateTime.TryParse(da.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
                t.DateApproved = parsed;
            if (p.TryGetProperty("transaction_details", out var td) && td.ValueKind == JsonValueKind.Object)
                t.NetAmount = Dec(td, "net_received_amount");
            if (p.TryGetProperty("payer", out var payer) && payer.ValueKind == JsonValueKind.Object)
            {
                t.PayerEmail = Str(payer, "email");
                t.PayerId = Str(payer, "id");
                t.PayerName = string.Join(" ", new[] { Str(payer, "first_name"), Str(payer, "last_name") }.Where(s => !string.IsNullOrWhiteSpace(s)));
                if (payer.TryGetProperty("identification", out var ident) && ident.ValueKind == JsonValueKind.Object)
                    t.PayerDocument = Digits(Str(ident, "number"));
            }
            t.PayerDni = DocumentKeys(t.PayerDocument).LastOrDefault();
            return t;
        }

        private static string IsoDate(DateTime utc) =>
            DateTime.SpecifyKind(utc, DateTimeKind.Utc).AddHours(-3).ToString("yyyy-MM-dd'T'HH:mm:ss.fff", CultureInfo.InvariantCulture) + "-03:00";

        private static string? Str(JsonElement e, string prop) =>
            e.ValueKind == JsonValueKind.Object && e.TryGetProperty(prop, out var v)
                ? v.ValueKind switch { JsonValueKind.String => v.GetString(), JsonValueKind.Number => v.ToString(), _ => null } : null;

        private static decimal Dec(JsonElement e, string prop) =>
            e.ValueKind == JsonValueKind.Object && e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDecimal() : 0m;

        /// <summary>CUIL/CUIT = prefijo(2) + DNI(8) + verificador(1): devuelve el número tal cual y el DNI que tiene adentro.</summary>
        public static IEnumerable<string> DocumentKeys(string? raw)
        {
            var digits = Digits(raw);
            if (string.IsNullOrEmpty(digits)) yield break;
            var plain = digits.TrimStart('0');
            if (plain.Length >= 6) yield return plain;
            if (digits.Length == 11)
            {
                var inner = digits.Substring(2, 8).TrimStart('0');
                if (inner.Length >= 6 && inner != plain) yield return inner;
            }
        }

        public static string Normalize(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var decomposed = s.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
                if (char.IsLetterOrDigit(c) || char.IsWhiteSpace(c)) sb.Append(c);
            }
            return string.Join(" ", sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries).OrderBy(w => w));
        }

        private static string? Cap(string? s, int max) => string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);
        private static string Truncate(string s, int max) => string.IsNullOrEmpty(s) || s.Length <= max ? s : s[..max] + "…";
        private static string Money(decimal amount) => "$" + amount.ToString("N0", new CultureInfo("es-AR"));

        public static string When(Booking b)
        {
            var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(b.StartTime, DateTimeKind.Utc), ArgentinaTz);
            var culture = new CultureInfo("es-AR");
            return $"{culture.TextInfo.ToTitleCase(local.ToString("dddd d/M", culture))} a las {local:HH:mm}";
        }

        private static TimeZoneInfo ResolveTz()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires"); }
            catch { return TimeZoneInfo.CreateCustomTimeZone("ART", TimeSpan.FromHours(-3), "ART", "ART"); }
        }

        private sealed class IncomingTransfer
        {
            public string PaymentId { get; set; } = "";
            public DateTime DateApproved { get; set; }
            public decimal Amount { get; set; }
            public decimal NetAmount { get; set; }
            public string OperationType { get; set; } = "";
            public string PaymentMethodId { get; set; } = "";
            public string? Description { get; set; }
            public string? ExternalReference { get; set; }
            public string? CollectorId { get; set; }
            public string? PayerName { get; set; }
            public string? PayerEmail { get; set; }
            public string? PayerId { get; set; }
            public string? PayerDocument { get; set; }
            public string? PayerDni { get; set; }
            public string PayerKey => !string.IsNullOrEmpty(PayerId) ? $"mp:{PayerId}" : !string.IsNullOrEmpty(PayerDocument) ? $"doc:{PayerDocument}" : "";
        }
    }
}
