using System.Globalization;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using BookingPro.API.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>Gastos del negocio que se cargan a mano (desde Plus). Restan en la ganancia del dashboard.</summary>
    [ApiController]
    [Route("api/expenses")]
    [Authorize(Roles = "admin,super_admin")]
    [TenantStaffOnly]
    public class ExpensesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IPlanEntitlementService _plans;

        public ExpensesController(ApplicationDbContext context, ITenantProvider tenantProvider, IPlanEntitlementService plans)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _plans = plans;
        }

        public class ExpenseDto
        {
            /// <summary>yyyy-MM-dd</summary>
            public string Date { get; set; } = string.Empty;
            public string Category { get; set; } = ExpenseCategories.Other;
            public string? Description { get; set; }
            public decimal Amount { get; set; }
            public bool IsRecurring { get; set; }
        }

        public class ExpenseResponse
        {
            public Guid Id { get; set; }
            public string Date { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string? Description { get; set; }
            public decimal Amount { get; set; }
            public bool IsRecurring { get; set; }

            public static ExpenseResponse From(Expense e) => new()
            {
                Id = e.Id,
                Date = e.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Category = e.Category,
                Description = e.Description,
                Amount = e.Amount,
                IsRecurring = e.IsRecurring,
            };
        }

        /// <summary>
        /// Gastos de un mes (yyyy-MM; por defecto el actual). Lista igual aunque el plan no los incluya:
        /// el panel muestra el paywall con lo que ya tenía.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] string? month = null)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            if (!TryParseMonth(month, out var start)) return BadRequest(new { message = "Mes inválido (yyyy-MM)." });
            var end = start.AddMonths(1);

            var expenses = await _context.Expenses
                .Where(e => e.TenantId == tenantId && e.Date >= start && e.Date < end)
                .OrderByDescending(e => e.Date).ThenByDescending(e => e.CreatedAt)
                .ToListAsync();

            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.Expenses);
            return Ok(new
            {
                allowed = feature.Allowed,
                month = start.ToString("yyyy-MM", CultureInfo.InvariantCulture),
                total = expenses.Sum(e => e.Amount),
                byCategory = expenses
                    .GroupBy(e => e.Category)
                    .Select(g => new { category = g.Key, total = g.Sum(e => e.Amount) })
                    .OrderByDescending(g => g.total),
                expenses = expenses.Select(ExpenseResponse.From),
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ExpenseDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.Expenses);
            if (!feature.Allowed) return PlanLimitResult.From(feature);

            var error = Validate(dto, out var date);
            if (error != null) return BadRequest(new { message = error });

            var expense = new Expense { TenantId = tenantId };
            Apply(expense, dto, date);
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();
            return Ok(ExpenseResponse.From(expense));
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] ExpenseDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.Expenses);
            if (!feature.Allowed) return PlanLimitResult.From(feature);

            var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id);
            if (expense == null) return NotFound();

            var error = Validate(dto, out var date);
            if (error != null) return BadRequest(new { message = error });

            Apply(expense, dto, date);
            await _context.SaveChangesAsync();
            return Ok(ExpenseResponse.From(expense));
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id);
            if (expense == null) return NotFound();
            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// Repite en el mes pedido los gastos fijos del mes anterior (mismo día, o el último del mes si no
        /// existe). Saltea los que ya están cargados con la misma categoría y descripción.
        /// </summary>
        [HttpPost("copy-recurring")]
        public async Task<IActionResult> CopyRecurring([FromQuery] string? month = null)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var feature = await _plans.CheckFeatureAsync(tenantId, PlanLimits.Expenses);
            if (!feature.Allowed) return PlanLimitResult.From(feature);
            if (!TryParseMonth(month, out var start)) return BadRequest(new { message = "Mes inválido (yyyy-MM)." });

            var prevStart = start.AddMonths(-1);
            var end = start.AddMonths(1);
            var previous = await _context.Expenses
                .Where(e => e.TenantId == tenantId && e.IsRecurring && e.Date >= prevStart && e.Date < start)
                .ToListAsync();
            var current = await _context.Expenses
                .Where(e => e.TenantId == tenantId && e.Date >= start && e.Date < end)
                .Select(e => new { e.Category, e.Description })
                .ToListAsync();

            var daysInMonth = DateTime.DaysInMonth(start.Year, start.Month);
            var copied = 0;
            foreach (var p in previous)
            {
                if (current.Any(c => c.Category == p.Category && c.Description == p.Description)) continue;
                _context.Expenses.Add(new Expense
                {
                    TenantId = tenantId,
                    Date = new DateTime(start.Year, start.Month, Math.Min(p.Date.Day, daysInMonth), 0, 0, 0, DateTimeKind.Utc),
                    Category = p.Category,
                    Description = p.Description,
                    Amount = p.Amount,
                    IsRecurring = true,
                });
                copied++;
            }
            await _context.SaveChangesAsync();
            return Ok(new { copied });
        }

        private static bool TryParseMonth(string? month, out DateTime start)
        {
            if (string.IsNullOrWhiteSpace(month))
            {
                var now = DateTime.UtcNow;
                start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                return true;
            }
            var ok = DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed);
            start = ok ? new DateTime(parsed.Year, parsed.Month, 1, 0, 0, 0, DateTimeKind.Utc) : default;
            return ok;
        }

        private static string? Validate(ExpenseDto dto, out DateTime date)
        {
            date = default;
            if (!DateTime.TryParseExact(dto.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                return "La fecha es inválida.";
            date = DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
            if (!ExpenseCategories.All.Contains(dto.Category)) return "La categoría no existe.";
            if (dto.Amount <= 0) return "El monto tiene que ser mayor a 0.";
            if (dto.Description != null && dto.Description.Trim().Length > 200) return "La descripción es muy larga (máx. 200).";
            return null;
        }

        private static void Apply(Expense expense, ExpenseDto dto, DateTime date)
        {
            expense.Date = date;
            expense.Category = dto.Category;
            expense.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            expense.Amount = Math.Round(dto.Amount, 2);
            expense.IsRecurring = dto.IsRecurring;
            expense.UpdatedAt = DateTime.UtcNow;
        }
    }
}
