using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    public class TrackingEvent
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string EventType { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Url { get; set; }

        [MaxLength(100)]
        public string? UtmSource { get; set; }

        [MaxLength(100)]
        public string? UtmMedium { get; set; }

        [MaxLength(200)]
        public string? UtmCampaign { get; set; }

        [MaxLength(100)]
        public string? Referrer { get; set; }

        [MaxLength(50)]
        public string? Device { get; set; }

        [MaxLength(45)]
        public string? IpAddress { get; set; }

        [MaxLength(500)]
        public string? UserAgent { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
