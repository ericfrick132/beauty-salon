using System;
using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    public class MercadoPagoConfiguration : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();
        
        // OAuth credentials from MercadoPago
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public string? PublicKey { get; set; }
        public string? UserId { get; set; }
        public string? UserEmail { get; set; }
        public DateTime? TokenExpiresAt { get; set; }
        
        // Payment settings - Now configured per service, keeping just global settings
        public int PaymentExpirationMinutes { get; set; } = 5; // Default 5 minutes to pay
        public bool UseSandbox { get; set; } = false;
        
        // Integration status
        public bool IsActive { get; set; } = false;
        public DateTime? ConnectedAt { get; set; }
        public DateTime? DisconnectedAt { get; set; }
        
        // Audit fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Tenant Tenant { get; set; } = null!;
    }
}