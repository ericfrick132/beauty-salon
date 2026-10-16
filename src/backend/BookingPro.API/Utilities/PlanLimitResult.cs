using BookingPro.API.Models.DTOs;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BookingPro.API.Utilities
{
    public static class PlanLimitResult
    {
        public static IActionResult From(PlanCheck check) => new ObjectResult(ToDto(check)) { StatusCode = StatusCodes.Status403Forbidden };

        public static PlanLimitErrorDto ToDto(PlanCheck check) => new()
        {
            Limit = check.Limit,
            Max = check.Max,
            Used = check.Used,
            PlanCode = check.PlanCode,
            PlanName = check.PlanName,
            Message = check.Message,
        };
    }
}
