using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    public interface ICouponService
    {
        Task<CouponDto> CreateCouponAsync(CreateCouponDto dto);
        Task<CouponDto?> GetCouponAsync(int id);
        Task<List<CouponDto>> GetAllCouponsAsync(bool? activeOnly = null);
        Task<(bool Success, string? Error)> UpdateCouponAsync(int id, UpdateCouponDto dto);
        Task<(bool Success, string? Error)> DeleteCouponAsync(int id);
        Task<ValidateCouponResponseDto> ValidateCouponAsync(string code, string planCode);
        Task<(bool Success, string? Error)> RedeemCouponAsync(string code);
        string GenerateCouponCode(string prefix = "TP", int length = 8);
    }
}
