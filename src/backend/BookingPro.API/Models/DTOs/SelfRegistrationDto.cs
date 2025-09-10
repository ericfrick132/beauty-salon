using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.DTOs
{
    public class SelfRegistrationDto
    {
        [Required(ErrorMessage = "El tipo de negocio es requerido")]
        [MaxLength(50)]
        public string VerticalCode { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "El subdominio es requerido")]
        [MaxLength(100)]
        [RegularExpression(@"^[a-z0-9-]+$", ErrorMessage = "El subdominio solo puede contener letras minúsculas, números y guiones")]
        [MinLength(3, ErrorMessage = "El subdominio debe tener al menos 3 caracteres")]
        public string Subdomain { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "El nombre del negocio es requerido")]
        [MaxLength(255)]
        public string BusinessName { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? BusinessAddress { get; set; }
        
        [Required(ErrorMessage = "El email es requerido")]
        [EmailAddress(ErrorMessage = "El email no tiene un formato válido")]
        [MaxLength(255)]
        public string AdminEmail { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "El nombre es requerido")]
        [MaxLength(100)]
        public string AdminFirstName { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "El apellido es requerido")]
        [MaxLength(100)]
        public string AdminLastName { get; set; } = string.Empty;
        
        [MaxLength(50)]
        [RegularExpression(@"^[\+]?[1-9][\d]{0,15}$", ErrorMessage = "El teléfono no tiene un formato válido")]
        public string? AdminPhone { get; set; }
        
        [Required(ErrorMessage = "La contraseña es requerida")]
        [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", 
            ErrorMessage = "La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial")]
        public string AdminPassword { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "La confirmación de contraseña es requerida")]
        [Compare("AdminPassword", ErrorMessage = "Las contraseñas no coinciden")]
        public string ConfirmPassword { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? TimeZone { get; set; } = "America/Argentina/Buenos_Aires";
        
        [MaxLength(10)]
        public string? Currency { get; set; } = "ARS";
        
        [MaxLength(10)]
        public string? Language { get; set; } = "es";
        
        // Demo settings - always true for self-registration
        public bool IsDemo { get; set; } = true;
        public int DemoDays { get; set; } = 7;
    }

    public class SelfRegistrationResponseDto
    {
        public Guid TenantId { get; set; }
        public string TenantUrl { get; set; } = string.Empty;
        public string Subdomain { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
        public bool IsDemo { get; set; }
        public int DemoDays { get; set; }
        public DateTime DemoExpiresAt { get; set; }
        // Auto-login support
        public string? Token { get; set; }
        public string? RedirectUrl { get; set; }
    }

    public class CheckSubdomainDto
    {
        public bool Available { get; set; }
        public string? Message { get; set; }
        public string[] Suggestions { get; set; } = Array.Empty<string>();
    }
}
