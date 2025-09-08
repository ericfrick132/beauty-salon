namespace BookingPro.API.Models.DTOs
{
    public class MessagePackageDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "ARS";
        public bool IsActive { get; set; }
    }

    public class CreateMessagePackageDto
    {
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "ARS";
        public bool IsActive { get; set; } = true;
    }

    public class UpdateMessagePackageDto : CreateMessagePackageDto { }

    public class PurchaseMessagePackageRequestDto
    {
        public Guid PackageId { get; set; }
    }

    public class PurchaseMessagePackageResponseDto
    {
        public Guid PurchaseId { get; set; }
        public string PaymentLink { get; set; } = string.Empty;
        public string PreferenceId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class TenantMessagingSettingsDto
    {
        public bool WhatsAppRemindersEnabled { get; set; }
        public int ReminderAdvanceMinutes { get; set; }
    }

    public class MessageBalanceDto
    {
        public int Balance { get; set; }
        public int TotalPurchased { get; set; }
        public int TotalSent { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

