using System.ComponentModel.DataAnnotations;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Models.Entities
{
    /// <summary>
    /// Gasto que el negocio carga a mano (alquiler, servicios, insumos...). Los sueldos fijos y las
    /// comisiones del equipo ya salen solos de Employee; acá va lo que no pasa por la agenda.
    /// </summary>
    public class Expense : ITenantEntity
    {
        public Guid TenantId { get; set; }
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Día del gasto, en UTC a medianoche.</summary>
        public DateTime Date { get; set; }

        /// <summary>Una de ExpenseCategories.</summary>
        [Required, MaxLength(30)]
        public string Category { get; set; } = ExpenseCategories.Other;

        [MaxLength(200)]
        public string? Description { get; set; }

        public decimal Amount { get; set; }

        /// <summary>Gasto fijo de todos los meses: "Copiar fijos del mes anterior" lo repite.</summary>
        public bool IsRecurring { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class ExpenseCategories
    {
        public const string Rent = "alquiler";
        public const string Salaries = "sueldos";
        public const string Utilities = "servicios";
        public const string Supplies = "insumos";
        public const string Taxes = "impuestos";
        public const string Marketing = "marketing";
        public const string Maintenance = "mantenimiento";
        public const string Other = "otros";

        public static readonly string[] All = { Rent, Salaries, Utilities, Supplies, Taxes, Marketing, Maintenance, Other };
    }
}
