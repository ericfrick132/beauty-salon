using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookingPro.API.Services
{
    public class CouponService : ICouponService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<CouponService> _logger;

        public CouponService(ApplicationDbContext db, ILogger<CouponService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<CouponDto> CreateCouponAsync(CreateCouponDto dto)
        {
            var coupon = new Coupon
            {
                Code = dto.Code.ToUpperInvariant().Trim(),
                Description = dto.Description,
                DiscountPercent = dto.DiscountPercent,
                DiscountFixedAmount = dto.DiscountFixedAmount,
                DurationMonths = dto.DurationMonths,
                MaxUses = dto.MaxUses,
                ValidForDays = dto.ValidForDays,
                ExpiresAt = dto.ExpiresAt,
                SubscriptionPlanId = dto.SubscriptionPlanId,
                IsActive = true
            };

            // Auto-set ExpiresAt from ValidForDays if not explicitly set
            if (!coupon.ExpiresAt.HasValue && coupon.ValidForDays.HasValue)
            {
                coupon.ExpiresAt = DateTime.UtcNow.AddDays(coupon.ValidForDays.Value);
            }

            _db.Coupons.Add(coupon);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Created coupon {Code} with {Percent}% discount", coupon.Code, coupon.DiscountPercent);

            return await MapToDto(coupon);
        }

        public async Task<CouponDto?> GetCouponAsync(int id)
        {
            var coupon = await _db.Coupons
                .Include(c => c.SubscriptionPlan)
                .FirstOrDefaultAsync(c => c.Id == id);

            return coupon != null ? await MapToDto(coupon) : null;
        }

        public async Task<List<CouponDto>> GetAllCouponsAsync(bool? activeOnly = null)
        {
            var query = _db.Coupons.Include(c => c.SubscriptionPlan).AsQueryable();

            if (activeOnly == true)
                query = query.Where(c => c.IsActive);

            var coupons = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
            var result = new List<CouponDto>();
            foreach (var c in coupons)
                result.Add(await MapToDto(c));
            return result;
        }

        public async Task<(bool Success, string? Error)> UpdateCouponAsync(int id, UpdateCouponDto dto)
        {
            var coupon = await _db.Coupons.FindAsync(id);
            if (coupon == null)
                return (false, "Coupon not found");

            if (dto.Description != null) coupon.Description = dto.Description;
            if (dto.DiscountPercent.HasValue) coupon.DiscountPercent = dto.DiscountPercent.Value;
            if (dto.DiscountFixedAmount.HasValue) coupon.DiscountFixedAmount = dto.DiscountFixedAmount.Value;
            if (dto.DurationMonths.HasValue) coupon.DurationMonths = dto.DurationMonths.Value;
            if (dto.MaxUses.HasValue) coupon.MaxUses = dto.MaxUses.Value;
            if (dto.ValidForDays.HasValue) coupon.ValidForDays = dto.ValidForDays.Value;
            if (dto.ExpiresAt.HasValue) coupon.ExpiresAt = dto.ExpiresAt.Value;
            if (dto.IsActive.HasValue) coupon.IsActive = dto.IsActive.Value;
            if (dto.SubscriptionPlanId.HasValue) coupon.SubscriptionPlanId = dto.SubscriptionPlanId.Value;

            coupon.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool Success, string? Error)> DeleteCouponAsync(int id)
        {
            var coupon = await _db.Coupons.FindAsync(id);
            if (coupon == null)
                return (false, "Coupon not found");

            coupon.IsActive = false;
            coupon.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return (true, null);
        }

        public async Task<ValidateCouponResponseDto> ValidateCouponAsync(string code, string planCode)
        {
            var coupon = await _db.Coupons
                .Include(c => c.SubscriptionPlan)
                .FirstOrDefaultAsync(c => c.Code == code.ToUpperInvariant().Trim());

            if (coupon == null)
                return new ValidateCouponResponseDto { IsValid = false, Message = "Código de cupón no encontrado" };

            if (!coupon.IsActive)
                return new ValidateCouponResponseDto { IsValid = false, Message = "Este cupón ya no está activo" };

            if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt.Value < DateTime.UtcNow)
                return new ValidateCouponResponseDto { IsValid = false, Message = "Este cupón ha expirado" };

            if (coupon.MaxUses.HasValue && coupon.TimesUsed >= coupon.MaxUses.Value)
                return new ValidateCouponResponseDto { IsValid = false, Message = "Este cupón ha alcanzado el límite de usos" };

            // Check plan restriction
            var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == planCode && p.IsActive);
            if (plan == null)
                return new ValidateCouponResponseDto { IsValid = false, Message = "Plan no encontrado" };

            if (coupon.SubscriptionPlanId.HasValue && coupon.SubscriptionPlanId.Value != plan.Id)
                return new ValidateCouponResponseDto { IsValid = false, Message = "Este cupón no aplica al plan seleccionado" };

            // Calculate final price
            var originalPrice = plan.Price;
            decimal finalPrice;

            if (coupon.DiscountFixedAmount.HasValue && coupon.DiscountFixedAmount.Value > 0)
            {
                finalPrice = Math.Max(0, originalPrice - coupon.DiscountFixedAmount.Value);
            }
            else
            {
                finalPrice = originalPrice * (1 - coupon.DiscountPercent / 100);
                finalPrice = Math.Max(0, Math.Round(finalPrice, 2));
            }

            var message = coupon.DiscountFixedAmount.HasValue && coupon.DiscountFixedAmount.Value > 0
                ? $"Descuento de ${coupon.DiscountFixedAmount:N0} aplicado"
                : $"Descuento del {coupon.DiscountPercent}% aplicado";

            return new ValidateCouponResponseDto
            {
                IsValid = true,
                CouponCode = coupon.Code,
                DiscountPercent = coupon.DiscountPercent,
                DiscountFixedAmount = coupon.DiscountFixedAmount,
                DurationMonths = coupon.DurationMonths,
                OriginalPrice = originalPrice,
                FinalPrice = finalPrice,
                Message = message
            };
        }

        public async Task<(bool Success, string? Error)> RedeemCouponAsync(string code)
        {
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Code == code.ToUpperInvariant().Trim());
            if (coupon == null)
                return (false, "Coupon not found");

            coupon.TimesUsed++;
            coupon.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Coupon {Code} redeemed (used {Times}/{Max})",
                coupon.Code, coupon.TimesUsed, coupon.MaxUses?.ToString() ?? "unlimited");

            return (true, null);
        }

        public string GenerateCouponCode(string prefix = "TP", int length = 8)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
            var random = new Random();
            var code = new char[length];
            for (int i = 0; i < length; i++)
                code[i] = chars[random.Next(chars.Length)];
            return $"{prefix}-{new string(code)}";
        }

        private Task<CouponDto> MapToDto(Coupon coupon)
        {
            return Task.FromResult(new CouponDto
            {
                Id = coupon.Id,
                Code = coupon.Code,
                Description = coupon.Description,
                DiscountPercent = coupon.DiscountPercent,
                DiscountFixedAmount = coupon.DiscountFixedAmount,
                DurationMonths = coupon.DurationMonths,
                MaxUses = coupon.MaxUses,
                TimesUsed = coupon.TimesUsed,
                ValidForDays = coupon.ValidForDays,
                ExpiresAt = coupon.ExpiresAt,
                IsActive = coupon.IsActive,
                SubscriptionPlanId = coupon.SubscriptionPlanId,
                PlanName = coupon.SubscriptionPlan?.Name,
                CreatedAt = coupon.CreatedAt
            });
        }
    }
}
