using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/admin/message-packages")]
    [Authorize(Roles = "super_admin")]
    public class MessagePackagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MessagePackagesController> _logger;

        public MessagePackagesController(ApplicationDbContext context, ILogger<MessagePackagesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> List()
        {
            var items = await _context.MessagePackages
                .OrderBy(p => p.Quantity)
                .Select(p => new MessagePackageDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Quantity = p.Quantity,
                    Price = p.Price,
                    Currency = p.Currency,
                    IsActive = p.IsActive
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMessagePackageDto dto)
        {
            var entity = new MessagePackage
            {
                Name = dto.Name,
                Quantity = dto.Quantity,
                Price = dto.Price,
                Currency = dto.Currency,
                IsActive = dto.IsActive
            };
            _context.MessagePackages.Add(entity);
            await _context.SaveChangesAsync();
            return Ok(new { id = entity.Id });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMessagePackageDto dto)
        {
            var pack = await _context.MessagePackages.FindAsync(id);
            if (pack == null) return NotFound();

            pack.Name = dto.Name;
            pack.Quantity = dto.Quantity;
            pack.Price = dto.Price;
            pack.Currency = dto.Currency;
            pack.IsActive = dto.IsActive;
            pack.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var pack = await _context.MessagePackages.FindAsync(id);
            if (pack == null) return NotFound();
            _context.MessagePackages.Remove(pack);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}

