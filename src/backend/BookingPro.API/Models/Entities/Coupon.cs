using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    public class Coupon
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Percentage discount (e.g. 20 for 20% off). Use this OR DiscountFixedAmount.
        /// </summary>
        public decimal DiscountPercent { get; set; }

        /// <summary>
        /// Fixed amount discount in tenant currency. Use this OR DiscountPercent.
        /// </summary>
        public decimal? DiscountFixedAmount { get; set; }

        /// <summary>
        /// Maximum number of times this coupon can be used. null = unlimited.
        /// </summary>
        public int? MaxUses { get; set; }

        public int TimesUsed { get; set; } = 0;

        /// <summary>
        /// Number of days the coupon is valid after creation. null = no time limit.
        /// </summary>
        public int? ValidForDays { get; set; }

        /// <summary>
        /// Explicit expiry date. Takes precedence over ValidForDays if both set.
        /// </summary>
        public DateTime? ExpiresAt { get; set; }

        public bool IsActive { get; set; } = true;

        /// <summary>
        /// If set, coupon only applies to this specific plan. null = all plans.
        /// </summary>
        public Guid? SubscriptionPlanId { get; set; }

        /// <summary>
        /// How many months the discount applies. null = forever (recurring). 1 = first month only.
        /// </summary>
        public int? DurationMonths { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public virtual SubscriptionPlan? SubscriptionPlan { get; set; }
        /// <summary>Promos de la landing /promo que usan este cupón (las crea sales-hub por /api/hub/promos).</summary>
        public virtual ICollection<Promo> Promos { get; set; } = new List<Promo>();
        /// <summary>Débitos automáticos a los que se les aplicó este cupón.</summary>
        public virtual ICollection<CouponRedemption> Redemptions { get; set; } = new List<CouponRedemption>();
    }
}
