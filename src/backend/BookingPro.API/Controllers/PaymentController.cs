using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(
            IMercadoPagoService mercadoPagoService,
            ILogger<PaymentController> logger)
        {
            _mercadoPagoService = mercadoPagoService;
            _logger = logger;
        }

        [HttpPost("create-preference")]
        public async Task<IActionResult> CreatePaymentPreference([FromBody] BookingPro.API.Models.DTOs.CreatePaymentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _mercadoPagoService.CreatePaymentPreferenceAsync(dto);
            
            if (result.Success)
                return Ok(result.Data);
            
            return BadRequest(new { error = result.Message });
        }

        [HttpGet("configuration")]
        [Authorize]
        public async Task<IActionResult> GetConfiguration()
        {
            var result = await _mercadoPagoService.GetPaymentConfigurationAsync();
            
            if (result.Success)
                return Ok(result.Data);
            
            return BadRequest(new { error = result.Message });
        }

        [HttpPost("configuration")]
        [Authorize]
        public async Task<IActionResult> UpdateConfiguration([FromBody] BookingPro.API.Models.DTOs.UpdatePaymentConfigurationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _mercadoPagoService.UpdatePaymentConfigurationAsync(dto);
            
            if (result.Success)
                return Ok(new { message = "Configuración actualizada exitosamente" });
            
            return BadRequest(new { error = result.Message });
        }
    }
}