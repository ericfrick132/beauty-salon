using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IMercadoPagoService _mercadoPagoService;
        private readonly ILogger<PaymentController> _logger;
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IPlanEntitlementService _plans;

        public PaymentController(
            IMercadoPagoService mercadoPagoService,
            ILogger<PaymentController> logger,
            ApplicationDbContext context,
            ITenantProvider tenantProvider,
            IPlanEntitlementService plans)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _plans = plans;
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

            // Access Token pegado a mano (el viejo respaldo de OAuth): en Argentina, con un plan con comisión,
            // no se acepta uno nuevo. Si es el mismo que ya tenía guardado, se deja guardar el resto.
            if (!string.IsNullOrWhiteSpace(dto.MercadoPagoAccessToken))
            {
                var tenantId = _tenantProvider.GetCurrentTenantId();
                var current = await _context.PaymentConfigurations.AsNoTracking()
                    .Where(pc => pc.TenantId == tenantId)
                    .Select(pc => pc.MercadoPagoAccessToken)
                    .FirstOrDefaultAsync();
                if (current != dto.MercadoPagoAccessToken)
                {
                    var blocked = await MercadoPagoManualConnection.BlockIfOAuthRequiredAsync(_context, _plans, tenantId);
                    if (blocked != null) return blocked;
                }
            }

            var result = await _mercadoPagoService.UpdatePaymentConfigurationAsync(dto);
            
            if (result.Success)
                return Ok(new { message = "Configuración actualizada exitosamente" });
            
            return BadRequest(new { error = result.Message });
        }
    }
}