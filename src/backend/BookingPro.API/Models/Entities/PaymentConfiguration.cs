using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingPro.API.Models.Entities
{
    [Table("payment_configurations")]
    public class PaymentConfiguration
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid TenantId { get; set; }
        
        // MercadoPago Credentials (encrypted in DB)
        [MaxLength(500)]
        public string? MercadoPagoPublicKey { get; set; }
        
        [MaxLength(500)]
        public string? MercadoPagoAccessToken { get; set; }
        
        // Configuration
        public bool IsEnabled { get; set; } = false;
        
        public bool IsSandbox { get; set; } = true;
        
        // Payment Settings
        public bool RequireImmediatePayment { get; set; } = false; // Si true, requiere pago al hacer la reserva
        
        public decimal? MinimumDepositPercentage { get; set; } // Porcentaje mínimo de seña
        
        public decimal? MinimumDepositAmount { get; set; } // Monto mínimo de seña
        
        // Webhook Configuration
        [MaxLength(500)]
        public string? WebhookSecret { get; set; } // Para validar notificaciones de MP
        
        // Fee Configuration
        public decimal ServiceFeePercentage { get; set; } = 0; // Comisión del sistema (si aplica)
        
        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation
        public Tenant Tenant { get; set; } = null!;
    }
}