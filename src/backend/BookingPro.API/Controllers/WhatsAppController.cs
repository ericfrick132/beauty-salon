using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/whatsapp")]
    [Authorize]
    public class WhatsAppController : ControllerBase
    {
        private readonly IWhatsAppConnectionService _connectionService;
        private readonly ITenantService _tenantService;

        public WhatsAppController(
            IWhatsAppConnectionService connectionService,
            ITenantService tenantService)
        {
            _connectionService = connectionService;
            _tenantService = tenantService;
        }

        [HttpPost("connect")]
        public async Task<IActionResult> Connect()
        {
            var result = await _connectionService.ConnectAsync();
            if (!result.Success)
                return BadRequest(new { error = result.Message });
            return Ok(result.Data);
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var result = await _connectionService.GetStatusAsync();
            if (!result.Success)
                return BadRequest(new { error = result.Message });
            return Ok(result.Data);
        }

        [HttpPost("refresh-qr")]
        public async Task<IActionResult> RefreshQr()
        {
            var result = await _connectionService.RefreshQrAsync();
            if (!result.Success)
                return BadRequest(new { error = result.Message });
            return Ok(new { qrCodeBase64 = result.Data });
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect()
        {
            var result = await _connectionService.DisconnectAsync();
            if (!result.Success)
                return BadRequest(new { error = result.Message });
            return Ok(new { success = true });
        }

        [HttpPost("send-test")]
        public async Task<IActionResult> SendTest([FromBody] SendTestDto dto)
        {
            var tenant = _tenantService.GetCurrentTenant();
            if (tenant == null)
                return BadRequest(new { error = "No tenant context" });

            var result = await _connectionService.SendTextAsync(tenant.Id, dto.Phone, dto.Message);
            if (!result.Success)
                return BadRequest(new { error = result.Message });
            return Ok(new { success = true, messageId = result.Data });
        }
    }
}
