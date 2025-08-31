using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Services.Interfaces
{
    public interface IBookingStatusService
    {
        Task<BookingStatusUpdateResult> UpdateStatusAsync(Guid bookingId, UpdateBookingStatusDto dto);
        Task<IEnumerable<BookingStatusHistoryItem>> GetStatusHistoryAsync(Guid bookingId);
        Task<IEnumerable<AllowedStatusTransition>> GetAllowedTransitionsAsync(Guid bookingId);
        Task<bool> CanTransitionToStatus(string currentStatus, string newStatus);
    }

    public class BookingStatusUpdateResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public string? PreviousStatus { get; set; }
        public string? CurrentStatus { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class BookingStatusHistoryItem
    {
        public string FromStatus { get; set; } = string.Empty;
        public string ToStatus { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? Notes { get; set; }
        public DateTime ChangedAt { get; set; }
        public string? ChangedBy { get; set; }
    }

    public class AllowedStatusTransition
    {
        public string FromStatus { get; set; } = string.Empty;
        public string ToStatus { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public bool RequiresReason { get; set; }
        public string? Description { get; set; }
    }
}