using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Enums;
using BookingPro.API.Utilities;
using Microsoft.EntityFrameworkCore;
using StripeSdk = Stripe;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Señas de los negocios de España con Stripe Connect (cuentas Express). La seña es un direct charge:
    /// el Checkout se crea EN la cuenta del negocio (Stripe-Account), así el negocio es el comercio, cobra en
    /// EUR en su cuenta y los reembolsos/disputas salen de su saldo, igual que con su Mercado Pago en
    /// Argentina. Hoy no hay comisión de la plataforma (como en Mercado Pago); se puede activar con
    /// Stripe:Connect:ApplicationFeePercent.
    /// </summary>
    public interface IStripeConnectService
    {
        bool IsConfigured { get; }
        Task<ServiceResult<StripeConnectStatus>> GetStatusAsync(Guid tenantId, bool refreshFromStripe);
        Task<ServiceResult<string>> CreateOnboardingLinkAsync(Guid tenantId, string tenantBaseUrl);
        Task<ServiceResult<string>> CreateDashboardLinkAsync(Guid tenantId);
        Task<ServiceResult<bool>> DisconnectAsync(Guid tenantId);

        /// <summary>True si el negocio cobra señas con Stripe (España y cuenta habilitada para cobrar).</summary>
        Task<bool> CanChargeDepositsAsync(Guid tenantId);

        Task<ServiceResult<StripeDepositCheckout>> CreateDepositCheckoutAsync(Guid tenantId, Guid bookingId, decimal amount, string? customerEmail);

        /// <summary>Webhook de Connect (eventos de las cuentas conectadas: account.updated y los Checkout de señas).</summary>
        Task HandleConnectEventAsync(StripeSdk.Event stripeEvent);
    }

    public class StripeConnectStatus
    {
        public bool Available { get; set; }
        public bool Connected { get; set; }
        public string? AccountId { get; set; }
        public bool ChargesEnabled { get; set; }
        public bool DetailsSubmitted { get; set; }
        public bool PayoutsEnabled { get; set; }
        public string? Email { get; set; }
    }

    public class StripeDepositCheckout
    {
        public string Url { get; set; } = string.Empty;
        public string SessionId { get; set; } = string.Empty;
        public Guid TransactionId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "EUR";
    }

    public class StripeConnectService : IStripeConnectService
    {
        public const string Provider = "stripe";

        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StripeConnectService> _logger;

        public StripeConnectService(ApplicationDbContext context, IConfiguration configuration, ILogger<StripeConnectService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(_configuration["Stripe:SecretKey"]);

        private StripeSdk.IStripeClient Client()
        {
            var key = _configuration["Stripe:SecretKey"];
            if (string.IsNullOrWhiteSpace(key)) throw new InvalidOperationException("Stripe:SecretKey no configurada");
            return new StripeSdk.StripeClient(key);
        }

        private async Task<Tenant?> LoadTenantAsync(Guid tenantId) =>
            await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);

        public async Task<ServiceResult<StripeConnectStatus>> GetStatusAsync(Guid tenantId, bool refreshFromStripe)
        {
            var tenant = await LoadTenantAsync(tenantId);
            if (tenant == null) return ServiceResult<StripeConnectStatus>.Fail("Negocio no encontrado");

            var available = CountryProfile.For(tenant).StripeDeposits && IsConfigured;
            string? email = null;
            if (refreshFromStripe && available && !string.IsNullOrEmpty(tenant.StripeConnectAccountId))
            {
                try
                {
                    var account = await new StripeSdk.AccountService(Client()).GetAsync(tenant.StripeConnectAccountId);
                    ApplyAccount(tenant, account);
                    email = account.Email;
                    await _context.SaveChangesAsync();
                }
                catch (StripeSdk.StripeException ex)
                {
                    _logger.LogWarning(ex, "Stripe Connect: no se pudo leer la cuenta {AccountId}", tenant.StripeConnectAccountId);
                }
            }

            return ServiceResult<StripeConnectStatus>.Ok(new StripeConnectStatus
            {
                Available = available,
                Connected = !string.IsNullOrEmpty(tenant.StripeConnectAccountId),
                AccountId = tenant.StripeConnectAccountId,
                ChargesEnabled = tenant.StripeConnectChargesEnabled,
                DetailsSubmitted = tenant.StripeConnectDetailsSubmitted,
                PayoutsEnabled = tenant.StripeConnectPayoutsEnabled,
                Email = email,
            });
        }

        public async Task<ServiceResult<string>> CreateOnboardingLinkAsync(Guid tenantId, string tenantBaseUrl)
        {
            try
            {
                var tenant = await LoadTenantAsync(tenantId);
                if (tenant == null) return ServiceResult<string>.Fail("Negocio no encontrado");
                var profile = CountryProfile.For(tenant);
                if (!profile.StripeDeposits) return ServiceResult<string>.Fail("Los cobros con Stripe no están disponibles para negocios de este país.");
                if (!IsConfigured) return ServiceResult<string>.Fail("Los cobros con Stripe todavía no están habilitados. Escribinos y lo activamos.");

                var client = Client();
                if (string.IsNullOrEmpty(tenant.StripeConnectAccountId))
                {
                    var account = await new StripeSdk.AccountService(client).CreateAsync(new StripeSdk.AccountCreateOptions
                    {
                        Type = "express",
                        Country = profile.Code,
                        Email = tenant.OwnerEmail,
                        DefaultCurrency = profile.Currency.ToLowerInvariant(),
                        BusinessProfile = new StripeSdk.AccountBusinessProfileOptions
                        {
                            Name = tenant.BusinessName,
                            Url = string.IsNullOrEmpty(tenant.Subdomain) ? null : $"https://{tenant.Subdomain}.turnos-pro.com",
                        },
                        Capabilities = new StripeSdk.AccountCapabilitiesOptions
                        {
                            CardPayments = new StripeSdk.AccountCapabilitiesCardPaymentsOptions { Requested = true },
                            Transfers = new StripeSdk.AccountCapabilitiesTransfersOptions { Requested = true },
                        },
                        Metadata = StripeBillingService.AppMetadata(
                            ("tenant_id", tenant.Id.ToString()),
                            ("subdomain", tenant.Subdomain ?? string.Empty)),
                    });
                    tenant.StripeConnectAccountId = account.Id;
                    ApplyAccount(tenant, account);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Stripe Connect: cuenta Express {AccountId} creada para tenant {TenantId}", account.Id, tenantId);
                }

                var link = await new StripeSdk.AccountLinkService(client).CreateAsync(new StripeSdk.AccountLinkCreateOptions
                {
                    Account = tenant.StripeConnectAccountId,
                    RefreshUrl = $"{tenantBaseUrl}/stripe-settings?stripe=refresh",
                    ReturnUrl = $"{tenantBaseUrl}/stripe-settings?stripe=return",
                    Type = "account_onboarding",
                });
                return ServiceResult<string>.Ok(link.Url);
            }
            catch (StripeSdk.StripeException ex)
            {
                _logger.LogError(ex, "Stripe Connect: error creando el onboarding de tenant {TenantId}", tenantId);
                return ServiceResult<string>.Fail("No pudimos iniciar la conexión con Stripe. Probá de nuevo en unos minutos.");
            }
        }

        public async Task<ServiceResult<string>> CreateDashboardLinkAsync(Guid tenantId)
        {
            var tenant = await LoadTenantAsync(tenantId);
            if (tenant == null || string.IsNullOrEmpty(tenant.StripeConnectAccountId))
                return ServiceResult<string>.Fail("Stripe no está conectado");
            try
            {
                var login = await new StripeSdk.AccountLoginLinkService(Client()).CreateAsync(tenant.StripeConnectAccountId);
                return ServiceResult<string>.Ok(login.Url);
            }
            catch (StripeSdk.StripeException ex)
            {
                _logger.LogWarning(ex, "Stripe Connect: no se pudo crear el login link de {AccountId}", tenant.StripeConnectAccountId);
                return ServiceResult<string>.Fail("Terminá primero la configuración de tu cuenta de Stripe.");
            }
        }

        public async Task<ServiceResult<bool>> DisconnectAsync(Guid tenantId)
        {
            var tenant = await LoadTenantAsync(tenantId);
            if (tenant == null) return ServiceResult<bool>.Fail("Negocio no encontrado");
            // Solo se desvincula de TurnosPro: la cuenta Express (y su saldo) sigue siendo del negocio en Stripe.
            tenant.StripeConnectAccountId = null;
            tenant.StripeConnectChargesEnabled = false;
            tenant.StripeConnectDetailsSubmitted = false;
            tenant.StripeConnectPayoutsEnabled = false;
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return ServiceResult<bool>.Ok(true);
        }

        public async Task<bool> CanChargeDepositsAsync(Guid tenantId)
        {
            if (!IsConfigured) return false;
            var tenant = await _context.Tenants.IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.Id == tenantId)
                .Select(t => new { t.Country, t.StripeConnectAccountId, t.StripeConnectChargesEnabled })
                .FirstOrDefaultAsync();
            return tenant != null && CountryProfile.Get(tenant.Country).StripeDeposits
                && !string.IsNullOrEmpty(tenant.StripeConnectAccountId) && tenant.StripeConnectChargesEnabled;
        }

        private static void ApplyAccount(Tenant tenant, StripeSdk.Account account)
        {
            tenant.StripeConnectChargesEnabled = account.ChargesEnabled;
            tenant.StripeConnectDetailsSubmitted = account.DetailsSubmitted;
            tenant.StripeConnectPayoutsEnabled = account.PayoutsEnabled;
            tenant.UpdatedAt = DateTime.UtcNow;
        }

        // ───────────────────────── Seña ─────────────────────────

        public async Task<ServiceResult<StripeDepositCheckout>> CreateDepositCheckoutAsync(Guid tenantId, Guid bookingId, decimal amount, string? customerEmail)
        {
            try
            {
                var tenant = await LoadTenantAsync(tenantId);
                if (tenant == null) return ServiceResult<StripeDepositCheckout>.Fail("Negocio no encontrado");
                if (string.IsNullOrEmpty(tenant.StripeConnectAccountId) || !tenant.StripeConnectChargesEnabled || !IsConfigured)
                    return ServiceResult<StripeDepositCheckout>.Fail("El negocio todavía no habilitó el cobro de señas online. Contactá al comercio.");

                var booking = await _context.Bookings.IgnoreQueryFilters()
                    .Include(b => b.Service)
                    .Include(b => b.Customer)
                    .FirstOrDefaultAsync(b => b.Id == bookingId && b.TenantId == tenantId);
                if (booking == null) return ServiceResult<StripeDepositCheckout>.Fail("Reserva no encontrada");

                var currency = CountryProfile.CurrencyFor(tenant);
                var amountToPay = Math.Min(amount, booking.Service.Price);
                if (amountToPay < 0.5m) amountToPay = 0.5m; // mínimo de Stripe en EUR

                var local = TenantTime.ToLocal(booking.StartTime, TenantTime.For(tenant));
                var frontend = (_configuration["FrontendUrl"] ?? _configuration["BaseUrl"] ?? string.Empty).TrimEnd('/');

                var transaction = new PaymentTransaction
                {
                    TenantId = tenantId,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Provider = Provider,
                    Amount = amountToPay,
                    Currency = currency,
                    Status = PaymentTransactionStatus.Pending,
                    PaymentType = "deposit",
                    Description = $"Pago por {booking.Service.Name}",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        ServiceName = booking.Service.Name,
                        BookingDate = booking.StartTime,
                        CustomerName = $"{booking.Customer?.FirstName} {booking.Customer?.LastName}".Trim(),
                        Origin = "web",
                    }),
                };

                var metadata = StripeBillingService.AppMetadata(
                    (StripeBillingService.MetaKind, StripeBillingService.KindDeposit),
                    ("tenant_id", tenantId.ToString()),
                    ("booking_id", booking.Id.ToString()),
                    ("transaction_id", transaction.Id.ToString()));

                var paymentIntentData = new StripeSdk.Checkout.SessionPaymentIntentDataOptions
                {
                    Metadata = metadata,
                    Description = $"Seña — {booking.Service.Name} ({local:dd/MM/yyyy HH:mm})",
                };
                var feePercent = _configuration.GetValue<decimal?>("Stripe:Connect:ApplicationFeePercent") ?? 0m;
                if (feePercent > 0)
                    paymentIntentData.ApplicationFeeAmount = PlatformPricing.ToStripeAmount(Math.Round(amountToPay * feePercent / 100m, 2));

                var options = new StripeSdk.Checkout.SessionCreateOptions
                {
                    Mode = "payment",
                    // endive: payment_method_types no existe más en Checkout; esto filtra los elegibles de la cuenta.
                    AllowedPaymentMethodTypes = new List<string> { "card" },
                    LineItems = new List<StripeSdk.Checkout.SessionLineItemOptions>
                    {
                        new()
                        {
                            Quantity = 1,
                            PriceData = new StripeSdk.Checkout.SessionLineItemPriceDataOptions
                            {
                                Currency = currency.ToLowerInvariant(),
                                UnitAmount = PlatformPricing.ToStripeAmount(amountToPay),
                                ProductData = new StripeSdk.Checkout.SessionLineItemPriceDataProductDataOptions
                                {
                                    Name = $"Seña — {booking.Service.Name}",
                                    Description = $"Reserva para {local:dd/MM/yyyy HH:mm}",
                                },
                            },
                        },
                    },
                    CustomerEmail = string.IsNullOrWhiteSpace(booking.Customer?.Email) ? customerEmail : booking.Customer!.Email,
                    ClientReferenceId = booking.Id.ToString(),
                    PaymentIntentData = paymentIntentData,
                    Metadata = metadata,
                    // Mismas vueltas que el checkout de Mercado Pago.
                    SuccessUrl = $"{frontend}/booking-confirmation?status=success&bookingId={booking.Id}",
                    CancelUrl = $"{frontend}/booking-confirmation?status=failure&bookingId={booking.Id}",
                    ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                    Locale = "es",
                };

                var session = await new StripeSdk.Checkout.SessionService(Client()).CreateAsync(options,
                    new StripeSdk.RequestOptions { StripeAccount = tenant.StripeConnectAccountId });

                transaction.StripeCheckoutSessionId = session.Id;
                _context.Set<PaymentTransaction>().Add(transaction);
                await _context.SaveChangesAsync();

                return ServiceResult<StripeDepositCheckout>.Ok(new StripeDepositCheckout
                {
                    Url = session.Url,
                    SessionId = session.Id,
                    TransactionId = transaction.Id,
                    Amount = amountToPay,
                    Currency = currency,
                });
            }
            catch (StripeSdk.StripeException ex)
            {
                _logger.LogError(ex, "Stripe Connect: error creando el Checkout de seña del turno {BookingId}", bookingId);
                return ServiceResult<StripeDepositCheckout>.Fail("No se pudo iniciar el pago de la seña. Intentá nuevamente o contactá al comercio.");
            }
        }

        public async Task HandleConnectEventAsync(StripeSdk.Event stripeEvent)
        {
            switch (stripeEvent.Type)
            {
                case "account.updated":
                {
                    if (stripeEvent.Data.Object is not StripeSdk.Account account || string.IsNullOrEmpty(account.Id)) return;
                    // Solo cuentas conectadas de negocios de TurnosPro (GymHero y PlayCrew comparten la plataforma).
                    var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.StripeConnectAccountId == account.Id);
                    if (tenant == null)
                    {
                        _logger.LogInformation("Stripe Connect: evento {EventId} de la cuenta {AccountId}, que no es de TurnosPro, ignorado", stripeEvent.Id, account.Id);
                        return;
                    }
                    ApplyAccount(tenant, account);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Stripe Connect: cuenta {AccountId} de tenant {TenantId} charges_enabled={Charges}",
                        account.Id, tenant.Id, account.ChargesEnabled);
                    break;
                }
                case "checkout.session.completed":
                case "checkout.session.async_payment_succeeded":
                {
                    if (stripeEvent.Data.Object is not StripeSdk.Checkout.Session session) return;
                    if (!IsTurnosProSession(stripeEvent, session)) return;
                    if (!session.Metadata.TryGetValue(StripeBillingService.MetaKind, out var kind) || kind != StripeBillingService.KindDeposit) return;
                    await ConfirmDepositAsync(session, stripeEvent.Account);
                    break;
                }
                case "checkout.session.expired":
                case "checkout.session.async_payment_failed":
                {
                    if (stripeEvent.Data.Object is not StripeSdk.Checkout.Session session) return;
                    if (!IsTurnosProSession(stripeEvent, session)) return;
                    var tx = await _context.Set<PaymentTransaction>().IgnoreQueryFilters()
                        .FirstOrDefaultAsync(t => t.StripeCheckoutSessionId == session.Id);
                    if (tx != null && tx.Status == PaymentTransactionStatus.Pending)
                    {
                        tx.Status = stripeEvent.Type == "checkout.session.expired" ? PaymentTransactionStatus.Cancelled : PaymentTransactionStatus.Rejected;
                        tx.ProcessorResponseCode = stripeEvent.Type;
                        tx.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                    break;
                }
                default:
                    _logger.LogDebug("Stripe Connect: evento {Type} ignorado", stripeEvent.Type);
                    break;
            }
        }

        private bool IsTurnosProSession(StripeSdk.Event stripeEvent, StripeSdk.Checkout.Session session)
        {
            if (StripeBillingService.IsTurnosPro(session.Metadata)) return true;
            _logger.LogInformation("Stripe Connect: evento {EventId} ({Type}) de la cuenta {AccountId} de otra app, ignorado",
                stripeEvent.Id, stripeEvent.Type, stripeEvent.Account);
            return false;
        }

        /// <summary>Mismo camino que el webhook de seña de Mercado Pago: transacción aprobada, turno confirmado, cobro registrado y aviso.</summary>
        private async Task ConfirmDepositAsync(StripeSdk.Checkout.Session session, string? accountId)
        {
            var tx = await _context.Set<PaymentTransaction>().IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.StripeCheckoutSessionId == session.Id);
            if (tx == null)
            {
                _logger.LogWarning("Stripe Connect: Checkout de seña {SessionId} sin transacción", session.Id);
                return;
            }

            // La cuenta del evento tiene que ser la del negocio dueño del turno.
            var tenantAccount = await _context.Tenants.IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.Id == tx.TenantId).Select(t => t.StripeConnectAccountId).FirstOrDefaultAsync();
            if (!string.IsNullOrEmpty(accountId) && !string.Equals(accountId, tenantAccount, StringComparison.Ordinal))
            {
                _logger.LogWarning("Stripe Connect: Checkout {SessionId} llegó de la cuenta {AccountId} y el negocio tiene {TenantAccount}", session.Id, accountId, tenantAccount);
                return;
            }

            var paid = string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase);
            var wasApproved = tx.Status == PaymentTransactionStatus.Approved;
            tx.StripePaymentIntentId = session.PaymentIntentId;
            tx.Status = paid ? PaymentTransactionStatus.Approved : PaymentTransactionStatus.Processing;
            tx.PaymentMethod = "card";
            tx.ProcessedAt = DateTime.UtcNow;
            tx.ProcessorResponseCode = session.PaymentStatus;
            tx.UpdatedAt = DateTime.UtcNow;

            if (paid)
            {
                await DepositConfirmation.ConfirmBookingAsync(_context, tx.TenantId, tx.BookingId,
                    new DepositConfirmation.PaidDeposit(
                        Provider: Provider,
                        ExternalPaymentId: session.PaymentIntentId ?? session.Id,
                        MercadoPagoPreferenceId: null,
                        Amount: session.AmountTotal.HasValue ? PlatformPricing.FromStripeAmount(session.AmountTotal) : tx.Amount,
                        PayerEmail: session.CustomerDetails?.Email ?? session.CustomerEmail,
                        PaidAt: DateTime.UtcNow,
                        PaymentType: string.IsNullOrEmpty(tx.PaymentType) ? "deposit" : tx.PaymentType,
                        Notes: "Cobrado con Stripe (seña de la reserva online)"));
            }

            await _context.SaveChangesAsync();

            if (paid && !wasApproved)
                PushDispatch.BookingEvent(tx.TenantId, tx.BookingId, "paid");
        }
    }
}
