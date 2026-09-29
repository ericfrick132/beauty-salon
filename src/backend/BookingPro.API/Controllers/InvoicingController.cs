using System.Net;
using BookingPro.API.Data;
using BookingPro.API.Services;
using BookingPro.API.Services.Invoicing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Facturación electrónica del negocio (ARCA) vía el facturador compartido: conexión con ARCA,
    /// cobros de turnos y ventas con su comprobante, facturar seleccionadas, notas de crédito, PDF y resumen fiscal.
    /// </summary>
    [ApiController]
    [Route("api/invoicing")]
    [Authorize(Roles = "admin,super_admin")]
    public class InvoicingController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ITenantProvider _tenantProvider;
        private readonly IFacturadorClient _facturador;
        private readonly SalonInvoicingService _invoicing;

        public InvoicingController(ApplicationDbContext db, ITenantProvider tenantProvider, IFacturadorClient facturador, SalonInvoicingService invoicing)
        {
            _db = db;
            _tenantProvider = tenantProvider;
            _facturador = facturador;
            _invoicing = invoicing;
        }

        private Guid TenantId => _tenantProvider.GetCurrentTenantId();
        private string EmitterId => SalonInvoicingService.EmitterId(TenantId);

        public record SettingsRequest(string Cuit, string? BusinessName, string? TaxCondition, string? MonotributoCategory,
            string? Address, string? GrossIncomeNumber, DateOnly? ActivityStartDate);
        public record PointOfSaleRequest(int PointOfSale);
        public record AutoRequest(bool Enabled);
        public record CreditNoteRequest(string? Reason);
        public record PeriodRequest(decimal? ExternalBilled, decimal? VatCredit);

        [HttpGet]
        public Task<IActionResult> Status(CancellationToken ct) => Run(async () =>
        {
            var tenant = await _db.Tenants.AsNoTracking().FirstAsync(t => t.Id == TenantId, ct);
            FacturadorEmitter? emitter = null;
            if (_facturador.IsConfigured && tenant.InvoicingCuit is not null)
                emitter = await _facturador.GetEmitterAsync(EmitterId, ct);
            return Data(new { platformEnabled = _facturador.IsConfigured, guideUrl = emitter?.GuideUrl ?? _facturador.GuideUrl, cuit = tenant.InvoicingCuit, autoInvoice = tenant.AutoInvoice, autoInvoiceSince = tenant.AutoInvoiceSince, emitter });
        });

        [HttpPut("settings")]
        public Task<IActionResult> Settings([FromBody] SettingsRequest r, CancellationToken ct) => Run(async () =>
        {
            var tenant = await _db.Tenants.FirstAsync(t => t.Id == TenantId, ct);
            var emitter = await _facturador.UpsertEmitterAsync(EmitterId, new FacturadorEmitterRequest(r.Cuit, Blank(r.BusinessName),
                Blank(r.TaxCondition), null, Blank(r.Address), Blank(r.GrossIncomeNumber), r.ActivityStartDate, Blank(r.MonotributoCategory)), ct);
            tenant.InvoicingCuit = emitter.Cuit;
            await _db.SaveChangesAsync(ct);
            return Data(emitter);
        });

        [HttpPost("verify")]
        public Task<IActionResult> Verify(CancellationToken ct) => Run(async () => Data(await _facturador.VerifyAsync(EmitterId, ct)));

        [HttpPost("point-of-sale")]
        public Task<IActionResult> PointOfSale([FromBody] PointOfSaleRequest r, CancellationToken ct) =>
            Run(async () => Data(await _facturador.SetPointOfSaleAsync(EmitterId, r.PointOfSale, ct)));

        [HttpPut("auto")]
        public Task<IActionResult> Auto([FromBody] AutoRequest r, CancellationToken ct) => Run(async () =>
        {
            var tenant = await _db.Tenants.FirstAsync(t => t.Id == TenantId, ct);
            if (r.Enabled)
            {
                var emitter = tenant.InvoicingCuit is null ? null : await _facturador.GetEmitterAsync(EmitterId, ct);
                if (emitter is not { ReadyToInvoice: true })
                    return Fail(HttpStatusCode.Conflict, "Primero terminá de conectar ARCA.");
                if (!tenant.AutoInvoice) tenant.AutoInvoiceSince = DateTime.UtcNow;
            }
            tenant.AutoInvoice = r.Enabled;
            await _db.SaveChangesAsync(ct);
            return Data(new { autoInvoice = tenant.AutoInvoice, autoInvoiceSince = tenant.AutoInvoiceSince });
        });

        [HttpGet("sales")]
        public Task<IActionResult> Sales([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct) => Run(async () =>
        {
            if (to < from) (from, to) = (to, from);
            if (to.DayNumber - from.DayNumber > 92) return Fail(HttpStatusCode.BadRequest, "Elegí un período de hasta 3 meses.");
            return Data(await _invoicing.ListAsync(TenantId, from, to, ct));
        });

        [HttpPost("invoice")]
        public Task<IActionResult> Invoice([FromBody] SalonInvoiceSelection r, CancellationToken ct) => Run(async () =>
        {
            var keys = r.Keys?.Distinct().ToList() ?? new();
            if (keys.Count == 0) return Fail(HttpStatusCode.BadRequest, "Elegí al menos una venta.");
            if (keys.Count > 1000) return Fail(HttpStatusCode.BadRequest, "Máximo 1000 ventas por vez.");
            return Data(await _invoicing.InvoiceAsync(TenantId, keys, ct));
        });

        [HttpPost("sync")]
        public Task<IActionResult> Sync(CancellationToken ct) => Run(async () => Data(new { synced = await _invoicing.SyncPendingAsync(TenantId, ct) }));

        [HttpPost("{id:guid}/credit-note")]
        public Task<IActionResult> CreditNote(Guid id, [FromBody] CreditNoteRequest r, CancellationToken ct) => Run(async () =>
        {
            var note = await _invoicing.CreditNoteAsync(TenantId, id, r.Reason, ct);
            return Data(new { note.Id, note.Status, note.VoucherName });
        });

        [HttpGet("{id:guid}/pdf")]
        public Task<IActionResult> Pdf(Guid id, CancellationToken ct) => Run(async () =>
        {
            var invoice = await _db.ElectronicInvoices.IgnoreQueryFilters().AsNoTracking()
                .FirstOrDefaultAsync(i => i.TenantId == TenantId && i.Id == id, ct);
            if (invoice is null) return Fail(HttpStatusCode.NotFound, "Comprobante no encontrado.");
            var pdf = await _facturador.GetPdfAsync(EmitterId, invoice.FacturadorInvoiceId, ct);
            if (pdf is null) return Fail(HttpStatusCode.NotFound, "El comprobante todavía no está autorizado.");
            return File(pdf, "application/pdf", $"{invoice.VoucherName.Replace(' ', '-')}-{invoice.FullNumber}.pdf");
        });

        [HttpGet("summary")]
        public Task<IActionResult> Summary(CancellationToken ct) => Run(async () =>
        {
            var summary = await _facturador.GetSummaryAsync(EmitterId, ct);
            return summary is null ? Fail(HttpStatusCode.NotFound, "Configurá la facturación primero.") : Data(summary);
        });

        [HttpPut("periods/{month}")]
        public Task<IActionResult> Period(string month, [FromBody] PeriodRequest r, CancellationToken ct) => Run(async () =>
        {
            await _facturador.UpsertPeriodAsync(EmitterId, month, r.ExternalBilled, r.VatCredit, ct);
            return Data(new { ok = true });
        });

        private static string? Blank(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

        private IActionResult Data<T>(T data) => Ok(data);

        private IActionResult Fail(HttpStatusCode status, string message) =>
            StatusCode((int)status, new { error = message });

        private async Task<IActionResult> Run(Func<Task<IActionResult>> action)
        {
            try
            {
                return await action();
            }
            catch (FacturadorException ex)
            {
                var status = ex.Status is HttpStatusCode.BadRequest or HttpStatusCode.Conflict or HttpStatusCode.NotFound
                    ? ex.Status : HttpStatusCode.ServiceUnavailable;
                return Fail(status, ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return Fail(HttpStatusCode.NotFound, ex.Message);
            }
        }
    }
}
