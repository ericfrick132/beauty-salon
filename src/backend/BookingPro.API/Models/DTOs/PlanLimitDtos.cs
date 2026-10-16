namespace BookingPro.API.Models.DTOs
{
    /// <summary>
    /// Cuerpo del 403 cuando una acción supera el plan. El panel lo intercepta por Code y abre
    /// "pasate de plan" mostrando el límite que se tocó.
    /// </summary>
    public class PlanLimitErrorDto
    {
        public const string ErrorCode = "PLAN_LIMIT";

        public string Code { get; set; } = ErrorCode;
        /// <summary>bookings_per_month | staff | services | coupons | custom_fields | recurring_bookings | customer_history | tracking_pixels</summary>
        public string Limit { get; set; } = string.Empty;
        public int Max { get; set; }
        public int Used { get; set; }
        public string PlanCode { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public string? Message { get; set; }
    }
}
