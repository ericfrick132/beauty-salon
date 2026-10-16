using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Promo de fecha especial (Black Friday, Día de la Madre...) que arma sales-hub y la app muestra en
    /// /promo. Se crea/actualiza por slug con POST /api/hub/promos y siempre va atada a un cupón real
    /// (<see cref="Coupon"/>) que descuenta en el débito automático.
    /// EF la descubre por la navegación Coupon.Promos (no tiene DbSet: se usa con Set&lt;Promo&gt;()).
    /// </summary>
    [Table("promos")]
    [Index(nameof(Slug), IsUnique = true)]
    public class Promo
    {
        public int Id { get; set; }

        [Required, MaxLength(120)]
        public string Slug { get; set; } = string.Empty;

        public int CouponId { get; set; }

        /// <summary>Código del cupón (copia de Coupon.Code, en mayúsculas).</summary>
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Headline { get; set; }

        [MaxLength(1000)]
        public string? Subheadline { get; set; }

        public List<string> Bullets { get; set; } = new();

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Precision(5, 2)]
        public decimal DiscountPercent { get; set; }

        public int? DurationMonths { get; set; }

        public DateTime StartsAt { get; set; }
        public DateTime EndsAt { get; set; }

        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        [MaxLength(300)]
        public string? ImageCredit { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual Coupon Coupon { get; set; } = null!;
    }

    /// <summary>
    /// Cupón aplicado al débito automático (preapproval de Mercado Pago) de un negocio: el monto de la
    /// preapproval baja a <see cref="DiscountedAmount"/> y, después de <see cref="DurationMonths"/> cobros
    /// con descuento, PromoCouponService la vuelve al precio del plan.
    /// Status: "active" (cobrando con descuento), "completed" (ya volvió al precio normal),
    /// "superseded" (la preapproval cambió de plan/monto o se canceló: el descuento terminó ahí).
    /// </summary>
    [Table("coupon_redemptions")]
    [Index(nameof(TenantId))]
    [Index(nameof(TenantPreapprovalId))]
    public class CouponRedemption
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public int CouponId { get; set; }

        [Required, MaxLength(50)]
        public string CouponCode { get; set; } = string.Empty;

        public Guid TenantId { get; set; }

        public Guid TenantPreapprovalId { get; set; }

        [Required, MaxLength(100)]
        public string MercadoPagoPreapprovalId { get; set; } = string.Empty;

        [Precision(5, 2)]
        public decimal DiscountPercent { get; set; }

        /// <summary>Cobros con descuento. null = para siempre.</summary>
        public int? DurationMonths { get; set; }

        [Precision(18, 2)]
        public decimal OriginalAmount { get; set; }

        [Precision(18, 2)]
        public decimal DiscountedAmount { get; set; }

        [MaxLength(10)]
        public string CurrencyId { get; set; } = "ARS";

        [Required, MaxLength(20)]
        public string Status { get; set; } = "active";

        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }

        [MaxLength(500)]
        public string? LastError { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual Coupon Coupon { get; set; } = null!;
    }
}
