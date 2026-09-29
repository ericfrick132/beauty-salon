using System.Globalization;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services.Invoicing
{
    /// <summary>Un cobro de turno o venta de productos con su estado de facturación, para la lista de ventas.</summary>
    public record SalonSaleRow(
        string Key,
        string SourceType,
        Guid SourceId,
        DateTime Date,
        string When,
        string Description,
        string? CustomerName,
        decimal Amount,
        string Method,
        /// <summary>none | queued | processing | authorized | rejected | error | credited</summary>
        string InvoiceStatus,
        Guid? ElectronicInvoiceId,
        string? VoucherName,
        string? FullNumber,
        string? Error);

    public record SalonInvoiceSelection(List<string> Keys);
    public record SalonInvoiceResult(int Queued, int AlreadyInvoiced, int Failed, List<string> Errors);

    /// <summary>
    /// Facturación electrónica de cobros de turnos (servicio) y ventas de productos vía el facturador
    /// compartido. Cada cobro se factura una sola vez (externalRef "payment-{id}" / "sale-{id}"), a
    /// Consumidor Final identificado con el DNI del cliente cuando lo tenemos.
    /// </summary>
    public class SalonInvoicingService
    {
        private static readonly CultureInfo EsAr = CultureInfo.GetCultureInfo("es-AR");

        private readonly ApplicationDbContext _db;
        private readonly IFacturadorClient _facturador;

        public SalonInvoicingService(ApplicationDbContext db, IFacturadorClient facturador)
        {
            _db = db;
            _facturador = facturador;
        }

        public static string EmitterId(Guid tenantId) => tenantId.ToString("N");

        public async Task<List<SalonSaleRow>> ListAsync(Guid tenantId, DateOnly from, DateOnly to, CancellationToken ct)
        {
            var fromUtc = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue).AddHours(3), DateTimeKind.Utc);
            var toUtc = DateTime.SpecifyKind(to.ToDateTime(TimeOnly.MinValue).AddDays(1).AddHours(3), DateTimeKind.Utc);

            var payments = await Payments(tenantId).Where(p => p.PaymentDate >= fromUtc && p.PaymentDate < toUtc).ToListAsync(ct);
            var sales = await Sales(tenantId).Where(s => (s.CompletedAt ?? s.SaleDate) >= fromUtc && (s.CompletedAt ?? s.SaleDate) < toUtc).ToListAsync(ct);
            var paymentIds = payments.Select(p => p.Id).ToList();
            var saleIds = sales.Select(s => s.Id).ToList();
            var invoices = await _db.ElectronicInvoices.IgnoreQueryFilters().AsNoTracking()
                .Where(i => i.TenantId == tenantId
                            && ((i.SourceType == "payment" && paymentIds.Contains(i.SourceId))
                                || (i.SourceType == "sale" && saleIds.Contains(i.SourceId))))
                .ToListAsync(ct);

            return payments.Select(p => Row("payment", p.Id, p.PaymentDate, DescribePayment(p), FullName(p.Customer ?? p.Booking?.Customer),
                    p.Amount, MethodName(p.PaymentMethod), invoices))
                .Concat(sales.Select(s => Row("sale", s.Id, s.CompletedAt ?? s.SaleDate, DescribeSale(s), FullName(s.Customer),
                    s.TotalAmount, MethodName(s.PaymentMethod), invoices)))
                .OrderByDescending(r => r.Date)
                .ToList();
        }

        public async Task<SalonInvoiceResult> InvoiceAsync(Guid tenantId, IReadOnlyCollection<string> keys, CancellationToken ct)
        {
            var parsed = keys.Select(Parse).Where(k => k is not null).Select(k => k!.Value).Distinct().ToList();
            var paymentIds = parsed.Where(k => k.Type == "payment").Select(k => k.Id).ToList();
            var saleIds = parsed.Where(k => k.Type == "sale").Select(k => k.Id).ToList();

            var existing = await _db.ElectronicInvoices.IgnoreQueryFilters().AsNoTracking()
                .Where(i => i.TenantId == tenantId && !i.IsCreditNote
                            && ((i.SourceType == "payment" && paymentIds.Contains(i.SourceId)) || (i.SourceType == "sale" && saleIds.Contains(i.SourceId))))
                .ToListAsync(ct);
            bool Blocked(string type, Guid id) => existing.Any(i => i.SourceType == type && i.SourceId == id && i.Status != "rejected" && i.Status != "error");
            int Attempts(string type, Guid id) => existing.Count(i => i.SourceType == type && i.SourceId == id);

            var requests = new List<FacturadorInvoiceRequest>();
            var already = 0;

            var payments = await Payments(tenantId).Where(p => paymentIds.Contains(p.Id)).ToListAsync(ct);
            foreach (var p in payments)
            {
                if (Blocked("payment", p.Id)) { already++; continue; }
                var day = DateOnly.FromDateTime(p.PaymentDate.AddHours(-3));
                requests.Add(new FacturadorInvoiceRequest(Ref("payment", p.Id, Attempts("payment", p.Id)), "services", p.Amount,
                    new List<FacturadorItem> { new(DescribePayment(p), 1, p.Amount) }, Receiver(p.Customer ?? p.Booking?.Customer), day, day));
            }

            var sales = await Sales(tenantId).Where(s => saleIds.Contains(s.Id)).ToListAsync(ct);
            foreach (var s in sales)
            {
                if (Blocked("sale", s.Id)) { already++; continue; }
                var items = s.SaleItems.Count > 0 && Math.Abs(s.SaleItems.Sum(i => i.TotalAmount) - s.TotalAmount) < 0.01m
                    ? s.SaleItems.Select(ItemFor).ToList()
                    : new List<FacturadorItem> { new(DescribeSale(s), 1, s.TotalAmount) };
                requests.Add(new FacturadorInvoiceRequest(Ref("sale", s.Id, Attempts("sale", s.Id)), "products", s.TotalAmount, items,
                    Receiver(s.Customer), null, null));
            }

            if (requests.Count == 0)
                return new SalonInvoiceResult(0, already, 0, new());

            var errors = new List<string>();
            var queued = 0;
            foreach (var chunk in requests.Chunk(200))
            {
                var response = await _facturador.CreateInvoicesAsync(EmitterId(tenantId), chunk, ct);
                foreach (var result in response.Results)
                {
                    if (result.Invoice is null) { errors.Add($"{result.ExternalRef}: {result.Error}"); continue; }
                    var key = Parse(result.ExternalRef)!.Value;
                    Upsert(tenantId, key.Type, key.Id, result.Invoice, null);
                    queued++;
                }
            }
            await _db.SaveChangesAsync(ct);
            return new SalonInvoiceResult(queued, already, errors.Count, errors);
        }

        public async Task<ElectronicInvoice> CreditNoteAsync(Guid tenantId, Guid electronicInvoiceId, string? reason, CancellationToken ct)
        {
            var original = await _db.ElectronicInvoices.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == electronicInvoiceId && !i.IsCreditNote, ct)
                ?? throw new KeyNotFoundException("Comprobante no encontrado.");
            var count = await _db.ElectronicInvoices.IgnoreQueryFilters().CountAsync(i => i.TenantId == tenantId && i.CreditsElectronicInvoiceId == original.Id, ct);
            var remote = await _facturador.CreateCreditNoteAsync(EmitterId(tenantId), original.FacturadorInvoiceId,
                $"nc-{original.FacturadorInvoiceId}-{count + 1}", null, reason, ct);
            var note = Upsert(tenantId, original.SourceType, original.SourceId, remote, original.Id);
            await _db.SaveChangesAsync(ct);
            return note;
        }

        public async Task<int> SyncPendingAsync(Guid tenantId, CancellationToken ct)
        {
            var pending = await _db.ElectronicInvoices.IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId && (i.Status == "queued" || i.Status == "processing"))
                .OrderBy(i => i.LastSyncedAt).Take(100).ToListAsync(ct);
            foreach (var invoice in pending)
            {
                var remote = await _facturador.GetInvoiceAsync(EmitterId(tenantId), invoice.FacturadorInvoiceId, ct);
                if (remote is not null) Apply(invoice, remote);
                invoice.LastSyncedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync(ct);
            return pending.Count;
        }

        /// <summary>Cobros sin factura desde que se prendió la facturación automática.</summary>
        public async Task<List<string>> PendingAutoKeysAsync(Guid tenantId, DateTime since, CancellationToken ct)
        {
            var invoicedPayments = _db.ElectronicInvoices.IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId && i.SourceType == "payment" && !i.IsCreditNote).Select(i => i.SourceId);
            var invoicedSales = _db.ElectronicInvoices.IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId && i.SourceType == "sale" && !i.IsCreditNote).Select(i => i.SourceId);
            var paymentIds = await Payments(tenantId).Where(p => p.PaymentDate >= since && !invoicedPayments.Contains(p.Id))
                .OrderBy(p => p.PaymentDate).Select(p => p.Id).Take(200).ToListAsync(ct);
            var saleIds = await Sales(tenantId).Where(s => (s.CompletedAt ?? s.SaleDate) >= since && !invoicedSales.Contains(s.Id))
                .OrderBy(s => s.SaleDate).Select(s => s.Id).Take(200).ToListAsync(ct);
            return paymentIds.Select(id => Key("payment", id)).Concat(saleIds.Select(id => Key("sale", id))).ToList();
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private IQueryable<Payment> Payments(Guid tenantId) =>
            _db.Payments.IgnoreQueryFilters().AsNoTracking()
                .Include(p => p.Customer)
                .Include(p => p.Booking).ThenInclude(b => b.Service)
                .Include(p => p.Booking).ThenInclude(b => b.Customer)
                .Where(p => p.TenantId == tenantId && p.Status == "completed" && p.Amount > 0);

        private IQueryable<Sale> Sales(Guid tenantId) =>
            _db.Sales.IgnoreQueryFilters().AsNoTracking()
                .Include(s => s.Customer).Include(s => s.SaleItems).ThenInclude(i => i.Product)
                .Where(s => s.TenantId == tenantId && s.Status == "completed" && s.TotalAmount > 0);

        private static SalonSaleRow Row(string type, Guid id, DateTime date, string description, string? customer, decimal amount, string method,
            List<ElectronicInvoice> invoices)
        {
            var mine = invoices.Where(i => i.SourceType == type && i.SourceId == id).OrderByDescending(i => i.CreatedAt).ToList();
            var invoice = mine.FirstOrDefault(i => !i.IsCreditNote);
            var credited = invoice is not null && mine.Any(i => i.IsCreditNote && i.CreditsElectronicInvoiceId == invoice.Id && i.Status == "authorized");
            return new SalonSaleRow(Key(type, id), type, id, date, date.AddHours(-3).ToString("dd/MM HH:mm", EsAr), description, customer,
                amount, method, invoice is null ? "none" : credited ? "credited" : invoice.Status, invoice?.Id, invoice?.VoucherName,
                invoice?.FullNumber, invoice?.Error);
        }

        private static string DescribePayment(Payment p)
        {
            var service = p.Booking?.Service?.Name;
            var prefix = p.PaymentType switch { "deposit" => "Seña ", "balance" => "Saldo ", _ => "" };
            return string.IsNullOrWhiteSpace(service) ? $"{prefix}Turno".Trim() : $"{prefix}{service}";
        }

        private static string DescribeSale(Sale s) =>
            s.SaleItems.Count == 0
                ? "Venta"
                : string.Join(", ", s.SaleItems.Take(3).Select(i => i.Quantity > 1 ? $"{i.Product?.Name} x{i.Quantity}" : i.Product?.Name ?? "Producto"))
                  + (s.SaleItems.Count > 3 ? "…" : "");

        /// <summary>Con descuento en la línea, el precio unitario no cierra: va como una línea con el total.</summary>
        private static FacturadorItem ItemFor(SaleItem i)
        {
            var name = i.Product?.Name ?? "Producto";
            return i.Quantity > 0 && Math.Abs(i.UnitPrice * i.Quantity - i.TotalAmount) < 0.01m
                ? new FacturadorItem(name, i.Quantity, i.UnitPrice)
                : new FacturadorItem(i.Quantity > 1 ? $"{name} x{i.Quantity}" : name, 1, i.TotalAmount);
        }

        private static string MethodName(string? method) => (method ?? "").ToLowerInvariant() switch
        {
            "cash" => "Efectivo",
            "card" or "debit" or "credit" => "Tarjeta",
            "transfer" => "Transferencia",
            "mercadopago" => "Mercado Pago",
            "chytapay" => "Chytapay",
            var m => m,
        };

        private static string? FullName(Customer? c) =>
            c is null ? null : $"{c.FirstName} {c.LastName}".Trim();

        /// <summary>Con DNI del cliente queda identificado (DocTipo 96); si no, consumidor final sin identificar.</summary>
        private static FacturadorReceiver Receiver(Customer? customer)
        {
            var dni = new string((customer?.Dni ?? string.Empty).Where(char.IsDigit).ToArray());
            var validDni = dni.Length is >= 6 and <= 8;
            return new FacturadorReceiver(validDni ? "dni" : "none", validDni ? dni : null, FullName(customer), null, null, null);
        }

        private static string Key(string type, Guid id) => $"{type}-{id:N}";

        private static string Ref(string type, Guid id, int attempts) => attempts == 0 ? Key(type, id) : $"{Key(type, id)}-r{attempts}";

        private static (string Type, Guid Id)? Parse(string key)
        {
            var parts = key.Split('-');
            return parts.Length >= 2 && (parts[0] == "payment" || parts[0] == "sale") && Guid.TryParseExact(parts[1], "N", out var id)
                ? (parts[0], id)
                : null;
        }

        private ElectronicInvoice Upsert(Guid tenantId, string type, Guid id, FacturadorInvoice remote, Guid? creditsId)
        {
            var local = _db.ElectronicInvoices.Local.FirstOrDefault(i => i.FacturadorInvoiceId == remote.Id)
                ?? _db.ElectronicInvoices.IgnoreQueryFilters().FirstOrDefault(i => i.TenantId == tenantId && i.FacturadorInvoiceId == remote.Id);
            if (local is null)
            {
                local = new ElectronicInvoice
                {
                    TenantId = tenantId,
                    SourceType = type,
                    SourceId = id,
                    ExternalRef = remote.ExternalRef ?? $"fact-{remote.Id}",
                    FacturadorInvoiceId = remote.Id,
                    IsCreditNote = remote.Kind == "credit_note",
                    CreditsElectronicInvoiceId = creditsId,
                };
                _db.ElectronicInvoices.Add(local);
            }
            Apply(local, remote);
            return local;
        }

        private static void Apply(ElectronicInvoice local, FacturadorInvoice remote)
        {
            local.Status = remote.Status;
            local.VoucherName = remote.VoucherName;
            local.FullNumber = remote.FullNumber;
            local.Total = remote.Total;
            local.Cae = remote.Cae;
            local.Error = remote.Error is { Length: > 1000 } e ? e[..1000] : remote.Error;
            local.IssueDate = remote.IssueDate;
            local.LastSyncedAt = DateTime.UtcNow;
        }
    }
}
