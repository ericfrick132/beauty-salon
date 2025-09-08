using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/inventory")]
    [Authorize]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly ILogger<InventoryController> _logger;

        public InventoryController(IInventoryService inventoryService, ILogger<InventoryController> logger)
        {
            _inventoryService = inventoryService;
            _logger = logger;
        }

        // Products
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts([FromQuery] bool includeInactive = false)
        {
            var products = await _inventoryService.GetProductsAsync(includeInactive);
            return Ok(products);
        }

        [HttpGet("products/by-barcode/{barcode}")]
        public async Task<IActionResult> GetProductByBarcode([FromRoute] long barcode)
        {
            var product = await _inventoryService.GetProductByBarcodeAsync(barcode);
            if (product == null) return NotFound(new { error = "Producto no encontrado" });
            return Ok(product);
        }

        [HttpPost("products")]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto dto)
        {
            try
            {
                var user = User.Identity?.Name;
                var product = await _inventoryService.CreateProductAsync(dto, user);
                return Ok(product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating product");
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("products/{id}")]
        public async Task<IActionResult> UpdateProduct([FromRoute] Guid id, [FromBody] UpdateProductDto dto)
        {
            try
            {
                var user = User.Identity?.Name;
                var product = await _inventoryService.UpdateProductAsync(id, dto, user);
                return Ok(product);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating product");
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("products/{id}")]
        public async Task<IActionResult> DeleteProduct([FromRoute] Guid id)
        {
            var ok = await _inventoryService.DeleteProductAsync(id);
            return ok ? Ok(new { success = true }) : NotFound(new { error = "Producto no encontrado" });
        }

        // Stock
        [HttpPost("stock/{productId}")]
        public async Task<IActionResult> UpdateStock([FromRoute] Guid productId, [FromBody] UpdateStockDto dto)
        {
            try
            {
                var user = User.Identity?.Name;
                var result = await _inventoryService.UpdateStockAsync(productId, dto, user);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating stock");
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("price-history/{productId}")]
        public async Task<IActionResult> GetPriceHistory([FromRoute] Guid productId)
        {
            var history = await _inventoryService.GetPriceHistoryAsync(productId);
            return Ok(history);
        }

        // Dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var data = await _inventoryService.GetDashboardAsync();
            return Ok(data);
        }
    }
}

