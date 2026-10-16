using System.Text.Json;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using BookingPro.API.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>Campos personalizados del formulario de reserva (Advance: 1, Pro: ilimitados).</summary>
    [ApiController]
    [Route("api/booking-form-fields")]
    [Authorize]
    [TenantStaffOnly]
    public class BookingFormFieldsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IPlanEntitlementService _plans;

        public BookingFormFieldsController(ApplicationDbContext context, ITenantProvider tenantProvider, IPlanEntitlementService plans)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _plans = plans;
        }

        public class BookingFormFieldDto
        {
            public string Label { get; set; } = string.Empty;
            public string FieldType { get; set; } = BookingFormFieldTypes.Text;
            public bool Required { get; set; }
            public List<string>? Options { get; set; }
            public string? Placeholder { get; set; }
            public int? DisplayOrder { get; set; }
            public bool IsActive { get; set; } = true;
        }

        public class BookingFormFieldResponse
        {
            public Guid Id { get; set; }
            public string Label { get; set; } = string.Empty;
            public string FieldType { get; set; } = string.Empty;
            public bool Required { get; set; }
            public List<string> Options { get; set; } = new();
            public string? Placeholder { get; set; }
            public int DisplayOrder { get; set; }
            public bool IsActive { get; set; }

            public static BookingFormFieldResponse From(BookingFormField f) => new()
            {
                Id = f.Id,
                Label = f.Label,
                FieldType = f.FieldType,
                Required = f.Required,
                Options = BookingExtrasService.ParseOptions(f.OptionsJson),
                Placeholder = f.Placeholder,
                DisplayOrder = f.DisplayOrder,
                IsActive = f.IsActive,
            };
        }

        /// <summary>maxFields: -1 ilimitados, 0 = el plan no los incluye.</summary>
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var fields = await _context.BookingFormFields
                .Where(f => f.TenantId == tenantId)
                .OrderBy(f => f.DisplayOrder).ThenBy(f => f.CreatedAt)
                .ToListAsync();
            return Ok(new { maxFields = await _plans.MaxCustomFieldsAsync(tenantId), fields = fields.Select(BookingFormFieldResponse.From) });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BookingFormFieldDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            if (dto.IsActive)
            {
                var check = await _plans.CanCreateCustomFieldAsync(tenantId);
                if (!check.Allowed) return PlanLimitResult.From(check);
            }

            var error = Validate(dto);
            if (error != null) return BadRequest(new { message = error });

            var nextOrder = (await _context.BookingFormFields.Where(f => f.TenantId == tenantId).MaxAsync(f => (int?)f.DisplayOrder) ?? -1) + 1;
            var field = new BookingFormField { TenantId = tenantId, DisplayOrder = dto.DisplayOrder ?? nextOrder };
            Apply(field, dto);
            _context.BookingFormFields.Add(field);
            await _context.SaveChangesAsync();
            return Ok(BookingFormFieldResponse.From(field));
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] BookingFormFieldDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var field = await _context.BookingFormFields.FirstOrDefaultAsync(f => f.TenantId == tenantId && f.Id == id);
            if (field == null) return NotFound();

            // Reactivar uno cuenta como sumarlo: si no, el tope se saltea apagando y prendiendo.
            if (!field.IsActive && dto.IsActive)
            {
                var check = await _plans.CanCreateCustomFieldAsync(tenantId);
                if (!check.Allowed) return PlanLimitResult.From(check);
            }

            var error = Validate(dto);
            if (error != null) return BadRequest(new { message = error });

            if (dto.DisplayOrder.HasValue) field.DisplayOrder = dto.DisplayOrder.Value;
            Apply(field, dto);
            await _context.SaveChangesAsync();
            return Ok(BookingFormFieldResponse.From(field));
        }

        /// <summary>Se desactiva: las reservas viejas guardan la respuesta con el nombre del campo.</summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var field = await _context.BookingFormFields.FirstOrDefaultAsync(f => f.TenantId == tenantId && f.Id == id);
            if (field == null) return NotFound();
            field.IsActive = false;
            field.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static string? Validate(BookingFormFieldDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Label) || dto.Label.Trim().Length > 120)
                return "El nombre del campo es obligatorio (hasta 120 caracteres).";
            if (!BookingFormFieldTypes.All.Contains(dto.FieldType))
                return "Tipo de campo inválido.";
            if (dto.FieldType == BookingFormFieldTypes.Select && (dto.Options == null || dto.Options.Count(o => !string.IsNullOrWhiteSpace(o)) < 2))
                return "Una lista desplegable necesita al menos 2 opciones.";
            return null;
        }

        private static void Apply(BookingFormField field, BookingFormFieldDto dto)
        {
            field.Label = dto.Label.Trim();
            field.FieldType = dto.FieldType;
            field.Required = dto.Required;
            field.Placeholder = string.IsNullOrWhiteSpace(dto.Placeholder) ? null : dto.Placeholder.Trim();
            field.OptionsJson = dto.FieldType == BookingFormFieldTypes.Select
                ? JsonSerializer.Serialize(dto.Options!.Where(o => !string.IsNullOrWhiteSpace(o)).Select(o => o.Trim()).Distinct().ToList())
                : null;
            field.IsActive = dto.IsActive;
            field.UpdatedAt = DateTime.UtcNow;
        }
    }
}
