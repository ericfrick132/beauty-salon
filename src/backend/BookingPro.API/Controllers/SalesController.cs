using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/sales")]
    [Authorize]
    public class SalesController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly ILogger<SalesController> _logger;

        public SalesController(IInventoryService inventoryService, ILogger<SalesController> logger)
        {
            _inventoryService = inventoryService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> CreateSale([FromBody] CreateSaleDto dto)
        {
            try
            {
                var user = User.Identity?.Name;
                var sale = await _inventoryService.CreateSaleAsync(dto, user);
                return Ok(sale);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating sale");
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetSales([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var list = await _inventoryService.GetSalesAsync(startDate, endDate);
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSale([FromRoute] Guid id)
        {
            var sale = await _inventoryService.GetSaleByIdAsync(id);
            return sale != null ? Ok(sale) : NotFound(new { error = "Venta no encontrada" });
        }
    }
}

