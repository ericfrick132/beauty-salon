using System;
using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Suscripción de Google Play (app Android) que paga el plan de TurnosPro de un negocio. Espejo de
    /// los campos Apple* de <see cref="Subscription"/>, pero en tabla aparte (como en Bunker): si la
    /// migración no llegara a aplicarse solo falla el cobro por Google Play, no las consultas de
    /// Subscriptions. Tabla de plataforma (sin filtro por tenant): el webhook RTDN corre sin tenant y
    /// correlaciona el negocio por el purchaseToken. Una fila por negocio.
    /// </summary>
    public class TenantGooglePlaySubscription
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid TenantId { get; set; }

        /// <summary>purchaseToken vigente (cambia al cambiar de plan base: el nuevo trae linkedPurchaseToken).</summary>
        [Required, MaxLength(1024)]
        public string PurchaseToken { get; set; } = string.Empty;

        /// <summary>Token anterior de la misma suscripción (cambio de plan / reactivación).</summary>
        [MaxLength(1024)]
        public string? LinkedPurchaseToken { get; set; }

        [MaxLength(255)]
        public string? ProductId { get; set; }

        /// <summary>Plan base de Play (mensual, trimestral, semestral, anual).</summary>
        [MaxLength(64)]
        public string? BasePlanId { get; set; }

        /// <summary>latestOrderId de Google (GPA.xxxx, GPA.xxxx..0, ..1 en cada renovación).</summary>
        [MaxLength(255)]
        public string? LatestOrderId { get; set; }

        /// <summary>subscriptionState de la API v2 (SUBSCRIPTION_STATE_ACTIVE, …_EXPIRED, …).</summary>
        [MaxLength(64)]
        public string? State { get; set; }

        public DateTime? ExpiresAt { get; set; }

        public bool AutoRenewing { get; set; }

        /// <summary>Compra de prueba (licencia de testing de Play Console): no es plata real.</summary>
        public bool IsTest { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
