using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers;

/// <summary>
/// Promo vigente para la página pública /promo del sitio de marketing (la crea sales-hub con
/// POST /api/hub/promos). Pública: solo devuelve lo que la landing muestra.
/// </summary>
[ApiController]
[Route("api/promos")]
[AllowAnonymous]
public class PromosController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PromosController(ApplicationDbContext db)
    {
        _db = db;
    }

    private static DateTimeOffset Iso(DateTime d) => new(DateTime.SpecifyKind(d, DateTimeKind.Utc));

    /// <summary>
    /// Con slug: esa promo si está vigente. Sin slug: la vigente que arrancó más recientemente. 404 si no hay.
    /// plans = planes pagos activos de la app (en ARS, los que cobra el débito automático) con el descuento.
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> Active([FromQuery] string? slug = null)
    {
        var now = DateTime.UtcNow;
        var query = _db.Set<Promo>().AsNoTracking()
            .Include(p => p.Coupon)
            .Where(p => p.IsActive && p.Coupon.IsActive && p.StartsAt <= now && p.EndsAt >= now);
        if (!string.IsNullOrWhiteSpace(slug))
        {
            var normalized = slug.Trim().ToLowerInvariant();
            query = query.Where(p => p.Slug == normalized);
        }

        var promo = await query.OrderByDescending(p => p.StartsAt).FirstOrDefaultAsync();
        Response.Headers["Cache-Control"] = "no-store";
        if (promo == null) return NotFound(new { message = "No hay una promo vigente" });

        var coupon = promo.Coupon;
        var plansQuery = _db.SubscriptionPlans.AsNoTracking()
            .Where(p => p.IsActive && p.Price > 0 && p.Currency == "ARS");
        if (coupon.SubscriptionPlanId.HasValue)
            plansQuery = plansQuery.Where(p => p.Id == coupon.SubscriptionPlanId.Value);
        var plans = (await plansQuery
                .OrderBy(p => p.DisplayOrder).ThenByDescending(p => p.Price)
                .Select(p => new { p.Code, p.Name, p.Price, p.Currency })
                .ToListAsync())
            .Select(p => new
            {
                code = p.Code,
                name = p.Name,
                price = p.Price,
                discountedPrice = PromoCouponService.DiscountedPrice(p.Price, coupon.DiscountPercent, coupon.DiscountFixedAmount),
                currency = p.Currency
            })
            .ToList();

        return Ok(new
        {
            slug = promo.Slug,
            code = promo.Code,
            title = promo.Title,
            headline = promo.Headline,
            subheadline = promo.Subheadline,
            bullets = promo.Bullets,
            description = promo.Description,
            discountPercent = promo.DiscountPercent,
            durationMonths = promo.DurationMonths,
            endsAt = Iso(promo.EndsAt),
            imageUrl = promo.ImageUrl,
            imageCredit = promo.ImageCredit,
            plans
        });
    }
}
