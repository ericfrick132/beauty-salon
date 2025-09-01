using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/verticals")]
    public class VerticalController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<VerticalController> _logger;

        public VerticalController(
            ApplicationDbContext context,
            ILogger<VerticalController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetVerticals()
        {
            try
            {
                var verticals = await _context.Verticals
                    .Select(v => new
                    {
                        id = v.Id,
                        name = v.Name,
                        code = v.Code,
                        description = v.Description,
                        domain = v.Domain
                    })
                    .OrderBy(v => v.name)
                    .ToListAsync();

                return Ok(new { 
                    success = true, 
                    data = verticals 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving verticals");
                return BadRequest(new { 
                    success = false, 
                    message = "Error retrieving verticals" 
                });
            }
        }

        [HttpGet("{code}")]
        public async Task<IActionResult> GetVerticalByCode(string code)
        {
            try
            {
                var vertical = await _context.Verticals
                    .Where(v => v.Code == code)
                    .Select(v => new
                    {
                        id = v.Id,
                        name = v.Name,
                        code = v.Code,
                        description = v.Description,
                        domain = v.Domain
                    })
                    .FirstOrDefaultAsync();

                if (vertical == null)
                {
                    return NotFound(new { 
                        success = false, 
                        message = "Vertical not found" 
                    });
                }

                return Ok(new { 
                    success = true, 
                    data = vertical 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving vertical with code {Code}", code);
                return BadRequest(new { 
                    success = false, 
                    message = "Error retrieving vertical" 
                });
            }
        }

    }
}