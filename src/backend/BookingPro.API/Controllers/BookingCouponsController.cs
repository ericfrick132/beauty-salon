using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using BookingPro.API.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>Cupones de descuento del negocio para sus clientes (Advance en adelante).</summary>
    [ApiController]
    [Route("api/booking-coupons")]
    [Authorize]
    [TenantStaffOnly]
    public class BookingCouponsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IPlanEntitlementService _plans;
        private readonly IBookingExtrasService _extras;

        public BookingCouponsController(ApplicationDbContext context, ITenantProvider tenantProvider, IPlanEntitlementService plans, IBookingExtrasService extras)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _plans = plans;
            _extras = extras;
        }

        public class BookingCouponDto
        {
            public string Code { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string DiscountType { get; set; } = BookingCouponTypes.Percent;
            public decimal DiscountValue { get; set; }
            public int? MaxUses { get; set; }
            public DateTime? ExpiresAt { get; set; }
            public bool IsActive { get; set; } = true;
        }

        public class BookingCouponResponse
        {
            public Guid Id { get; set; }
            public string Code { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string DiscountType { get; set; } = string.Empty;
            public decimal DiscountValue { get; set; }
            public int? MaxUses { get; set; }
            public int UsedCount { get; set; }
            public DateTime? ExpiresAt { get; set; }
            public bool IsActive { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime UpdatedAt { get; set; }

            public static BookingCouponResponse From(BookingCoupon c) => new()
            {
                Id = c.Id, Code = c.Code, Description = c.Description, DiscountType = c.DiscountType, DiscountValue = c.DiscountValue,
                MaxUses = c.MaxUses, UsedCount = c.UsedCount, ExpiresAt = c.ExpiresAt, IsActive = c.IsActive,
                CreatedAt = c.CreatedAt, UpdatedAt = c.UpdatedAt,
            };
        }

        /// <summary>Lista igual aunque el plan no incluya cupones: el panel muestra el paywall con lo que ya tenía.</summary>
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var coupons = await _context.BookingCoupons
                .Where(c => c.TenantId == tenantId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.Coupons);
            return Ok(new { allowed = feature.Allowed, coupons = coupons.Select(BookingCouponResponse.From) });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BookingCouponDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.Coupons);
            if (!feature.Allowed) return PlanLimitResult.From(feature);

            var error = Validate(dto);
            if (error != null) return BadRequest(new { message = error });

            var code = _extras.NormalizeCode(dto.Code);
            if (await _context.BookingCoupons.AnyAsync(c => c.TenantId == tenantId && c.Code == code))
                return Conflict(new { message = $"Ya tenés un cupón {code}." });

            var coupon = new BookingCoupon { TenantId = tenantId, Code = code };
            Apply(coupon, dto);
            _context.BookingCoupons.Add(coupon);
            await _context.SaveChangesAsync();
            return Ok(BookingCouponResponse.From(coupon));
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] BookingCouponDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.Coupons);
            if (!feature.Allowed) return PlanLimitResult.From(feature);

            var coupon = await _context.BookingCoupons.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == id);
            if (coupon == null) return NotFound();

            var error = Validate(dto);
            if (error != null) return BadRequest(new { message = error });

            var code = _extras.NormalizeCode(dto.Code);
            if (code != coupon.Code && await _context.BookingCoupons.AnyAsync(c => c.TenantId == tenantId && c.Code == code))
                return Conflict(new { message = $"Ya tenés un cupón {code}." });

            coupon.Code = code;
            Apply(coupon, dto);
            await _context.SaveChangesAsync();
            return Ok(BookingCouponResponse.From(coupon));
        }

        /// <summary>Se desactiva en vez de borrarse: las reservas que lo usaron lo siguen nombrando.</summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var coupon = await _context.BookingCoupons.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == id);
            if (coupon == null) return NotFound();
            coupon.IsActive = false;
            coupon.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static string? Validate(BookingCouponDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code) || dto.Code.Trim().Length < 3 || dto.Code.Trim().Length > 40)
                return "El código tiene que tener entre 3 y 40 caracteres.";
            if (dto.DiscountType != BookingCouponTypes.Percent && dto.DiscountType != BookingCouponTypes.Fixed)
                return "El tipo de descuento tiene que ser porcentaje o monto fijo.";
            if (dto.DiscountValue <= 0) return "El descuento tiene que ser mayor a 0.";
            if (dto.DiscountType == BookingCouponTypes.Percent && dto.DiscountValue > 100) return "El porcentaje no puede pasar de 100.";
            if (dto.MaxUses.HasValue && dto.MaxUses.Value < 1) return "El tope de usos tiene que ser al menos 1.";
            return null;
        }

        private static void Apply(BookingCoupon coupon, BookingCouponDto dto)
        {
            coupon.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            coupon.DiscountType = dto.DiscountType;
            coupon.DiscountValue = dto.DiscountValue;
            coupon.MaxUses = dto.MaxUses;
            coupon.ExpiresAt = dto.ExpiresAt;
            coupon.IsActive = dto.IsActive;
            coupon.UpdatedAt = DateTime.UtcNow;
        }
    }
}
