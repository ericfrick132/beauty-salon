using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers;

/// <summary>
/// Promos automáticas de sales-hub (contrato docs/promo-calendar/CONTRATO-APPS.md en sales-hub):
/// 7 días antes de cada fecha, sales-hub crea/actualiza la promo de /promo y su cupón. Misma auth que
/// HubMetricsController: header X-Api-Key contra SalesHub:HubApiKey; sin key configurada → 401.
/// </summary>
[ApiController]
[Route("api/hub/promos")]
[AllowAnonymous]
public class HubPromosController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<HubPromosController> _logger;

    public HubPromosController(ApplicationDbContext db, IConfiguration config, ILogger<HubPromosController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    private bool ApiKeyOk()
    {
        var expected = _config["SalesHub:HubApiKey"];
        var given = Request.Headers["X-Api-Key"].FirstOrDefault();
        return !string.IsNullOrEmpty(expected) && !string.IsNullOrEmpty(given)
            && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(expected));
    }

    public class UpsertPromoDto
    {
        public string? Slug { get; set; }
        public string? Code { get; set; }
        public string? Title { get; set; }
        public string? Headline { get; set; }
        public string? Subheadline { get; set; }
        public List<string>? Bullets { get; set; }
        public string? Description { get; set; }
        public decimal DiscountPercent { get; set; }
        public int? DurationMonths { get; set; }
        public DateTimeOffset StartsAt { get; set; }
        public DateTimeOffset EndsAt { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageCredit { get; set; }
    }

    private static string? Clip(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        return v.Length > max ? v[..max] : v;
    }

    /// <summary>Upsert idempotente de la promo (por slug) y de su cupón (por código, sin distinguir mayúsculas).</summary>
    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertPromoDto dto)
    {
        if (!ApiKeyOk()) return Unauthorized();

        var slug = (dto.Slug ?? string.Empty).Trim().ToLowerInvariant();
        var code = PromoCouponService.NormalizeCode(dto.Code);
        var title = Clip(dto.Title, 200);
        if (slug.Length == 0 || slug.Length > 120)
            return BadRequest(new { ok = false, error = "slug requerido (máx. 120)" });
        if (code.Length == 0 || code.Length > 50)
            return BadRequest(new { ok = false, error = "code requerido (máx. 50)" });
        if (title == null)
            return BadRequest(new { ok = false, error = "title requerido" });
        if (dto.DiscountPercent <= 0 || dto.DiscountPercent >= 100)
            return BadRequest(new { ok = false, error = "discountPercent tiene que estar entre 0 y 100" });
        if (dto.DurationMonths is <= 0)
            return BadRequest(new { ok = false, error = "durationMonths tiene que ser mayor a 0" });
        if (dto.EndsAt <= dto.StartsAt)
            return BadRequest(new { ok = false, error = "endsAt tiene que ser posterior a startsAt" });

        var now = DateTime.UtcNow;
        var startsAt = dto.StartsAt.UtcDateTime;
        var endsAt = dto.EndsAt.UtcDateTime;

        var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Code.ToUpper() == code);
        if (coupon == null)
        {
            coupon = new Coupon { Code = code, CreatedAt = now };
            _db.Coupons.Add(coupon);
        }
        coupon.DiscountPercent = dto.DiscountPercent;
        coupon.DiscountFixedAmount = null;
        coupon.DurationMonths = dto.DurationMonths;
        coupon.ExpiresAt = endsAt;
        coupon.ValidForDays = null;
        coupon.MaxUses = null;
        coupon.IsActive = true;
        coupon.Description = Clip($"Promo {title}", 500);
        coupon.UpdatedAt = now;

        var promos = _db.Set<Promo>();
        var promo = await promos.FirstOrDefaultAsync(p => p.Slug == slug);
        if (promo == null)
        {
            promo = new Promo { Slug = slug, CreatedAt = now };
            promos.Add(promo);
        }
        promo.Coupon = coupon;
        promo.Code = code;
        promo.Title = title;
        promo.Headline = Clip(dto.Headline, 300);
        promo.Subheadline = Clip(dto.Subheadline, 1000);
        promo.Bullets = (dto.Bullets ?? new List<string>())
            .Select(b => Clip(b, 300))
            .Where(b => b != null)
            .Select(b => b!)
            .Take(10)
            .ToList();
        promo.Description = Clip(dto.Description, 2000);
        promo.DiscountPercent = dto.DiscountPercent;
        promo.DurationMonths = dto.DurationMonths;
        promo.StartsAt = startsAt;
        promo.EndsAt = endsAt;
        promo.ImageUrl = Clip(dto.ImageUrl, 1000);
        promo.ImageCredit = Clip(dto.ImageCredit, 300);
        promo.IsActive = true;
        promo.UpdatedAt = now;

        await _db.SaveChangesAsync();
        _logger.LogInformation("Promo {Slug} (cupón {Code}, {Percent}% x {Months} meses, {Starts:o} → {Ends:o}) creada/actualizada por sales-hub",
            slug, code, dto.DiscountPercent, dto.DurationMonths, startsAt, endsAt);

        return Ok(new { ok = true, code, landingUrl = LandingUrl() });
    }

    /// <summary>Desactiva la promo y su cupón. 404 si no existe.</summary>
    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug)
    {
        if (!ApiKeyOk()) return Unauthorized();

        var normalized = (slug ?? string.Empty).Trim().ToLowerInvariant();
        var promo = await _db.Set<Promo>().Include(p => p.Coupon).FirstOrDefaultAsync(p => p.Slug == normalized);
        if (promo == null) return NotFound(new { ok = false });

        var now = DateTime.UtcNow;
        promo.IsActive = false;
        promo.UpdatedAt = now;
        if (promo.Coupon != null)
        {
            promo.Coupon.IsActive = false;
            promo.Coupon.UpdatedAt = now;
        }
        await _db.SaveChangesAsync();
        _logger.LogInformation("Promo {Slug} y cupón {Code} desactivados por sales-hub", normalized, promo.Code);
        return Ok(new { ok = true });
    }

    private string LandingUrl()
    {
        var baseUrl = _config["Marketing:PublicUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = _config["FrontendUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = "https://turnos-pro.com";
        return baseUrl.TrimEnd('/') + "/promo";
    }
}
