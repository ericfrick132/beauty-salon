namespace BookingPro.API.Models.DTOs
{
    public class ThemeConfigurationDto
    {
        // Colores principales
        public string PrimaryColor { get; set; } = "#1976d2";
        public string SecondaryColor { get; set; } = "#ffffff";
        public string AccentColor { get; set; } = "#ffc107";
        
        // Colores de fondo
        public string BackgroundColor { get; set; } = "#ffffff";
        public string SurfaceColor { get; set; } = "#f5f5f5";
        
        // Colores de estado
        public string ErrorColor { get; set; } = "#f44336";
        public string WarningColor { get; set; } = "#ff9800";
        public string InfoColor { get; set; } = "#2196f3";
        public string SuccessColor { get; set; } = "#4caf50";
        
        // Colores de texto
        public string TextPrimaryColor { get; set; } = "#000000";
        public string TextSecondaryColor { get; set; } = "#666666";
        
        // Colores de borde
        public string BorderColor { get; set; } = "#e0e0e0";
        
        // Configuración adicional
        public string FontFamily { get; set; } = "Roboto, Helvetica, Arial, sans-serif";
        public int BorderRadius { get; set; } = 8;
        public bool UseShadows { get; set; } = true;
        
        // Determinar automáticamente si el texto debe ser claro u oscuro basado en el color de fondo
        public bool AutoContrastText { get; set; } = true;
    }
}