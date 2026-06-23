using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;

namespace BookingPro.API.Controllers;

/// <summary>
/// Expone los leads (tenants en trial / demo) para que SalesHub centralice el re-engagement.
/// Vive bajo /api/platform/* (skip-list del TenantResolutionMiddleware, no necesita tenant en
/// contexto) y se autentica por API key (header X-Api-Key contra SalesHub:ApiKey).
/// </summary>
[ApiController]
[Route("api/platform/leads-export")]
[AllowAnonymous]
public class LeadsExportController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public LeadsExportController(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private bool ApiKeyOk()
    {
        var expected = _config["SalesHub:ApiKey"];
        var given = Request.Headers["X-Api-Key"].FirstOrDefault();
        return !string.IsNullOrEmpty(expected) && !string.IsNullOrEmpty(given)
            && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(expected));
    }

    /// <summary>Leads a re-contactar (tenants trial/demo no exportados todavía).</summary>
    [HttpGet]
    public async Task<IActionResult> Export([FromQuery] DateTime? since, [FromQuery] int limit = 200)
    {
        if (!ApiKeyOk()) return Unauthorized();

        var q = _db.Tenants.AsNoTracking()
            .Where(t => t.ExportedToSalesHubAt == null)
            .Where(t => t.Status == "trial" || t.IsDemo)
            .Where(t => (t.OwnerPhone != null && t.OwnerPhone != "") || t.OwnerEmail != "");
        if (since.HasValue) q = q.Where(t => t.CreatedAt >= since.Value);

        var leads = await q.OrderBy(t => t.CreatedAt).Take(Math.Clamp(limit, 1, 1000))
            .Select(t => new
            {
                externalId = t.Id,
                name = t.OwnerName ?? t.BusinessName,
                businessName = t.BusinessName,
                phone = t.OwnerPhone,
                email = t.OwnerEmail,
                status = t.Status,
                trialEndsAt = t.TrialEndsAt,
                lastActivity = t.UpdatedAt,
                createdAt = t.CreatedAt
            })
            .ToListAsync();

        return Ok(leads);
    }

    /// <summary>Marca un tenant como exportado para no traerlo dos veces.</summary>
    [HttpPost("{id:guid}/mark")]
    public async Task<IActionResult> Mark(Guid id)
    {
        if (!ApiKeyOk()) return Unauthorized();
        var t = await _db.Tenants.FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) return NotFound();
        t.ExportedToSalesHubAt = DateTime.UtcNow;
        t.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { id, exportedAt = t.ExportedToSalesHubAt });
    }
}
