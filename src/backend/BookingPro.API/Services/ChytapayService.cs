using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Enums;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Creates Chytapay payment requests on behalf of tenants. Companion to
    /// MercadoPagoService — the booking flow can pick either provider based on
    /// the tenant's preferences.
    ///
    /// Chytapay returns a CVU (Argentine bank account number) that the
    /// customer transfers to. Chytapay itself sends WhatsApp/email notifications
    /// to the customer with the CVU when sendWhatsappNotification /
    /// sendEmailNotification are true.
    /// </summary>
    public class ChytapayService : IChytapayService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ChytapayService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IChytapayOAuthService _oauthService;
        private readonly HttpClient _httpClient;

        public ChytapayService(
            ApplicationDbContext context,
            ILogger<ChytapayService> logger,
            IConfiguration configuration,
            IChytapayOAuthService oauthService,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _oauthService = oauthService;
            _httpClient = httpClientFactory.CreateClient();
        }

        private string IntegrationApiUrl =>
            (_configuration["Chytapay:IntegrationApiUrl"] ?? string.Empty).TrimEnd('/');

        public async Task<ServiceResult<ChytapayPaymentRequestResultDto>> CreatePaymentRequestAsync(
            string tenantId, CreateChytapayPaymentRequestDto dto)
        {
            try
            {
                if (!Guid.TryParse(tenantId, out var tenantGuid))
                {
                    return ServiceResult<ChytapayPaymentRequestResultDto>.Fail("Invalid tenantId");
                }

                var booking = await _context.Bookings
                    .Include(b => b.Service)
                    .Include(b => b.Customer)
                    .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.TenantId == tenantGuid);

                if (booking == null)
                {
                    return ServiceResult<ChytapayPaymentRequestResultDto>.Fail("Reserva no encontrada");
                }

                var tokenResult = await _oauthService.GetValidAccessTokenAsync(tenantGuid);
                if (!tokenResult.Success || string.IsNullOrEmpty(tokenResult.Data))
                {
                    return ServiceResult<ChytapayPaymentRequestResultDto>.Fail(
                        "Chytapay no está conectado. Conectá la cuenta en Configuración.");
                }

                // Amount: explicit override → otherwise full service price.
                // (Deposit-vs-full logic is left to the caller — for parity with
                // the MP flow we can layer it in later if needed.)
                var amount = dto.Amount.HasValue && dto.Amount.Value > 0
                    ? Math.Min(dto.Amount.Value, booking.Service.Price)
                    : booking.Service.Price;

                if (amount < 1)
                {
                    return ServiceResult<ChytapayPaymentRequestResultDto>.Fail("El monto debe ser mayor a $1");
                }

                // Persist the transaction up-front so we have its Id to use as
                // referenceId. Chytapay's webhook only ships referenceId — we
                // rely on it (a GUID, globally unique) to look up the tenant.
                var transaction = new PaymentTransaction
                {
                    TenantId = tenantGuid,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    Amount = amount,
                    Currency = "ARS",
                    Status = PaymentTransactionStatus.Pending,
                    PaymentType = dto.Amount.HasValue && dto.Amount.Value < booking.Service.Price ? "deposit" : "full",
                    PaymentMethod = "chytapay",
                    Description = dto.Description ?? $"Pago por {booking.Service.Name}",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        ServiceName = booking.Service.Name,
                        BookingDate = booking.StartTime,
                        CustomerName = $"{booking.Customer?.FirstName} {booking.Customer?.LastName}".Trim(),
                        Provider = "chytapay"
                    })
                };

                _context.Set<PaymentTransaction>().Add(transaction);
                await _context.SaveChangesAsync();

                // Default dueDates to 7 days from now if not provided (Chytapay
                // requires at least one, max 35 days out).
                var dueDates = dto.DueDates is { Count: > 0 }
                    ? dto.DueDates
                    : new List<string> { DateTime.UtcNow.AddDays(7).ToString("yyyy-MM-dd") };

                var surcharge = dto.Surcharge ?? new ChytapaySurchargeDto { Type = "none", Value = 0 };

                var (customerPayload, hasPhone, hasEmail) = BuildCustomerPayload(booking);

                var requestBody = new
                {
                    referenceId = transaction.Id.ToString(),
                    amount,
                    description = transaction.Description,
                    dueDates,
                    surcharge = new
                    {
                        type = surcharge.Type,
                        value = surcharge.Value
                    },
                    sendWhatsappNotification = dto.SendWhatsappNotification && hasPhone,
                    sendEmailNotification = dto.SendEmailNotification && hasEmail,
                    customer = customerPayload
                };

                var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                using var content = new StringContent(json, Encoding.UTF8, "application/json");
                using var request = new HttpRequestMessage(HttpMethod.Post, $"{IntegrationApiUrl}/integration/payment-request")
                {
                    Content = content
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.Data);
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                var response = await _httpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Chytapay payment-request failed. Status: {Status}, Body: {Body}",
                        (int)response.StatusCode, responseBody);

                    transaction.Status = PaymentTransactionStatus.Failed;
                    transaction.ProcessorResponseCode = ((int)response.StatusCode).ToString();
                    transaction.ProcessorResponseMessage = Truncate(responseBody, 500);
                    transaction.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    var errMsg = ExtractError(responseBody) ?? "Chytapay rechazó la creación del cobro";
                    return ServiceResult<ChytapayPaymentRequestResultDto>.Fail(errMsg);
                }

                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;

                string GetStr(string prop) =>
                    root.TryGetProperty(prop, out var v) ? v.GetString() ?? string.Empty : string.Empty;

                var paymentRequestId = GetStr("paymentRequestId");
                var cvu = GetStr("CVU");

                string? bankHolder = null, bankHolderTaxId = null, bankName = null;
                if (root.TryGetProperty("bankAccountInfo", out var bank))
                {
                    bankHolder = bank.TryGetProperty("accountHolderName", out var h) ? h.GetString() : null;
                    bankHolderTaxId = bank.TryGetProperty("accountHolderTaxId", out var t) ? t.GetString() : null;
                    bankName = bank.TryGetProperty("bankName", out var bn) ? bn.GetString() : null;
                }

                transaction.PaymentMethodId = paymentRequestId;
                transaction.ProcessorResponseMessage = $"CVU: {cvu}";
                transaction.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return ServiceResult<ChytapayPaymentRequestResultDto>.Ok(new ChytapayPaymentRequestResultDto
                {
                    PaymentRequestId = paymentRequestId,
                    ReferenceId = transaction.Id.ToString(),
                    Amount = amount,
                    Description = transaction.Description,
                    Cvu = cvu,
                    BankAccountHolder = bankHolder,
                    BankAccountHolderTaxId = bankHolderTaxId,
                    BankName = bankName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Chytapay payment-request");
                return ServiceResult<ChytapayPaymentRequestResultDto>.Fail("Error creando el cobro de Chytapay");
            }
        }

        public async Task<ServiceResult<bool>> ProcessWebhookAsync(ChytapayWebhookPayloadDto payload)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(payload.ReferenceId) || !Guid.TryParse(payload.ReferenceId, out var transactionId))
                {
                    _logger.LogWarning("Chytapay webhook with invalid referenceId: {ReferenceId}", payload.ReferenceId);
                    return ServiceResult<bool>.Fail("Invalid referenceId");
                }

                // No tenant in the webhook URL — ignore the query filter so we
                // can find the transaction across schemas.
                var transaction = await _context.Set<PaymentTransaction>()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == transactionId);

                if (transaction == null)
                {
                    _logger.LogWarning("Chytapay webhook for unknown transaction {TransactionId}", transactionId);
                    return ServiceResult<bool>.Fail("Transaction not found");
                }

                var previousStatus = transaction.Status;
                var newStatus = payload.StateType?.ToUpperInvariant() switch
                {
                    "PAID" => PaymentTransactionStatus.Paid,
                    "PARTIAL_PAID" => PaymentTransactionStatus.Processing,
                    _ => transaction.Status
                };

                transaction.Status = newStatus;
                transaction.ProcessorResponseCode = payload.StateType;
                transaction.ProcessorResponseMessage = $"paid={payload.PaidAmount}, total={payload.TotalAmountToPay}";
                transaction.UpdatedAt = DateTime.UtcNow;
                if (newStatus == PaymentTransactionStatus.Paid && !transaction.ProcessedAt.HasValue)
                {
                    transaction.ProcessedAt = DateTime.UtcNow;
                }

                // If newly paid, confirm the related booking.
                if (previousStatus != PaymentTransactionStatus.Paid && newStatus == PaymentTransactionStatus.Paid)
                {
                    var booking = await _context.Bookings
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(b => b.Id == transaction.BookingId);

                    if (booking != null)
                    {
                        booking.Status = "confirmed";
                        booking.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Chytapay webhook processed for transaction {TransactionId}: {State}",
                    transactionId, payload.StateType);

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Chytapay webhook");
                return ServiceResult<bool>.Fail("Error processing webhook");
            }
        }

        // ============================ Helpers ============================

        private static (object Payload, bool HasPhone, bool HasEmail) BuildCustomerPayload(Booking booking)
        {
            var customer = booking.Customer;
            var fullName = string.IsNullOrWhiteSpace(customer?.FirstName) && string.IsNullOrWhiteSpace(customer?.LastName)
                ? "Cliente"
                : $"{customer?.FirstName} {customer?.LastName}".Trim();
            if (fullName.Length < 2) fullName = fullName.PadRight(2, '.');

            // Chytapay expects phoneNumber.countryCode in "+XX" format and
            // phoneNumber.number as digits only (6-15 chars).
            string? countryCode = null;
            string? phoneNumber = null;
            var rawPhone = customer?.Phone;
            if (!string.IsNullOrWhiteSpace(rawPhone))
            {
                var digits = new string(rawPhone.Where(char.IsDigit).ToArray());
                if (digits.Length >= 6)
                {
                    countryCode = "+54";
                    var number = digits.StartsWith("54") && digits.Length > 10 ? digits[2..] : digits;
                    if (number.Length is >= 6 and <= 15)
                    {
                        phoneNumber = number;
                    }
                    else
                    {
                        countryCode = null;
                    }
                }
            }

            var email = string.IsNullOrWhiteSpace(customer?.Email) ? null : customer!.Email!.Trim().ToLowerInvariant();
            var hasPhone = phoneNumber != null;
            var hasEmail = !string.IsNullOrEmpty(email);

            object payload = new
            {
                name = fullName,
                phoneNumber = hasPhone ? new { countryCode, number = phoneNumber } : null,
                email
            };

            return (payload, hasPhone, hasEmail);
        }

        private static string? ExtractError(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (root.TryGetProperty("message", out var m)) return m.GetString();
                if (root.TryGetProperty("error", out var e))
                {
                    if (e.ValueKind == JsonValueKind.String) return e.GetString();
                }
                if (root.TryGetProperty("errors", out var errs) && errs.ValueKind == JsonValueKind.Array)
                {
                    return string.Join("; ", errs.EnumerateArray().Select(x => x.ToString()));
                }
            }
            catch { /* ignore */ }
            return null;
        }

        private static string Truncate(string s, int max) =>
            string.IsNullOrEmpty(s) ? s : s.Length <= max ? s : s[..max];
    }

}
