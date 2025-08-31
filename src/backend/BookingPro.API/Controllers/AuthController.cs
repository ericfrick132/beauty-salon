using Microsoft.AspNetCore.Mvc;
using BookingPro.API.Services;
using BookingPro.API.DTOs;
using BookingPro.API.Models.Enums;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.LoginAsync(loginDto);
            
            if (!result.Success)
            {
                return Unauthorized(new { message = result.Message });
            }

            return Ok(result);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.RegisterAsync(registerDto);
            
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(result);
        }

        [HttpPost("validate")]
        public async Task<IActionResult> ValidateToken([FromBody] ValidateTokenDto dto)
        {
            if (string.IsNullOrEmpty(dto.Token))
            {
                return BadRequest(new { message = "Token es requerido" });
            }

            var isValid = await _authService.ValidateTokenAsync(dto.Token);
            
            return Ok(new { isValid });
        }
    }

    public class ValidateTokenDto
    {
        public string Token { get; set; } = string.Empty;
    }
}