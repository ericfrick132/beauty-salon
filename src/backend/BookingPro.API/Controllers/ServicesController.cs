using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ServicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;

        public ServicesController(ApplicationDbContext context, ITenantProvider tenantProvider)
        {
            _context = context;
            _tenantProvider = tenantProvider;
        }

        [HttpGet]
        public async Task<IActionResult> GetServices()
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            
            var services = await _context.Services
                .Include(s => s.Category)
                .Where(s => s.TenantId == tenantId && s.IsActive)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Description,
                    s.DurationMinutes,
                    s.Price,
                    // Deposit/Seña configuration
                    s.RequiresDeposit,
                    s.DepositPercentage,
                    s.DepositFixedAmount,
                    s.DepositPolicy,
                    s.DepositAdvanceDays,
                    s.IsActive,
                    category = s.Category != null ? new 
                    {
                        s.Category.Id,
                        s.Category.Name
                    } : null,
                    bookingCount = s.Bookings.Count()
                })
                .ToListAsync();

            return Ok(services);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetService(Guid id)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            
            var service = await _context.Services
                .Include(s => s.Category)
                .Where(s => s.TenantId == tenantId && s.Id == id)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Description,
                    s.DurationMinutes,
                    s.Price,
                    // Deposit/Seña configuration
                    s.RequiresDeposit,
                    s.DepositPercentage,
                    s.DepositFixedAmount,
                    s.DepositPolicy,
                    s.DepositAdvanceDays,
                    s.IsActive,
                    category = s.Category != null ? new 
                    {
                        s.Category.Id,
                        s.Category.Name
                    } : null,
                    recentBookings = s.Bookings.OrderByDescending(b => b.StartTime).Take(5).Select(b => new
                    {
                        b.Id,
                        b.StartTime,
                        b.Status,
                        employeeName = b.Employee.Name,
                        customerName = b.Customer.FirstName + " " + b.Customer.LastName
                    })
                })
                .FirstOrDefaultAsync();

            if (service == null)
                return NotFound();

            return Ok(service);
        }

        [HttpPost]
        public async Task<IActionResult> CreateService([FromBody] CreateServiceDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();

            var service = new Service
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CategoryId = dto.CategoryId,
                Name = dto.Name,
                Description = dto.Description,
                DurationMinutes = dto.DurationMinutes,
                Price = dto.Price,
                // Deposit/Seña configuration
                RequiresDeposit = dto.RequiresDeposit,
                DepositPercentage = dto.DepositPercentage,
                DepositFixedAmount = dto.DepositFixedAmount,
                DepositPolicy = dto.DepositPolicy ?? "AllCustomers",
                DepositAdvanceDays = dto.DepositAdvanceDays,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Services.Add(service);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetService), new { id = service.Id }, service);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateService(Guid id, [FromBody] UpdateServiceDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            
            var service = await _context.Services
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == id);

            if (service == null)
                return NotFound();

            service.Name = dto.Name;
            service.Description = dto.Description;
            service.DurationMinutes = dto.DurationMinutes;
            service.Price = dto.Price;
            service.CategoryId = dto.CategoryId;
            service.IsActive = dto.IsActive;
            // Deposit/Seña configuration
            service.RequiresDeposit = dto.RequiresDeposit;
            service.DepositPercentage = dto.DepositPercentage;
            service.DepositFixedAmount = dto.DepositFixedAmount;
            service.DepositPolicy = dto.DepositPolicy ?? service.DepositPolicy;
            service.DepositAdvanceDays = dto.DepositAdvanceDays;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteService(Guid id)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            
            var service = await _context.Services
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == id);

            if (service == null)
                return NotFound();

            service.IsActive = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            // Los filtros globales en ApplicationDbContext ya filtran por TenantId automáticamente
            var categories = await _context.ServiceCategories
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    serviceCount = c.Services.Count(s => s.IsActive)
                })
                .ToListAsync();

            return Ok(categories);
        }
    }

    public class CreateServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DurationMinutes { get; set; }
        public decimal Price { get; set; }
        public Guid? CategoryId { get; set; }
        // Deposit/Seña configuration
        public bool RequiresDeposit { get; set; } = false;
        public decimal? DepositPercentage { get; set; }
        public decimal? DepositFixedAmount { get; set; }
        public string? DepositPolicy { get; set; }
        public int? DepositAdvanceDays { get; set; }
    }

    public class UpdateServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DurationMinutes { get; set; }
        public decimal Price { get; set; }
        public Guid? CategoryId { get; set; }
        public bool IsActive { get; set; }
        // Deposit/Seña configuration
        public bool RequiresDeposit { get; set; } = false;
        public decimal? DepositPercentage { get; set; }
        public decimal? DepositFixedAmount { get; set; }
        public string? DepositPolicy { get; set; }
        public int? DepositAdvanceDays { get; set; }
    }
}
