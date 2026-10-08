using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Token de notificaciones push de un teléfono donde un usuario del negocio inició sesión en la app
    /// (FCM en Android, APNs en iOS). Tabla de plataforma (sin filtro por tenant): el token es único y si
    /// otro usuario inicia sesión en el mismo teléfono, el registro pasa a ese usuario.
    /// </summary>
    public class DeviceToken
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public Guid UserId { get; set; }

        [Required, MaxLength(10)]
        public string Platform { get; set; } = string.Empty; // android | ios

        [Required, MaxLength(512)]
        public string Token { get; set; } = string.Empty;

        /// <summary>APNs: "sandbox" (build de Xcode) o "production" (TestFlight / App Store).</summary>
        [MaxLength(20)]
        public string? Environment { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
