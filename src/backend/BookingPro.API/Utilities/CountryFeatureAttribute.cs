using BookingPro.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Utilities
{
    /// <summary>Features que dependen del país del negocio (ver CountryProfile).</summary>
    public enum CountryFeature
    {
        ArcaInvoicing,
        Chytapay,
        TransferDetection,
    }

    /// <summary>
    /// Corta con 403 si el país del negocio no tiene la feature (ARCA, Chytapay y detección de
    /// transferencias son solo de Argentina). Sin negocio resuelto deja pasar: lo resuelve el controller.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public sealed class CountryFeatureAttribute : Attribute, IAsyncActionFilter
    {
        private readonly CountryFeature _feature;

        public CountryFeatureAttribute(CountryFeature feature) => _feature = feature;

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var http = context.HttpContext;
            var raw = http.Items["TenantId"] as string
                      ?? http.User?.FindFirst("tenant_id")?.Value
                      ?? http.User?.FindFirst("tenantId")?.Value;

            if (Guid.TryParse(raw, out var tenantId))
            {
                var db = http.RequestServices.GetRequiredService<ApplicationDbContext>();
                var country = await db.Tenants.IgnoreQueryFilters().AsNoTracking()
                    .Where(t => t.Id == tenantId)
                    .Select(t => t.Country)
                    .FirstOrDefaultAsync();
                if (!IsEnabled(CountryProfile.Get(country), _feature))
                {
                    context.Result = new ObjectResult(new
                    {
                        success = false,
                        code = "FEATURE_NOT_AVAILABLE_IN_COUNTRY",
                        message = "Esta función no está disponible en el país del negocio."
                    })
                    { StatusCode = StatusCodes.Status403Forbidden };
                    return;
                }
            }

            await next();
        }

        public static bool IsEnabled(CountryProfile profile, CountryFeature feature) => feature switch
        {
            CountryFeature.ArcaInvoicing => profile.ArcaInvoicing,
            CountryFeature.Chytapay => profile.Chytapay,
            CountryFeature.TransferDetection => profile.TransferDetection,
            _ => true,
        };
    }
}
