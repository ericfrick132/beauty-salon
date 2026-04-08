using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    public class NotificationSettings
    {
        public int Id { get; set; }

        [MaxLength(50)]
        public string EventType { get; set; } = string.Empty;

        public bool WhatsAppEnabled { get; set; } = true;

        public bool FollowUpWhatsAppEnabled { get; set; } = false;

        public string? FollowUpWhatsAppMessage { get; set; }

        public bool FollowUpEmailEnabled { get; set; } = false;

        [MaxLength(100)]
        public string? FollowUpEmailTemplateKey { get; set; }

        public int FollowUpDelayMinutes { get; set; } = 0;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
