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
    private readonly ILogger<LeadsExportController> _logger;

    public LeadsExportController(ApplicationDbContext db, IConfiguration config, ILogger<LeadsExportController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
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

    /// <summary>
    /// Estado actual de tenants para el pull-guard de SalesHub: por cada externalId le dice si
    /// dejar de perseguir el follow-up (stopFollowup) y si fue conversión (won) o pérdida.
    /// Convención: active = convirtió (stop+won); cancelled = churneó (stop+!won);
    /// trial/suspended = seguir persiguiendo (no stop).
    /// </summary>
    [HttpGet("state")]
    public async Task<IActionResult> State([FromQuery] string externalIds)
    {
        if (!ApiKeyOk()) return Unauthorized();
        if (string.IsNullOrWhiteSpace(externalIds)) return Ok(Array.Empty<object>());

        var ids = externalIds
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue).Select(g => g!.Value).Distinct().ToList();
        if (ids.Count == 0) return Ok(Array.Empty<object>());

        var tenants = await _db.Tenants.AsNoTracking()
            .Where(t => ids.Contains(t.Id))
            .Select(t => new { t.Id, t.Status })
            .ToListAsync();

        var result = tenants.Select(t =>
        {
            var status = (t.Status ?? "").ToLowerInvariant();
            var won = status == "active";
            var stop = status == "active" || status == "cancelled";
            return new { externalId = t.Id.ToString(), stopFollowup = stop, won, status = t.Status };
        });

        return Ok(result);
    }

    public record SalesStatusCallback(string ExternalId, string Status, bool Won);

    /// <summary>
    /// Status-back desde SalesHub: avisa el estado de venta del tenant (Interested/DemoScheduled/
    /// Closed/Lost). Por ahora se loguea; persistir en el tenant (campo SalesStatus) es follow-up.
    /// </summary>
    [HttpPost("status-callback")]
    public IActionResult StatusCallback([FromBody] SalesStatusCallback body)
    {
        if (!ApiKeyOk()) return Unauthorized();
        _logger.LogInformation("SalesHub status-back: tenant {Ext} -> {Status} (won={Won})",
            body.ExternalId, body.Status, body.Won);
        return Ok(new { received = true });
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
