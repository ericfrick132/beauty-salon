using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>
    /// Primer paso PENDIENTE del onboarding de un tenant, para el follow-up milestone-aware.
    /// Key normalizada entre apps (wizard|catalog|staff|payments|first_sale), Label humano para
    /// el placeholder {paso}, Path relativo para armar {link}, DoneSummary opcional para copys
    /// tipo "ya cargaste X, te falta Y".
    /// </summary>
    public record PendingMilestone(string Key, string Label, string Path, string? DoneSummary = null);

    public interface IOnboardingMilestoneResolver
    {
        /// <summary>Devuelve el primer paso pendiente, o null si el tenant está completamente activado.</summary>
        Task<PendingMilestone?> ResolveAsync(Guid tenantId, CancellationToken ct);
    }

    /// <summary>
    /// Orden de activación de TurnosPro: perfil → servicios → equipo → mercadopago → primer turno.
    /// Corre desde un BackgroundService sin tenant en contexto → todas las queries con
    /// IgnoreQueryFilters + TenantId explícito.
    /// </summary>
    public class OnboardingMilestoneResolver : IOnboardingMilestoneResolver
    {
        private readonly ApplicationDbContext _db;

        public OnboardingMilestoneResolver(ApplicationDbContext db) => _db = db;

        public async Task<PendingMilestone?> ResolveAsync(Guid tenantId, CancellationToken ct)
        {
            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return null;

            if (tenant.OnboardingCompletedAt == null)
                return new PendingMilestone("wizard", "completar tu perfil (te toma 2 minutos)", "/completar-perfil");

            var hasServices = await _db.Services.IgnoreQueryFilters()
                .AnyAsync(s => s.TenantId == tenantId && s.IsActive, ct);
            if (!hasServices)
                return new PendingMilestone("catalog", "cargar tu primer servicio", "/services",
                    "ya completaste tu perfil");

            var hasStaff = await _db.Employees.IgnoreQueryFilters()
                .AnyAsync(e => e.TenantId == tenantId && e.IsActive, ct);
            if (!hasStaff)
                return new PendingMilestone("staff", "sumar a quien atiende (aunque seas solo vos)", "/employees",
                    "ya cargaste tus servicios");

            var hasMp = await _db.MercadoPagoOAuthConfigurations.IgnoreQueryFilters()
                .AnyAsync(m => m.TenantId == tenantId, ct);
            if (!hasMp)
                return new PendingMilestone("payments", "conectar mercadopago para cobrar señas", "/mercadopago-settings",
                    "ya tenés servicios y equipo cargados");

            var hasBooking = await _db.Bookings.IgnoreQueryFilters()
                .AnyAsync(b => b.TenantId == tenantId, ct);
            if (!hasBooking)
                return new PendingMilestone("first_sale", "cargar tu primer turno (o compartir tu link para que reserven solos)", "/calendar",
                    "ya está todo configurado");

            return null; // activado
        }
    }
}
