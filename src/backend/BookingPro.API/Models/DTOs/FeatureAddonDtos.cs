namespace BookingPro.API.Models.DTOs
{
    public class FeatureAddonStatusDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyPrice { get; set; }
        public string Currency { get; set; } = "ARS";
        public bool Active { get; set; }
        public DateTime? PaidUntil { get; set; }
        public bool HasPendingPurchase { get; set; }
    }

    public class PurchaseFeatureAddonRequestDto
    {
        public string Code { get; set; } = string.Empty;
    }

    public class PurchaseFeatureAddonResponseDto
    {
        public Guid PurchaseId { get; set; }
        public string PaymentLink { get; set; } = string.Empty;
        public string PreferenceId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    /// <summary>Un add-on de un negocio, como lo ve el super admin.</summary>
    public class SuperAdminTenantAddonDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool Active { get; set; }
        public DateTime? PaidUntil { get; set; }
        /// <summary>payment | manual | plan</summary>
        public string? Source { get; set; }
    }

    /// <summary>Negocio con el estado de todos los add-ons del catálogo.</summary>
    public class SuperAdminAddonsRowDto
    {
        public Guid TenantId { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string Subdomain { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<SuperAdminTenantAddonDto> Addons { get; set; } = new();
        /// <summary>Lo que factura por add-ons al mes (sólo los vigentes).</summary>
        public decimal MonthlyTotal { get; set; }
    }

    public class GrantFeatureAddonDto
    {
        public Guid TenantId { get; set; }
        public string Code { get; set; } = string.Empty;
        public int Months { get; set; } = 1;
    }

    public class ConfirmationBotStatsDto
    {
        public int TotalSent { get; set; }
        public int Confirmed { get; set; }
        public int Cancelled { get; set; }
        public int NoResponse { get; set; }
        public int SentLast30Days { get; set; }
        public int ConfirmedLast30Days { get; set; }
        public int CancelledLast30Days { get; set; }
    }
}
