using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    public class NotificationSettings
    {
        public int Id { get; set; }

        [MaxLength(50)]
        public string EventType { get; set; } = string.Empty;

        public bool WhatsAppEnabled { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
