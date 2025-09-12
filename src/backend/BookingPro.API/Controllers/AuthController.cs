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

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Email es requerido" });
            }

            var result = await _authService.GeneratePasswordResetTokenAsync(dto.Email);
            if (!result.Success)
            {
                // Do not reveal whether email exists
                return Ok(new { message = "Si el email existe, se envió un enlace de recuperación" });
            }

            // For now we return the token so the frontend can proceed without email infra
            return Ok(new { message = "Token generado", token = result.Data });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Token) || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "Token y nueva contraseña son requeridos" });
            }

            var result = await _authService.ResetPasswordAsync(dto.Token, dto.NewPassword);
            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { message = "Contraseña actualizada" });
        }
    }

    public class ValidateTokenDto
    {
        public string Token { get; set; } = string.Empty;
    }

    public class ForgotPasswordDto
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordDto
    {
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
