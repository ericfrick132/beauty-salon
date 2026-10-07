using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Controllers
{
    /// <summary>
    /// Compras in-app de add-ons y créditos de mensajería (App Store; Google Play después). La app
    /// las manda después de comprar y finaliza la transacción solo si esto responde 200: un 200 con
    /// alreadyProcessed=true también la finaliza (ya estaba acreditada).
    /// </summary>
    [ApiController]
    [Route("api/store/purchases")]
    [Authorize]
    public class StorePurchasesController : ControllerBase
    {
        private readonly IStorePurchaseService _storePurchaseService;

        public StorePurchasesController(IStorePurchaseService storePurchaseService)
        {
            _storePurchaseService = storePurchaseService;
        }

        private Guid GetTenantId()
        {
            // El JWT emite el tenant en "tenant_id" (NameIdentifier es el usuario, no el tenant).
            var tid = User.FindFirst("tenant_id")?.Value ?? User.FindFirst("tenantId")?.Value;
            return Guid.TryParse(tid, out var id) ? id : Guid.Empty;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] StorePurchaseRequestDto dto)
        {
            var tenantId = GetTenantId();
            if (tenantId == Guid.Empty) return Unauthorized();
            if (dto == null) return BadRequest(new { error = "Body requerido" });

            var result = await _storePurchaseService.ProcessPurchaseAsync(tenantId, dto);
            if (!result.Success || result.Data == null) return BadRequest(new { error = result.Message });
            return Ok(result.Data);
        }
    }
}
