using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/super-admin/coupons")]
    [Authorize(Roles = "super_admin")]
    public class SuperAdminCouponsController : ControllerBase
    {
        private readonly ICouponService _couponService;
        private readonly ILogger<SuperAdminCouponsController> _logger;

        public SuperAdminCouponsController(ICouponService couponService, ILogger<SuperAdminCouponsController> logger)
        {
            _couponService = couponService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? activeOnly = null)
        {
            var coupons = await _couponService.GetAllCouponsAsync(activeOnly);
            return Ok(new { success = true, data = coupons });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var coupon = await _couponService.GetCouponAsync(id);
            if (coupon == null)
                return NotFound(new { success = false, message = "Cupón no encontrado" });
            return Ok(new { success = true, data = coupon });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCouponDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code))
                return BadRequest(new { success = false, message = "El código es requerido" });

            try
            {
                var coupon = await _couponService.CreateCouponAsync(dto);
                _logger.LogInformation("SuperAdmin created coupon {Code}", coupon.Code);
                return Ok(new { success = true, data = coupon });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating coupon {Code}", dto.Code);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCouponDto dto)
        {
            var (success, error) = await _couponService.UpdateCouponAsync(id, dto);
            if (!success)
                return NotFound(new { success = false, message = error });
            return Ok(new { success = true, message = "Cupón actualizado" });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var (success, error) = await _couponService.DeleteCouponAsync(id);
            if (!success)
                return NotFound(new { success = false, message = error });
            return Ok(new { success = true, message = "Cupón desactivado" });
        }

        [HttpPost("generate-code")]
        public IActionResult GenerateCode([FromQuery] string prefix = "TP")
        {
            var code = _couponService.GenerateCouponCode(prefix);
            return Ok(new { success = true, data = new { code } });
        }
    }
}
