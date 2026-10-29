using BookingPro.API.Data;
using BookingPro.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Utilities
{
    /// <summary>
    /// La comisión del plan se cobra como marketplace_fee, y eso solo existe cuando Mercado Pago está conectado
    /// por OAuth con la app de la plataforma. Con un token pegado a mano el cobro no lleva fee: en Argentina,
    /// los planes con comisión (Gratuito, Plus, Advance) solo pueden conectar por OAuth. Fuera de Argentina
    /// (Uruguay, México) no hay OAuth y se siguen aceptando credenciales. Solo frena conexiones nuevas: a quien
    /// ya está conectado a mano no se lo desconecta.
    /// </summary>
    public static class MercadoPagoManualConnection
    {
        public const string OAuthRequiredCode = "MP_OAUTH_REQUIRED";
        public const string OAuthRequiredMessage = "En tu plan conectá Mercado Pago con el botón \"Conectar con Mercado Pago\".";

        /// <summary>null si el negocio puede conectar Mercado Pago a mano; si no, el 400 MP_OAUTH_REQUIRED.</summary>
        public static async Task<IActionResult?> BlockIfOAuthRequiredAsync(ApplicationDbContext db, IPlanEntitlementService plans, Guid tenantId)
        {
            if (tenantId == Guid.Empty) return null;
            var country = await db.Tenants.IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.Id == tenantId)
                .Select(t => t.Country)
                .FirstOrDefaultAsync();
            if (!CountryProfile.Get(country).IsArgentina) return null;

            var plan = await plans.GetEffectivePlanAsync(tenantId);
            if (plan.CommissionPercent <= 0) return null;

            return new BadRequestObjectResult(new { success = false, code = OAuthRequiredCode, error = OAuthRequiredMessage });
        }
    }
}
