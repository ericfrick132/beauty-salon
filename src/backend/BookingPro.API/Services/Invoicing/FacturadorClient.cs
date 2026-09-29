using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BookingPro.API.Services.Invoicing;

// ─────────────────────────────────────────────────────────────────────────────
// Cliente del Facturador (facturación electrónica ARCA compartida por PlayCrew, GymHero, TurnosPro y
// UniStock). Mismo archivo en los cuatro productos: sólo cambia el namespace.
// Config: Facturador:BaseUrl (ej. https://facturador.efcloud.com.ar) y Facturador:ApiKey.
// ─────────────────────────────────────────────────────────────────────────────

public record FacturadorEmitterRequest(
    string Cuit, string? BusinessName, string? TaxCondition, decimal? VatRate, string? Address,
    string? GrossIncomeNumber, DateOnly? ActivityStartDate, string? MonotributoCategory);

public record FacturadorEmitter(
    string ExternalId, string Cuit, string BusinessName, string TaxCondition, string Status, bool ReadyToInvoice,
    string Message, int? PointOfSale, List<int> PointsOfSale, string VoucherName, string PointOfSaleSystemName,
    string PlatformCuit, string PlatformName, string GuideUrl, string Environment, DateTime? CheckedAt,
    string? Address, string? GrossIncomeNumber, DateOnly? ActivityStartDate, string? MonotributoCategory);

public record FacturadorReceiver(string? DocType, string? DocNumber, string? Name, int? IvaCondition, string? Email, string? Address);

public record FacturadorItem(string Description, decimal Quantity, decimal UnitPrice);

public record FacturadorInvoiceRequest(
    string ExternalRef, string Concept, decimal Total, List<FacturadorItem>? Items, FacturadorReceiver? Receiver,
    DateOnly? ServiceFrom, DateOnly? ServiceTo);

public record FacturadorInvoiceReceiver(int DocType, long DocNumber, string DocTypeName, string? Name, int IvaCondition, string IvaConditionName);

public record FacturadorInvoice(
    int Id, string? ExternalRef, string EmitterExternalId, string Kind, int VoucherType, string VoucherName, string Letter,
    int PointOfSale, long? Number, string? FullNumber, DateOnly? IssueDate, decimal Total, decimal Net, decimal Vat,
    string Status, string? Cae, DateOnly? CaeExpiresAt, string? Error, string? Observations, FacturadorInvoiceReceiver Receiver,
    int? CreditsInvoiceId, string? PdfUrl, string? QrUrl, string Environment, DateTime CreatedAt);

public record FacturadorBatchResult(string ExternalRef, bool Created, FacturadorInvoice? Invoice, string? Error);
public record FacturadorBatchResponse(int Created, int Existing, int Failed, List<FacturadorBatchResult> Results);

public record FacturadorMonthAmount(string Month, decimal Invoiced, decimal External, decimal Total);
public record FacturadorCategory(string Letter, decimal AnnualCap);
public record FacturadorMonotributo(
    string? Category, decimal? AnnualCap, decimal BilledLast12Months, decimal? Remaining, decimal? UsedPercent, string Level,
    decimal MonthlyAverage, decimal ProjectedAnnual, string? CategoryForBilled, string? CategoryForProjection, string Advice,
    DateOnly NextRecategorization, DateOnly? TableValidFrom, List<FacturadorMonthAmount> Months, List<FacturadorCategory> Categories);
public record FacturadorVatMonth(string Month, decimal DebitoFiscal, decimal CreditoFiscal, decimal Neto, decimal InvoicedNet, decimal InvoicedTotal);
public record FacturadorVat(FacturadorVatMonth Current, FacturadorVatMonth Previous, string Advice);
public record FacturadorSummary(string TaxCondition, FacturadorMonotributo? Monotributo, FacturadorVat? Vat);

/// <summary>Error que devolvió el facturador (400 validación, 409 emisor sin ARCA listo, 503 ARCA caído…).</summary>
public class FacturadorException(HttpStatusCode status, string message) : Exception(message)
{
    public HttpStatusCode Status { get; } = status;
}

public interface IFacturadorClient
{
    bool IsConfigured { get; }
    /// <summary>Guía paso a paso de ARCA con capturas, para embeber (iframe) aunque el emisor todavía no exista.</summary>
    string? GuideUrl { get; }
    Task<FacturadorEmitter> UpsertEmitterAsync(string externalId, FacturadorEmitterRequest request, CancellationToken ct = default);
    Task<FacturadorEmitter?> GetEmitterAsync(string externalId, CancellationToken ct = default);
    Task<FacturadorEmitter> VerifyAsync(string externalId, CancellationToken ct = default);
    Task<FacturadorEmitter> SetPointOfSaleAsync(string externalId, int pointOfSale, CancellationToken ct = default);
    Task<FacturadorBatchResponse> CreateInvoicesAsync(string externalId, IReadOnlyList<FacturadorInvoiceRequest> invoices, CancellationToken ct = default);
    Task<FacturadorInvoice> CreateCreditNoteAsync(string externalId, int invoiceId, string externalRef, decimal? amount, string? reason, CancellationToken ct = default);
    Task<FacturadorInvoice?> GetInvoiceAsync(string externalId, int invoiceId, CancellationToken ct = default);
    Task<byte[]?> GetPdfAsync(string externalId, int invoiceId, CancellationToken ct = default);
    Task<FacturadorSummary?> GetSummaryAsync(string externalId, CancellationToken ct = default);
    Task UpsertPeriodAsync(string externalId, string month, decimal? externalBilled, decimal? vatCredit, CancellationToken ct = default);
}

public class FacturadorClient : IFacturadorClient
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _http;

    public FacturadorClient(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        var baseUrl = configuration["Facturador:BaseUrl"];
        var apiKey = configuration["Facturador:ApiKey"];
        IsConfigured = !string.IsNullOrWhiteSpace(baseUrl) && !string.IsNullOrWhiteSpace(apiKey);
        if (IsConfigured)
        {
            _http.BaseAddress = new Uri(baseUrl!.TrimEnd('/') + "/");
            GuideUrl = baseUrl.TrimEnd('/') + "/guia-arca?embed=1";
            _http.DefaultRequestHeaders.Remove("X-Api-Key");
            _http.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
        }
    }

    public bool IsConfigured { get; }
    public string? GuideUrl { get; }

    private static string E(string value) => Uri.EscapeDataString(value);

    public Task<FacturadorEmitter> UpsertEmitterAsync(string externalId, FacturadorEmitterRequest request, CancellationToken ct = default) =>
        SendAsync<FacturadorEmitter>(HttpMethod.Put, $"api/v1/emitters/{E(externalId)}", request, ct)!;

    public async Task<FacturadorEmitter?> GetEmitterAsync(string externalId, CancellationToken ct = default) =>
        await SendAsync<FacturadorEmitter>(HttpMethod.Get, $"api/v1/emitters/{E(externalId)}", null, ct, allowNotFound: true);

    public Task<FacturadorEmitter> VerifyAsync(string externalId, CancellationToken ct = default) =>
        SendAsync<FacturadorEmitter>(HttpMethod.Post, $"api/v1/emitters/{E(externalId)}/verify", null, ct)!;

    public Task<FacturadorEmitter> SetPointOfSaleAsync(string externalId, int pointOfSale, CancellationToken ct = default) =>
        SendAsync<FacturadorEmitter>(HttpMethod.Post, $"api/v1/emitters/{E(externalId)}/point-of-sale", new { pointOfSale }, ct)!;

    public Task<FacturadorBatchResponse> CreateInvoicesAsync(string externalId, IReadOnlyList<FacturadorInvoiceRequest> invoices, CancellationToken ct = default) =>
        SendAsync<FacturadorBatchResponse>(HttpMethod.Post, $"api/v1/emitters/{E(externalId)}/invoices/batch", new { invoices }, ct)!;

    public Task<FacturadorInvoice> CreateCreditNoteAsync(string externalId, int invoiceId, string externalRef, decimal? amount, string? reason, CancellationToken ct = default) =>
        SendAsync<FacturadorInvoice>(HttpMethod.Post, $"api/v1/emitters/{E(externalId)}/invoices/{invoiceId}/credit-note",
            new { externalRef, amount, reason }, ct)!;

    public async Task<FacturadorInvoice?> GetInvoiceAsync(string externalId, int invoiceId, CancellationToken ct = default) =>
        await SendAsync<FacturadorInvoice>(HttpMethod.Get, $"api/v1/emitters/{E(externalId)}/invoices/{invoiceId}", null, ct, allowNotFound: true);

    public async Task<byte[]?> GetPdfAsync(string externalId, int invoiceId, CancellationToken ct = default)
    {
        EnsureConfigured();
        using var response = await _http.GetAsync($"api/v1/emitters/{E(externalId)}/invoices/{invoiceId}/pdf", ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        await ThrowIfErrorAsync(response, ct);
        return await response.Content.ReadAsByteArrayAsync(ct);
    }

    public async Task<FacturadorSummary?> GetSummaryAsync(string externalId, CancellationToken ct = default) =>
        await SendAsync<FacturadorSummary>(HttpMethod.Get, $"api/v1/emitters/{E(externalId)}/summary", null, ct, allowNotFound: true);

    public async Task UpsertPeriodAsync(string externalId, string month, decimal? externalBilled, decimal? vatCredit, CancellationToken ct = default) =>
        await SendAsync<object>(HttpMethod.Put, $"api/v1/emitters/{E(externalId)}/periods/{E(month)}", new { externalBilled, vatCredit }, ct);

    private void EnsureConfigured()
    {
        if (!IsConfigured)
            throw new FacturadorException(HttpStatusCode.ServiceUnavailable, "La facturación electrónica todavía no está habilitada en la plataforma.");
    }

    private async Task<T?> SendAsync<T>(HttpMethod method, string path, object? body, CancellationToken ct, bool allowNotFound = false)
    {
        EnsureConfigured();
        using var request = new HttpRequestMessage(method, path);
        if (body is not null)
            request.Content = JsonContent.Create(body, options: Json);

        HttpResponseMessage response;
        try
        {
            response = await _http.SendAsync(request, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            throw new FacturadorException(HttpStatusCode.ServiceUnavailable, "No se pudo conectar con el servicio de facturación. Probá de nuevo en unos minutos.");
        }

        using (response)
        {
            if (allowNotFound && response.StatusCode == HttpStatusCode.NotFound)
                return default;
            await ThrowIfErrorAsync(response, ct);
            if (response.StatusCode == HttpStatusCode.NoContent || typeof(T) == typeof(object))
                return default;
            return await response.Content.ReadFromJsonAsync<T>(Json, ct);
        }
    }

    private static async Task ThrowIfErrorAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode)
            return;
        string message;
        try
        {
            var error = await response.Content.ReadFromJsonAsync<JsonElement>(Json, ct);
            message = error.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
        }
        catch (Exception)
        {
            message = "";
        }
        if (string.IsNullOrWhiteSpace(message))
            message = $"El servicio de facturación respondió {(int)response.StatusCode}.";
        throw new FacturadorException(response.StatusCode, message);
    }
}
