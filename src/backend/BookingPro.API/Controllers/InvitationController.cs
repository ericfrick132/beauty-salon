using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvitationController : ControllerBase
    {
        private readonly IInvitationService _invitationService;
        private readonly ILogger<InvitationController> _logger;

        public InvitationController(
            IInvitationService invitationService,
            ILogger<InvitationController> logger)
        {
            _invitationService = invitationService;
            _logger = logger;
        }

        [HttpPost]
        [Authorize(Roles = "super_admin")]
        public async Task<IActionResult> CreateInvitation([FromBody] CreateInvitationDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _invitationService.CreateInvitationAsync(dto);
            
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { 
                success = true, 
                data = result.Data,
                message = "Invitación creada exitosamente"
            });
        }

        [HttpGet("{token}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetInvitation(string token)
        {
            var result = await _invitationService.GetInvitationByTokenAsync(token);
            
            if (!result.Success)
            {
                return NotFound(new { message = result.Message });
            }

            return Ok(new { 
                success = true, 
                data = result.Data 
            });
        }

        [HttpPost("accept")]
        [AllowAnonymous]
        public async Task<IActionResult> AcceptInvitation([FromBody] AcceptInvitationDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _invitationService.AcceptInvitationAsync(dto);
            
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { 
                success = true, 
                data = new { tenantUrl = result.Data },
                message = "¡Tenant creado exitosamente! Ya puedes acceder a tu plataforma."
            });
        }

        [HttpGet]
        [Authorize(Roles = "super_admin")]
        public async Task<IActionResult> GetPendingInvitations()
        {
            var result = await _invitationService.GetPendingInvitationsAsync();
            
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { 
                success = true, 
                data = result.Data 
            });
        }

        [HttpPost("{id}/cancel")]
        [Authorize(Roles = "super_admin")]
        public async Task<IActionResult> CancelInvitation(Guid id)
        {
            var result = await _invitationService.CancelInvitationAsync(id);
            
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { 
                success = true,
                message = "Invitación cancelada exitosamente"
            });
        }

        [HttpPost("{id}/resend")]
        [Authorize(Roles = "super_admin")]
        public async Task<IActionResult> ResendInvitation(Guid id)
        {
            var result = await _invitationService.ResendInvitationAsync(id);
            
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { 
                success = true,
                message = "Invitación reenviada exitosamente"
            });
        }
    }
}