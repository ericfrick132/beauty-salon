using BookingPro.API.Models.Entities;
using BookingPro.API.DTOs;

namespace BookingPro.API.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
        Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
        Task<bool> ValidateTokenAsync(string token);
        string GenerateJwtToken(User user);
        Task<User?> GetUserByEmailAsync(string email, Guid tenantId);
        Task<BookingPro.API.Models.Common.ServiceResult<string>> GeneratePasswordResetTokenAsync(string email);
        Task<BookingPro.API.Models.Common.ServiceResult<bool>> ResetPasswordAsync(string token, string newPassword);
    }
}
