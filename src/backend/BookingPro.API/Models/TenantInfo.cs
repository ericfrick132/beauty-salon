namespace BookingPro.API.Models
{
    public class TenantInfo
    {
        public Guid Id { get; set; }
        public string Subdomain { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
        public string VerticalCode { get; set; } = string.Empty;
        public string SchemaName { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
        public string TimeZone { get; set; } = "-3";
        public TenantTheme Theme { get; set; } = new();
        public Dictionary<string, bool> Features { get; set; } = new();
        public Dictionary<string, string> Terminology { get; set; } = new();
    }

    public class TenantTheme
    {
        public string PrimaryColor { get; set; } = "#000000";
        public string SecondaryColor { get; set; } = "#FFFF00";
        public string AccentColor { get; set; } = "#FFFFFF";
        public string FontFamily { get; set; } = "Inter";
    }
}