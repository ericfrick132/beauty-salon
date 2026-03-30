using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/employees/{employeeId:guid}/blocks")]
    public class EmployeeBlocksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;

        public EmployeeBlocksController(ApplicationDbContext context, ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
        }

        private int GetTzOffset()
        {
            var tenant = _tenantService.GetCurrentTenant();
            var tz = tenant?.TimeZone ?? "-3";
            return int.TryParse(tz, out var oh) ? oh : -3;
        }

        /// <summary>
        /// Get blocks for an employee. Recurring blocks are expanded into occurrences within the date range.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBlocks(Guid employeeId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                var rangeStart = from ?? DateTime.UtcNow.AddMonths(-1);
                var rangeEnd = to ?? DateTime.UtcNow.AddMonths(2);
                var offset = GetTzOffset();

                var allBlocks = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId)
                    .ToListAsync();

                var result = new List<object>();

                foreach (var block in allBlocks)
                {
                    if (block.IsRecurring)
                    {
                        // Expand recurring block into occurrences
                        var occurrences = block.ExpandOccurrences(rangeStart, rangeEnd, offset);
                        foreach (var (start, end) in occurrences)
                        {
                            result.Add(new
                            {
                                id = block.Id,
                                employeeId = block.EmployeeId,
                                startTime = start,
                                endTime = end,
                                reason = block.Reason,
                                seriesId = block.Id, // The block itself IS the series
                                recurrencePattern = block.RecurrencePattern,
                                isRecurring = true,
                                recurrenceStart = block.RecurrenceStart,
                                recurrenceEnd = block.RecurrenceEnd
                            });
                        }
                    }
                    else
                    {
                        // Single block: filter by range
                        if (block.StartTime < rangeEnd && block.EndTime > rangeStart)
                        {
                            result.Add(new
                            {
                                id = block.Id,
                                employeeId = block.EmployeeId,
                                startTime = block.StartTime,
                                endTime = block.EndTime,
                                reason = block.Reason,
                                seriesId = (Guid?)null,
                                recurrencePattern = (string?)null,
                                isRecurring = false,
                                recurrenceStart = (DateTime?)null,
                                recurrenceEnd = (DateTime?)null
                            });
                        }
                    }
                }

                return Ok(result.OrderBy(r => ((dynamic)r).startTime));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get raw recurring rules (not expanded) for management UI.
        /// </summary>
        [HttpGet("rules")]
        public async Task<IActionResult> GetRules(Guid employeeId)
        {
            try
            {
                var blocks = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId)
                    .OrderBy(b => b.CreatedAt)
                    .Select(b => new
                    {
                        id = b.Id,
                        employeeId = b.EmployeeId,
                        isRecurring = b.IsRecurring,
                        startTime = b.StartTime,
                        endTime = b.EndTime,
                        reason = b.Reason,
                        recurrencePattern = b.RecurrencePattern,
                        recurrenceStart = b.RecurrenceStart,
                        recurrenceEnd = b.RecurrenceEnd
                    })
                    .ToListAsync();

                return Ok(blocks);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        public class CreateBlockDto
        {
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public string? Reason { get; set; }
            public bool ForceOverride { get; set; } = false;
        }

        /// <summary>
        /// Create a single (non-recurring) block.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateBlock(Guid employeeId, [FromBody] CreateBlockDto dto)
        {
            try
            {
                if (dto.EndTime <= dto.StartTime)
                    return BadRequest(new { message = "La hora de fin debe ser posterior a la de inicio" });

                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
                if (employee == null)
                    return NotFound(new { message = "Empleado no encontrado" });

                // Check booking conflicts
                var overlappingBookings = await _context.Bookings
                    .Where(b => b.EmployeeId == employeeId && b.Status != "cancelled" && b.StartTime < dto.EndTime && b.EndTime > dto.StartTime)
                    .ToListAsync();
                if (overlappingBookings.Any() && !dto.ForceOverride)
                    return BadRequest(new { message = "Existe una reserva en ese rango." });

                // Check block conflicts (single blocks only, recurring are checked dynamically)
                var hasBlock = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId && !b.IsRecurring)
                    .AnyAsync(b => b.StartTime < dto.EndTime && b.EndTime > dto.StartTime);
                if (hasBlock)
                    return BadRequest(new { message = "Ya existe un bloqueo en ese rango" });

                if (overlappingBookings.Any() && dto.ForceOverride)
                    foreach (var b in overlappingBookings)
                        b.Status = "cancelled";

                var block = new EmployeeTimeBlock
                {
                    TenantId = employee.TenantId,
                    EmployeeId = employeeId,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    Reason = dto.Reason,
                    IsRecurring = false
                };

                _context.EmployeeTimeBlocks.Add(block);
                await _context.SaveChangesAsync();
                return Ok(new { id = block.Id, message = "Bloqueo creado" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        public class CreateRecurringBlockDto
        {
            public DateTime StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            public string StartTimeOfDay { get; set; } = "09:00";
            public string EndTimeOfDay { get; set; } = "10:00";
            public List<int> DaysOfWeek { get; set; } = new();
            public string? Reason { get; set; }
            public bool ForceOverride { get; set; } = false;
        }

        /// <summary>
        /// Create a recurring block rule (single row in DB).
        /// </summary>
        [HttpPost("recurring")]
        public async Task<IActionResult> CreateRecurringBlocks(Guid employeeId, [FromBody] CreateRecurringBlockDto dto)
        {
            try
            {
                if (!TimeSpan.TryParse(dto.StartTimeOfDay, out var startTod) || !TimeSpan.TryParse(dto.EndTimeOfDay, out var endTod))
                    return BadRequest(new { message = "Horario inválido" });
                if (endTod <= startTod)
                    return BadRequest(new { message = "La hora de fin debe ser posterior a la de inicio" });
                if (dto.DaysOfWeek == null || dto.DaysOfWeek.Count == 0)
                    return BadRequest(new { message = "Seleccione al menos un día" });

                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
                if (employee == null)
                    return NotFound(new { message = "Empleado no encontrado" });

                var recurrencePattern = System.Text.Json.JsonSerializer.Serialize(new
                {
                    daysOfWeek = dto.DaysOfWeek,
                    startTimeOfDay = dto.StartTimeOfDay,
                    endTimeOfDay = dto.EndTimeOfDay
                });

                var block = new EmployeeTimeBlock
                {
                    TenantId = employee.TenantId,
                    EmployeeId = employeeId,
                    StartTime = DateTime.UtcNow, // placeholder, not used for recurring
                    EndTime = DateTime.UtcNow,
                    Reason = dto.Reason,
                    IsRecurring = true,
                    RecurrencePattern = recurrencePattern,
                    RecurrenceStart = dto.StartDate.Date,
                    RecurrenceEnd = dto.EndDate?.Date
                };

                _context.EmployeeTimeBlocks.Add(block);
                await _context.SaveChangesAsync();

                return Ok(new { id = block.Id, message = "Regla de bloqueo recurrente creada" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        public class UpdateBlockDto
        {
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public string? Reason { get; set; }
            public bool ForceOverride { get; set; } = false;
        }

        /// <summary>
        /// Update a single (non-recurring) block.
        /// </summary>
        [HttpPut("{blockId:guid}")]
        public async Task<IActionResult> UpdateBlock(Guid employeeId, Guid blockId, [FromBody] UpdateBlockDto dto)
        {
            try
            {
                if (dto.EndTime <= dto.StartTime)
                    return BadRequest(new { message = "La hora de fin debe ser posterior a la de inicio" });

                var block = await _context.EmployeeTimeBlocks.FirstOrDefaultAsync(b => b.Id == blockId && b.EmployeeId == employeeId);
                if (block == null)
                    return NotFound(new { message = "Bloqueo no encontrado" });

                var overlappingBookings = await _context.Bookings
                    .Where(b => b.EmployeeId == employeeId && b.Status != "cancelled" && b.StartTime < dto.EndTime && b.EndTime > dto.StartTime)
                    .ToListAsync();
                if (overlappingBookings.Any() && !dto.ForceOverride)
                    return BadRequest(new { message = "Existe una reserva en ese rango." });

                if (overlappingBookings.Any() && dto.ForceOverride)
                    foreach (var b in overlappingBookings)
                        b.Status = "cancelled";

                block.StartTime = dto.StartTime;
                block.EndTime = dto.EndTime;
                block.Reason = dto.Reason;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Bloqueo actualizado" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        public class UpdateRecurringBlockDto
        {
            public string? StartTimeOfDay { get; set; }
            public string? EndTimeOfDay { get; set; }
            public List<int>? DaysOfWeek { get; set; }
            public DateTime? RecurrenceEnd { get; set; }
            public string? Reason { get; set; }
        }

        /// <summary>
        /// Update a recurring block rule.
        /// </summary>
        [HttpPut("{blockId:guid}/recurring")]
        public async Task<IActionResult> UpdateRecurringBlock(Guid employeeId, Guid blockId, [FromBody] UpdateRecurringBlockDto dto)
        {
            try
            {
                var block = await _context.EmployeeTimeBlocks.FirstOrDefaultAsync(b => b.Id == blockId && b.EmployeeId == employeeId && b.IsRecurring);
                if (block == null)
                    return NotFound(new { message = "Regla recurrente no encontrada" });

                // Parse existing pattern
                var pattern = System.Text.Json.JsonSerializer.Deserialize<RecurrencePatternData>(block.RecurrencePattern ?? "{}") ?? new RecurrencePatternData();

                if (dto.StartTimeOfDay != null) pattern.startTimeOfDay = dto.StartTimeOfDay;
                if (dto.EndTimeOfDay != null) pattern.endTimeOfDay = dto.EndTimeOfDay;
                if (dto.DaysOfWeek != null) pattern.daysOfWeek = dto.DaysOfWeek;
                if (dto.Reason != null) block.Reason = dto.Reason;
                if (dto.RecurrenceEnd.HasValue) block.RecurrenceEnd = dto.RecurrenceEnd.Value.Date;

                block.RecurrencePattern = System.Text.Json.JsonSerializer.Serialize(new
                {
                    daysOfWeek = pattern.daysOfWeek,
                    startTimeOfDay = pattern.startTimeOfDay,
                    endTimeOfDay = pattern.endTimeOfDay
                });

                await _context.SaveChangesAsync();
                return Ok(new { message = "Regla recurrente actualizada" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{blockId:guid}")]
        public async Task<IActionResult> DeleteBlock(Guid employeeId, Guid blockId)
        {
            try
            {
                var block = await _context.EmployeeTimeBlocks
                    .FirstOrDefaultAsync(b => b.Id == blockId && b.EmployeeId == employeeId);
                if (block == null)
                    return NotFound(new { message = "Bloqueo no encontrado" });

                _context.EmployeeTimeBlocks.Remove(block);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Bloqueo eliminado" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Exclude a single occurrence from a recurring block (by local date).
        /// </summary>
        [HttpDelete("{blockId:guid}/occurrence")]
        public async Task<IActionResult> DeleteOccurrence(Guid employeeId, Guid blockId, [FromQuery] string date)
        {
            try
            {
                if (string.IsNullOrEmpty(date))
                    return BadRequest(new { message = "Fecha requerida" });

                var block = await _context.EmployeeTimeBlocks
                    .FirstOrDefaultAsync(b => b.Id == blockId && b.EmployeeId == employeeId && b.IsRecurring);
                if (block == null)
                    return NotFound(new { message = "Regla recurrente no encontrada" });

                var exclusions = string.IsNullOrEmpty(block.Exclusions)
                    ? new List<string>()
                    : System.Text.Json.JsonSerializer.Deserialize<List<string>>(block.Exclusions) ?? new List<string>();

                if (!exclusions.Contains(date))
                    exclusions.Add(date);

                block.Exclusions = System.Text.Json.JsonSerializer.Serialize(exclusions);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Ocurrencia eliminada" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Keep legacy endpoints for backward compat but they just delete the single row
        [HttpDelete("series/{seriesId:guid}")]
        public async Task<IActionResult> DeleteSeries(Guid employeeId, Guid seriesId)
        {
            // seriesId is now the block Id itself for recurring blocks
            return await DeleteBlock(employeeId, seriesId);
        }

        [HttpDelete("{blockId:guid}/and-following")]
        public async Task<IActionResult> DeleteBlockAndFollowing(Guid employeeId, Guid blockId)
        {
            return await DeleteBlock(employeeId, blockId);
        }

        // Legacy series update endpoints redirect to recurring update
        [HttpPut("series/{seriesId:guid}")]
        public async Task<IActionResult> UpdateSeries(Guid employeeId, Guid seriesId, [FromBody] UpdateRecurringBlockDto dto)
        {
            return await UpdateRecurringBlock(employeeId, seriesId, dto);
        }

        [HttpPut("{blockId:guid}/and-following")]
        public async Task<IActionResult> UpdateBlockAndFollowing(Guid employeeId, Guid blockId, [FromBody] UpdateRecurringBlockDto dto)
        {
            return await UpdateRecurringBlock(employeeId, blockId, dto);
        }
    }
}
