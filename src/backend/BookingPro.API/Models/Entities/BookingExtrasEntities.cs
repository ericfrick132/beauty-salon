using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Cupón de descuento que el negocio le da a sus clientes (Advance en adelante). No confundir con Coupon,
    /// que es el cupón de la plataforma sobre la suscripción del negocio.
    /// </summary>
    public class BookingCoupon : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>En mayúsculas y sin espacios; único por negocio.</summary>
        [Required, MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Description { get; set; }

        /// <summary>percent | fixed</summary>
        [Required, MaxLength(10)]
        public string DiscountType { get; set; } = BookingCouponTypes.Percent;
        public decimal DiscountValue { get; set; }

        /// <summary>Null = sin tope de usos.</summary>
        public int? MaxUses { get; set; }
        public int UsedCount { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class BookingCouponTypes
    {
        public const string Percent = "percent";
        public const string Fixed = "fixed";
    }

    /// <summary>Campo extra del formulario de reserva (Advance: 1, Pro: ilimitados).</summary>
    public class BookingFormField : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(120)]
        public string Label { get; set; } = string.Empty;

        /// <summary>text | textarea | number | select | checkbox</summary>
        [Required, MaxLength(20)]
        public string FieldType { get; set; } = BookingFormFieldTypes.Text;
        public bool Required { get; set; }

        /// <summary>Opciones de un select, como JSON array de strings.</summary>
        public string? OptionsJson { get; set; }

        [MaxLength(200)]
        public string? Placeholder { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class BookingFormFieldTypes
    {
        public const string Text = "text";
        public const string Textarea = "textarea";
        public const string Number = "number";
        public const string Select = "select";
        public const string Checkbox = "checkbox";
        public static readonly string[] All = { Text, Textarea, Number, Select, Checkbox };
    }

    /// <summary>
    /// Reserva recurrente (turno fijo): mismo cliente, profesional, servicio y horario cada N semanas.
    /// Las ocurrencias son Bookings normales con SeriesId; cancelar la serie cancela las futuras.
    /// </summary>
    public class BookingSeries : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid CustomerId { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid ServiceId { get; set; }

        /// <summary>Inicio de la primera ocurrencia, en UTC.</summary>
        public DateTime FirstStartTime { get; set; }
        public int DurationMinutes { get; set; }
        /// <summary>Cada cuántas semanas (1 = semanal, 2 = quincenal…).</summary>
        public int IntervalWeeks { get; set; } = 1;
        public int Occurrences { get; set; }

        /// <summary>active | cancelled</summary>
        [MaxLength(20)]
        public string Status { get; set; } = BookingSeriesStatus.Active;

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CancelledAt { get; set; }
    }

    public static class BookingSeriesStatus
    {
        public const string Active = "active";
        public const string Cancelled = "cancelled";
    }
}
