using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    /// <summary>Resultado de aplicar un cupón a un precio. Valid=false trae un Message para el cliente final.</summary>
    public record CouponQuote(bool Valid, string? Code, string? DiscountType, decimal DiscountValue, decimal DiscountAmount, decimal FinalPrice, string? Message)
    {
        public static CouponQuote Invalid(decimal price, string message) => new(false, null, null, 0, 0, price, message);
    }

    /// <summary>Respuesta a un campo personalizado, tal como se guarda en Booking.CustomFieldsJson.</summary>
    public record CustomFieldAnswer(Guid FieldId, string Label, string Value);

    public record CustomFieldsValidation(bool Valid, string? Message, string? Json);

    /// <summary>
    /// Lógica compartida entre el panel y la página pública para cupones del negocio y campos personalizados
    /// del formulario de reserva. El plan se chequea acá: un negocio que bajó de plan deja de aceptar cupones
    /// y muestra solo los campos que su plan incluye.
    /// </summary>
    public interface IBookingExtrasService
    {
        Task<CouponQuote> QuoteCouponAsync(Guid tenantId, string? code, decimal price);
        /// <summary>Suma un uso. Devuelve false si en el medio se agotó (otro cliente usó el último).</summary>
        Task<bool> RedeemCouponAsync(Guid tenantId, string code);
        /// <summary>Devuelve un uso consumido (la reserva no se llegó a guardar).</summary>
        Task ReleaseCouponAsync(Guid tenantId, string code);
        Task<List<BookingFormField>> GetPublicFieldsAsync(Guid tenantId);
        Task<CustomFieldsValidation> ValidateAnswersAsync(Guid tenantId, Dictionary<string, string>? answers);
        string NormalizeCode(string code);
    }

    public class BookingExtrasService : IBookingExtrasService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPlanEntitlementService _plans;

        public BookingExtrasService(ApplicationDbContext context, IPlanEntitlementService plans)
        {
            _context = context;
            _plans = plans;
        }

        public string NormalizeCode(string code) => new string(code.Trim().ToUpperInvariant().Where(c => !char.IsWhiteSpace(c)).ToArray());

        public async Task<CouponQuote> QuoteCouponAsync(Guid tenantId, string? code, decimal price)
        {
            if (string.IsNullOrWhiteSpace(code)) return CouponQuote.Invalid(price, "Ingresá un código.");
            if (!(await _plans.CheckFeatureAsync(tenantId, PlanLimits.Coupons)).Allowed)
                return CouponQuote.Invalid(price, "Ese cupón no es válido.");

            var normalized = NormalizeCode(code);
            var coupon = await _context.BookingCoupons.IgnoreQueryFilters().AsNoTracking()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Code == normalized && c.IsActive);
            if (coupon == null) return CouponQuote.Invalid(price, "Ese cupón no es válido.");
            if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt.Value < DateTime.UtcNow) return CouponQuote.Invalid(price, "Ese cupón ya venció.");
            if (coupon.MaxUses.HasValue && coupon.UsedCount >= coupon.MaxUses.Value) return CouponQuote.Invalid(price, "Ese cupón ya se usó todas las veces posibles.");

            var discount = coupon.DiscountType == BookingCouponTypes.Percent
                ? Math.Round(price * Math.Clamp(coupon.DiscountValue, 0, 100) / 100m, 2, MidpointRounding.AwayFromZero)
                : Math.Min(coupon.DiscountValue, price);
            discount = Math.Max(0, discount);
            return new CouponQuote(true, coupon.Code, coupon.DiscountType, coupon.DiscountValue, discount, price - discount, null);
        }

        public async Task<bool> RedeemCouponAsync(Guid tenantId, string code)
        {
            var normalized = NormalizeCode(code);
            // UPDATE condicional: dos reservas simultáneas no pueden pasarse del tope de usos.
            var updated = await _context.BookingCoupons.IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId && c.Code == normalized && c.IsActive
                    && (c.MaxUses == null || c.UsedCount < c.MaxUses))
                .ExecuteUpdateAsync(u => u
                    .SetProperty(c => c.UsedCount, c => c.UsedCount + 1)
                    .SetProperty(c => c.UpdatedAt, DateTime.UtcNow));
            return updated > 0;
        }

        public async Task ReleaseCouponAsync(Guid tenantId, string code)
        {
            var normalized = NormalizeCode(code);
            await _context.BookingCoupons.IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId && c.Code == normalized && c.UsedCount > 0)
                .ExecuteUpdateAsync(u => u.SetProperty(c => c.UsedCount, c => c.UsedCount - 1));
        }

        public async Task<List<BookingFormField>> GetPublicFieldsAsync(Guid tenantId)
        {
            var max = await _plans.MaxCustomFieldsAsync(tenantId);
            if (max == 0) return new List<BookingFormField>();
            var query = _context.BookingFormFields.IgnoreQueryFilters().AsNoTracking()
                .Where(f => f.TenantId == tenantId && f.IsActive)
                .OrderBy(f => f.DisplayOrder).ThenBy(f => f.CreatedAt);
            // Si bajó de plan, se muestran los primeros que entran en el nuevo: no se borra nada.
            return max < 0 ? await query.ToListAsync() : await query.Take(max).ToListAsync();
        }

        public async Task<CustomFieldsValidation> ValidateAnswersAsync(Guid tenantId, Dictionary<string, string>? answers)
        {
            var fields = await GetPublicFieldsAsync(tenantId);
            if (fields.Count == 0) return new CustomFieldsValidation(true, null, null);

            answers ??= new Dictionary<string, string>();
            var result = new List<CustomFieldAnswer>();
            foreach (var field in fields)
            {
                answers.TryGetValue(field.Id.ToString(), out var raw);
                var value = (raw ?? string.Empty).Trim();
                if (value.Length > 1000) value = value[..1000];

                if (field.FieldType == BookingFormFieldTypes.Checkbox)
                    value = value is "true" or "1" or "si" or "sí" ? "Sí" : string.Empty;

                if (field.Required && string.IsNullOrEmpty(value))
                    return new CustomFieldsValidation(false, $"Completá \"{field.Label}\".", null);

                if (!string.IsNullOrEmpty(value) && field.FieldType == BookingFormFieldTypes.Number
                    && !decimal.TryParse(value.Replace(',', '.'), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out _))
                    return new CustomFieldsValidation(false, $"\"{field.Label}\" tiene que ser un número.", null);

                if (!string.IsNullOrEmpty(value) && field.FieldType == BookingFormFieldTypes.Select)
                {
                    var options = ParseOptions(field.OptionsJson);
                    if (options.Count > 0 && !options.Contains(value))
                        return new CustomFieldsValidation(false, $"Elegí una opción válida en \"{field.Label}\".", null);
                }

                if (!string.IsNullOrEmpty(value)) result.Add(new CustomFieldAnswer(field.Id, field.Label, value));
            }
            return new CustomFieldsValidation(true, null, result.Count > 0 ? JsonSerializer.Serialize(result) : null);
        }

        public static List<string> ParseOptions(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try { return JsonSerializer.Deserialize<List<string>>(json)?.Where(o => !string.IsNullOrWhiteSpace(o)).Select(o => o.Trim()).ToList() ?? new(); }
            catch (JsonException) { return new List<string>(); }
        }

        public static List<CustomFieldAnswer> ParseAnswers(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<CustomFieldAnswer>();
            try { return JsonSerializer.Deserialize<List<CustomFieldAnswer>>(json) ?? new(); }
            catch (JsonException) { return new List<CustomFieldAnswer>(); }
        }
    }
}
