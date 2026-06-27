using System;

namespace BookingPro.API.Models.DTOs
{
    // === Coupon DTOs ===

    public class CouponDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal? DiscountFixedAmount { get; set; }
        public int? DurationMonths { get; set; }
        public int? MaxUses { get; set; }
        public int TimesUsed { get; set; }
        public int? ValidForDays { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool IsActive { get; set; }
        public Guid? SubscriptionPlanId { get; set; }
        public string? PlanName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateCouponDto
    {
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal? DiscountFixedAmount { get; set; }
        public int? DurationMonths { get; set; }
        public int? MaxUses { get; set; }
        public int? ValidForDays { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public Guid? SubscriptionPlanId { get; set; }
    }

    public class UpdateCouponDto
    {
        public string? Description { get; set; }
        public decimal? DiscountPercent { get; set; }
        public decimal? DiscountFixedAmount { get; set; }
        public int? DurationMonths { get; set; }
        public int? MaxUses { get; set; }
        public int? ValidForDays { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool? IsActive { get; set; }
        public Guid? SubscriptionPlanId { get; set; }
    }

    public class ValidateCouponResponseDto
    {
        public bool IsValid { get; set; }
        public string? CouponCode { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal? DiscountFixedAmount { get; set; }
        public int? DurationMonths { get; set; }
        public decimal OriginalPrice { get; set; }
        public decimal FinalPrice { get; set; }
        public string? Message { get; set; }
    }
}
