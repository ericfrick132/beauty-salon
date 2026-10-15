using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Precio de un plan en otra moneda (fuera de Argentina la suscripción se cobra con Stripe: UY en USD,
    /// MX en MXN, ES en EUR). SubscriptionPlan.Price/Currency sigue siendo el precio en ARS de Mercado Pago.
    /// Lo edita el super admin; al arrancar se completan los que falten convirtiendo el precio en ARS.
    /// </summary>
    [Table("subscription_plan_prices", Schema = "public")]
    public class SubscriptionPlanPrice
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid SubscriptionPlanId { get; set; }

        [Required, MaxLength(10)]
        public string Currency { get; set; } = "USD";

        public decimal Amount { get; set; }

        /// <summary>Price de Stripe vigente para este monto (lookup_key turnospro_plan_{code}_{currency}).</summary>
        [MaxLength(100)]
        public string? StripePriceId { get; set; }

        /// <summary>Monto con el que se creó StripePriceId: si el super admin cambia Amount, se crea otro Price.</summary>
        public decimal? StripePriceAmount { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual SubscriptionPlan SubscriptionPlan { get; set; } = null!;
    }

    /// <summary>Precio mensual de un add-on en otra moneda (compra con Stripe fuera de Argentina).</summary>
    [Table("feature_addon_prices", Schema = "public")]
    public class FeatureAddonPrice
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(50)]
        public string AddonCode { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string Currency { get; set; } = "USD";

        public decimal Amount { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Suscripción de un negocio a la plataforma cobrada con Stripe (Checkout en modo subscription). Es el
    /// equivalente de TenantPreapproval para los países que no pagan con Mercado Pago: el webhook actualiza
    /// el mismo Tenant/Subscription que actualiza la preapproval.
    /// </summary>
    [Table("tenant_stripe_subscriptions", Schema = "public")]
    public class TenantStripeSubscription
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid TenantId { get; set; }

        public Guid SubscriptionPlanId { get; set; }

        [MaxLength(100)]
        public string? StripeCustomerId { get; set; }

        [MaxLength(100)]
        public string? StripeSubscriptionId { get; set; }

        [MaxLength(200)]
        public string? StripeCheckoutSessionId { get; set; }

        [MaxLength(100)]
        public string? StripePriceId { get; set; }

        /// <summary>
        /// "checkout_pending" mientras no vuelve del Checkout; después el status de Stripe: trialing, active,
        /// past_due, unpaid, canceled, incomplete, incomplete_expired, paused. "expired" si el Checkout venció.
        /// </summary>
        [Required, MaxLength(30)]
        public string Status { get; set; } = TenantStripeSubscriptionStatuses.CheckoutPending;

        [Required, MaxLength(10)]
        public string Currency { get; set; } = "USD";

        public decimal Amount { get; set; }

        public DateTime? TrialEnd { get; set; }
        public DateTime? CurrentPeriodEnd { get; set; }
        public bool CancelAtPeriodEnd { get; set; }
        public DateTime? CanceledAt { get; set; }

        [MaxLength(100)]
        public string? LastInvoiceId { get; set; }

        public DateTime? LastPaymentAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Con tarjeta/SEPA autorizada y cobrando (o en la prueba): pasa el gate de la tarjeta.</summary>
        [NotMapped]
        public bool IsCharging => TenantStripeSubscriptionStatuses.IsCharging(Status);
    }

    public static class TenantStripeSubscriptionStatuses
    {
        public const string CheckoutPending = "checkout_pending";
        public const string Expired = "expired";
        public const string Trialing = "trialing";
        public const string Active = "active";
        public const string PastDue = "past_due";
        public const string Canceled = "canceled";

        /// <summary>Estados en los que la suscripción sigue viva (past_due: Stripe reintenta el cobro).</summary>
        public static readonly string[] Charging = { Trialing, Active, PastDue };

        public static bool IsCharging(string? status) => status != null && Array.IndexOf(Charging, status) >= 0;
    }
}
