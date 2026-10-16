using BookingPro.API.Data;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    /// <summary>Reservas recurrentes / turnos fijos (Advance: hasta 10 series activas, Pro: ilimitadas).</summary>
    [ApiController]
    [Route("api/booking-series")]
    [Authorize]
    [TenantStaffOnly]
    public class BookingSeriesController : ControllerBase
    {
        private const int MaxOccurrences = 52;

        private readonly ApplicationDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly IPlanEntitlementService _plans;
        private readonly IBookingService _bookings;

        public BookingSeriesController(ApplicationDbContext context, ITenantProvider tenantProvider, IPlanEntitlementService plans, IBookingService bookings)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _plans = plans;
            _bookings = bookings;
        }

        public class CreateBookingSeriesDto
        {
            public Guid CustomerId { get; set; }
            public Guid EmployeeId { get; set; }
            public Guid ServiceId { get; set; }
            /// <summary>Inicio de la primera ocurrencia, en UTC (igual que POST /bookings).</summary>
            public DateTime StartTime { get; set; }
            /// <summary>1 = semanal, 2 = quincenal, hasta 4.</summary>
            public int IntervalWeeks { get; set; } = 1;
            /// <summary>Cantidad de turnos a generar (2 a 52).</summary>
            public int Occurrences { get; set; } = 4;
            public string? Notes { get; set; }
        }

        public class SkippedOccurrence
        {
            public DateTime StartTime { get; set; }
            public string Reason { get; set; } = string.Empty;
        }

        /// <summary>
        /// Crea la serie y sus turnos. Los que chocan con otro turno, un bloqueo o el horario se saltean y se
        /// devuelven en skipped (el resto se crea igual). Si no se pudo crear ninguno, no queda la serie.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookingSeriesDto dto)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var check = await _plans.CanCreateRecurringSeriesAsync(tenantId);
            if (!check.Allowed) return PlanLimitResult.From(check);

            if (dto.IntervalWeeks < 1 || dto.IntervalWeeks > 4)
                return BadRequest(new { message = "La frecuencia tiene que ser de 1 a 4 semanas." });
            if (dto.Occurrences < 2 || dto.Occurrences > MaxOccurrences)
                return BadRequest(new { message = $"Elegí entre 2 y {MaxOccurrences} turnos." });

            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.ServiceId);
            if (service == null) return BadRequest(new { message = "Servicio no encontrado" });

            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
            var tz = TenantTime.For(tenant);
            // Las semanas se suman en hora local del negocio: sumando en UTC, un turno fijo se corre una hora
            // con el cambio de horario (España).
            var firstLocal = TenantTime.ToLocal(dto.StartTime, tz);

            var series = new BookingSeries
            {
                TenantId = tenantId,
                CustomerId = dto.CustomerId,
                EmployeeId = dto.EmployeeId,
                ServiceId = dto.ServiceId,
                FirstStartTime = dto.StartTime,
                DurationMinutes = service.DurationMinutes,
                IntervalWeeks = dto.IntervalWeeks,
                Occurrences = dto.Occurrences,
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            };

            var created = new List<Booking>();
            var skipped = new List<SkippedOccurrence>();
            for (var i = 0; i < dto.Occurrences; i++)
            {
                var start = TenantTime.ToUtc(firstLocal.AddDays(7 * dto.IntervalWeeks * i), tz);
                var result = await _bookings.CreateBookingAsync(new CreateBookingDto
                {
                    CustomerId = dto.CustomerId,
                    EmployeeId = dto.EmployeeId,
                    ServiceId = dto.ServiceId,
                    StartTime = start,
                    EndTime = start.AddMinutes(service.DurationMinutes),
                    Status = "confirmed",
                    Notes = series.Notes,
                });

                if (result.Success && result.Data != null) { created.Add(result.Data); continue; }
                // Tope de reservas del mes (Plus): no tiene sentido seguir intentando.
                if (result.Reason == BookingFailureReasons.PlanLimit)
                {
                    skipped.Add(new SkippedOccurrence { StartTime = start, Reason = result.Message ?? "Tope de reservas del plan" });
                    break;
                }
                skipped.Add(new SkippedOccurrence { StartTime = start, Reason = result.Message ?? "Horario no disponible" });
            }

            if (created.Count == 0)
                return BadRequest(new { message = "No se pudo crear ningún turno de la serie: todos los horarios están ocupados o fuera de agenda.", skipped });

            _context.BookingSeries.Add(series);
            await _context.SaveChangesAsync();
            var ids = created.Select(b => b.Id).ToList();
            await _context.Bookings.Where(b => ids.Contains(b.Id))
                .ExecuteUpdateAsync(u => u.SetProperty(b => b.SeriesId, series.Id));

            return Ok(new
            {
                series.Id,
                created = created.Select(b => new { b.Id, b.StartTime, b.EndTime }),
                skipped,
            });
        }

        [HttpGet]
        public async Task<IActionResult> List()
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var now = DateTime.UtcNow;
            var series = await _context.BookingSeries
                .Where(s => s.TenantId == tenantId && s.Status == BookingSeriesStatus.Active)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
            var ids = series.Select(s => s.Id).ToList();
            var upcoming = await _context.Bookings
                .Where(b => b.SeriesId != null && ids.Contains(b.SeriesId.Value) && b.StartTime > now && b.Status != "cancelled")
                .GroupBy(b => b.SeriesId!.Value)
                .Select(g => new { SeriesId = g.Key, Count = g.Count(), Next = g.Min(b => b.StartTime) })
                .ToListAsync();
            var customerIds = series.Select(s => s.CustomerId).Distinct().ToList();
            var customers = await _context.Customers.Where(c => customerIds.Contains(c.Id))
                .Select(c => new { c.Id, Name = (c.FirstName + " " + (c.LastName ?? "")).Trim() }).ToListAsync();
            var services = await _context.Services.IgnoreQueryFilters().Where(s => s.TenantId == tenantId)
                .Select(s => new { s.Id, s.Name }).ToListAsync();
            var employees = await _context.Employees.Select(e => new { e.Id, e.Name }).ToListAsync();

            var check = await _plans.CanCreateRecurringSeriesAsync(tenantId);
            return Ok(new
            {
                max = check.Max,
                canCreate = check.Allowed,
                series = series.Select(s =>
                {
                    var u = upcoming.FirstOrDefault(x => x.SeriesId == s.Id);
                    return new
                    {
                        s.Id,
                        s.CustomerId,
                        CustomerName = customers.FirstOrDefault(c => c.Id == s.CustomerId)?.Name,
                        s.ServiceId,
                        ServiceName = services.FirstOrDefault(x => x.Id == s.ServiceId)?.Name,
                        s.EmployeeId,
                        EmployeeName = employees.FirstOrDefault(e => e.Id == s.EmployeeId)?.Name,
                        s.FirstStartTime,
                        s.IntervalWeeks,
                        s.Occurrences,
                        s.Notes,
                        UpcomingCount = u?.Count ?? 0,
                        NextStartTime = u?.Next,
                    };
                }),
            });
        }

        /// <summary>Cancela la serie y sus turnos futuros. Los pasados quedan como estaban.</summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var tenantId = _tenantProvider.GetCurrentTenantId();
            var series = await _context.BookingSeries.FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == id);
            if (series == null) return NotFound();

            var now = DateTime.UtcNow;
            var cancelled = await _context.Bookings
                .Where(b => b.SeriesId == id && b.StartTime > now && b.Status != "cancelled" && b.Status != "completed")
                .ExecuteUpdateAsync(u => u
                    .SetProperty(b => b.Status, "cancelled")
                    .SetProperty(b => b.CancelledAt, now)
                    .SetProperty(b => b.CancellationReason, "Se canceló el turno fijo")
                    .SetProperty(b => b.UpdatedAt, now));

            series.Status = BookingSeriesStatus.Cancelled;
            series.CancelledAt = now;
            await _context.SaveChangesAsync();
            return Ok(new { cancelledBookings = cancelled });
        }
    }
}
