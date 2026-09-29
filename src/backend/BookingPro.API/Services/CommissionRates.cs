using BookingPro.API.Models.Entities;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Porcentajes de comisión efectivos de un empleado. Única fuente de verdad para
    /// liquidación, reportes y dashboard: si no tiene un % específico cae al general.
    /// </summary>
    public static class CommissionRates
    {
        public static bool EarnsCommission(Employee e) =>
            e.PaymentMethod == "percentage" || e.PaymentMethod == "mixed";

        public static decimal ServicePct(Employee e) =>
            e.ServiceCommissionPercentage > 0 ? e.ServiceCommissionPercentage : e.CommissionPercentage;

        public static decimal ProductPct(Employee e) =>
            e.ProductCommissionPercentage > 0 ? e.ProductCommissionPercentage : ServicePct(e);
    }
}
