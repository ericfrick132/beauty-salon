using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using BookingPro.API.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>Fotos y videos de los productos del inventario. Se guardan en DO Spaces.</summary>
    [ApiController]
    [Route("api/inventory/products/{productId:guid}/media")]
    [Authorize]
    [TenantStaffOnly]
    public class ProductMediaController : ControllerBase
    {
        private const int MaxItems = 8;
        private const long MaxImageBytes = 5L * 1024 * 1024;
        private const long MaxVideoBytes = 50L * 1024 * 1024;

        private static readonly Dictionary<string, string> ImageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
        };

        private static readonly Dictionary<string, string> VideoTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            ["video/mp4"] = ".mp4",
            ["video/webm"] = ".webm",
            ["video/quicktime"] = ".mov",
        };

        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IObjectStorageService _storage;

        public ProductMediaController(ApplicationDbContext context, ITenantProvider tenantProvider, IObjectStorageService storage)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _storage = storage;
        }

        [HttpPost]
        [RequestSizeLimit(MaxVideoBytes + 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxVideoBytes + 1024 * 1024)]
        public async Task<IActionResult> Upload(Guid productId, [FromForm] IFormFile? file)
        {
            if (!_storage.IsConfigured)
                return StatusCode(503, new { message = "La carga de fotos y videos todavía no está disponible. Probá más tarde." });

            var tenantId = _tenantProvider.GetCurrentTenantId();
            var product = await _context.Products.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == productId);
            if (product == null) return NotFound(new { message = "Producto no encontrado" });

            if (file == null || file.Length == 0) return BadRequest(new { message = "Archivo vacío" });

            string kind, ext;
            if (ImageTypes.TryGetValue(file.ContentType, out var imgExt))
            {
                if (file.Length > MaxImageBytes) return BadRequest(new { message = "La foto supera 5 MB." });
                kind = ProductMediaKinds.Image;
                ext = imgExt;
            }
            else if (VideoTypes.TryGetValue(file.ContentType, out var vidExt))
            {
                if (file.Length > MaxVideoBytes) return BadRequest(new { message = "El video supera 50 MB." });
                kind = ProductMediaKinds.Video;
                ext = vidExt;
            }
            else
            {
                return BadRequest(new { message = "Formato no permitido. Fotos: JPG, PNG o WEBP. Videos: MP4, WEBM o MOV." });
            }

            var existing = await _context.ProductMedia.Where(m => m.ProductId == productId).ToListAsync();
            if (existing.Count >= MaxItems)
                return BadRequest(new { message = $"Cada producto puede tener hasta {MaxItems} fotos o videos." });

            var id = Guid.NewGuid();
            await using var stream = file.OpenReadStream();
            var url = await _storage.UploadAsync($"turnospro/tenants/{tenantId}/products/{productId}/{id:N}{ext}", stream, file.ContentType);

            var media = new ProductMedia
            {
                Id = id,
                TenantId = tenantId,
                ProductId = productId,
                Url = url,
                Kind = kind,
                SortOrder = existing.Count == 0 ? 0 : existing.Max(m => m.SortOrder) + 1,
            };
            _context.ProductMedia.Add(media);
            product.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new ProductMediaDto { Id = media.Id, Url = media.Url, Kind = media.Kind, SortOrder = media.SortOrder });
        }

        /// <summary>Nuevo orden: la lista completa de ids. La primera foto queda como portada.</summary>
        [HttpPut("order")]
        public async Task<IActionResult> Reorder(Guid productId, [FromBody] List<Guid> ids)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var media = await _context.ProductMedia.Where(m => m.TenantId == tenantId && m.ProductId == productId).ToListAsync();
            for (var i = 0; i < ids.Count; i++)
            {
                var m = media.FirstOrDefault(x => x.Id == ids[i]);
                if (m != null) m.SortOrder = i;
            }
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{mediaId:guid}")]
        public async Task<IActionResult> Delete(Guid productId, Guid mediaId)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var media = await _context.ProductMedia
                .FirstOrDefaultAsync(m => m.TenantId == tenantId && m.ProductId == productId && m.Id == mediaId);
            if (media == null) return NotFound();

            _context.ProductMedia.Remove(media);
            await _context.SaveChangesAsync();
            await _storage.DeleteAsync(media.Url);
            return NoContent();
        }
    }
}
