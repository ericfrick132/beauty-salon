using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/chytapay")]
    [Authorize]
    public class ChytapayController : ControllerBase
    {
        private readonly IChytapayService _chytapayService;
        private readonly ILogger<ChytapayController> _logger;

        public ChytapayController(IChytapayService chytapayService, ILogger<ChytapayController> logger)
        {
            _chytapayService = chytapayService;
            _logger = logger;
        }

        private string GetTenantId()
        {
            return User.FindFirst("tenantId")?.Value ??
                   User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                   throw new UnauthorizedAccessException("TenantId not found in claims");
        }

        [HttpPost("create-payment-request")]
        public async Task<IActionResult> CreatePaymentRequest([FromBody] CreateChytapayPaymentRequestDto dto)
        {
            try
            {
                var tenantId = GetTenantId();
                var result = await _chytapayService.CreatePaymentRequestAsync(tenantId, dto);

                if (result.Success && result.Data != null)
                {
                    return Ok(result.Data);
                }
                return BadRequest(new { error = result.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Chytapay payment-request");
                return StatusCode(500, new { error = "Error creating payment request" });
            }
        }
    }
}
