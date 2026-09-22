using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services.Interfaces
{
    /// <summary>
    /// Add-on "detección de transferencias" (FeatureCodes.TransferDetection): concilia la plata que
    /// entra a la cuenta de Mercado Pago del negocio contra los turnos con seña/saldo pendiente.
    /// Lo que identifica el turno lo aplica solo; lo demás queda en la cola de pagos sin validar.
    /// Todas las consultas usan IgnoreQueryFilters + TenantId explícito: también corre desde un
    /// BackgroundService, donde el filtro global por tenant resuelve a Guid.Empty.
    /// </summary>
    public interface ITransferDetectionService
    {
        Task<TransferDetectionSettings> GetOrCreateSettingsAsync(Guid tenantId);
        Task<bool> IsActiveAsync(Guid tenantId);

        Task<TransferReconcileResult> ReconcileAsync(Guid tenantId, DateTime from, DateTime to);
        Task<(bool Ok, string Message)> ResolveAsync(Guid tenantId, Guid incomingPaymentId, Guid bookingId, bool remember, string? by);
        Task<(bool Ok, string Message)> IgnoreAsync(Guid tenantId, Guid incomingPaymentId, string? by);
        Task<List<BookingCandidate>> CandidatesAsync(Guid tenantId, IncomingPayment incoming);

        /// <summary>Un cliente mandó un comprobante (imagen/PDF) al WhatsApp del negocio: se le contesta y se cruza con Mercado Pago.</summary>
        Task RegisterReceiptAsync(Guid tenantId, string phone, string? contactName);
        Task<int> ProcessReceiptClaimsAsync(Guid tenantId);
    }

    public class TransferReconcileResult
    {
        public string? Error { get; set; }
        public int Scanned { get; set; }
        public int AlreadyKnown { get; set; }
        public int Applied { get; set; }
        public decimal AppliedAmount { get; set; }
        public int Pending { get; set; }
        public int AlreadyLoaded { get; set; }
        public int PossibleDuplicates { get; set; }
    }

    public class BookingCandidate
    {
        public Guid BookingId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? EmployeeName { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal Outstanding { get; set; }
        public decimal? DepositRequired { get; set; }
        public decimal? DepositOutstanding { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool AmountMatches { get; set; }
    }
}
