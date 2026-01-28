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

        [HttpGet]
        public async Task<IActionResult> GetBlocks(Guid employeeId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                var query = _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId);

                if (from.HasValue) query = query.Where(b => b.EndTime >= from.Value);
                if (to.HasValue) query = query.Where(b => b.StartTime <= to.Value);

                var blocks = await query
                    .OrderBy(b => b.StartTime)
                    .Select(b => new
                    {
                        id = b.Id,
                        employeeId = b.EmployeeId,
                        startTime = b.StartTime,
                        endTime = b.EndTime,
                        reason = b.Reason,
                        seriesId = b.SeriesId,
                        recurrencePattern = b.RecurrencePattern
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
            public bool ForceOverride { get; set; } = false; // Cancel overlapping bookings if true
        }

        [HttpPost]
        public async Task<IActionResult> CreateBlock(Guid employeeId, [FromBody] CreateBlockDto dto)
        {
            try
            {
                if (dto.EndTime <= dto.StartTime)
                {
                    return BadRequest(new { message = "La hora de fin debe ser posterior a la de inicio" });
                }

                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
                if (employee == null)
                {
                    return NotFound(new { message = "Empleado no encontrado" });
                }

                // Overlaps with bookings
                var overlappingBookings = await _context.Bookings
                    .Where(b => b.EmployeeId == employeeId && b.Status != "cancelled" && b.StartTime < dto.EndTime && b.EndTime > dto.StartTime)
                    .ToListAsync();
                if (overlappingBookings.Any() && !dto.ForceOverride)
                {
                    return BadRequest(new { message = "Existe una reserva en ese rango. No se puede bloquear (quite las reservas o use forzar)." });
                }

                // Prevent overlap with existing blocks
                var hasBlock = await _context.EmployeeTimeBlocks.AnyAsync(b =>
                    b.EmployeeId == employeeId && b.StartTime < dto.EndTime && b.EndTime > dto.StartTime);
                if (hasBlock)
                {
                    return BadRequest(new { message = "Ya existe un bloqueo en ese rango" });
                }

                // If force, cancel overlapping bookings
                if (overlappingBookings.Any() && dto.ForceOverride)
                {
                    foreach (var b in overlappingBookings)
                    {
                        b.Status = "cancelled";
                    }
                }

                var block = new EmployeeTimeBlock
                {
                    TenantId = employee.TenantId,
                    EmployeeId = employeeId,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    Reason = dto.Reason
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
            public DateTime StartDate { get; set; } // date-only part used
            public DateTime? EndDate { get; set; }
            public string StartTimeOfDay { get; set; } = "09:00"; // HH:mm
            public string EndTimeOfDay { get; set; } = "10:00"; // HH:mm
            public List<int> DaysOfWeek { get; set; } = new(); // 0..6
            public string? Reason { get; set; }
            public bool ForceOverride { get; set; } = false; // Cancel overlapping bookings if true
        }

        [HttpPost("recurring")]
        public async Task<IActionResult> CreateRecurringBlocks(Guid employeeId, [FromBody] CreateRecurringBlockDto dto)
        {
            try
            {
                var effectiveEndDate = dto.EndDate?.Date ?? dto.StartDate.Date.AddYears(1); // open-ended defaults to +1 año
                if (effectiveEndDate < dto.StartDate.Date)
                    return BadRequest(new { message = "Fecha fin debe ser posterior a fecha inicio" });

                if (!TimeSpan.TryParse(dto.StartTimeOfDay, out var startTod) || !TimeSpan.TryParse(dto.EndTimeOfDay, out var endTod))
                    return BadRequest(new { message = "Horario inválido" });
                if (endTod <= startTod)
                    return BadRequest(new { message = "La hora de fin debe ser posterior a la de inicio" });

                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
                if (employee == null)
                    return NotFound(new { message = "Empleado no encontrado" });

                var blocksToAdd = new List<EmployeeTimeBlock>();
                var current = dto.StartDate.Date;
                var days = dto.DaysOfWeek?.Distinct().ToHashSet() ?? new HashSet<int>();

                // Determine tenant timezone offset (simple hour offset like "-3")
                var tenant = _tenantService.GetCurrentTenant();
                var tz = tenant?.TimeZone ?? "-3";
                int offsetHours;
                if (!int.TryParse(tz, out offsetHours))
                {
                    offsetHours = -3; // default AR
                }

                // Generate a series ID for this recurring block group
                var seriesId = Guid.NewGuid();
                var recurrencePattern = System.Text.Json.JsonSerializer.Serialize(new
                {
                    daysOfWeek = dto.DaysOfWeek,
                    startTimeOfDay = dto.StartTimeOfDay,
                    endTimeOfDay = dto.EndTimeOfDay
                });

                var cancelledCount = 0;
                while (current <= effectiveEndDate)
                {
                    if (days.Count == 0 || days.Contains((int)current.DayOfWeek))
                    {
                        // Local times based on tenant offset
                        var localStart = current.Add(startTod);
                        var localEnd = current.Add(endTod);

                        // Convert to UTC for storage and comparisons
                        var start = DateTime.SpecifyKind(localStart.AddHours(-offsetHours), DateTimeKind.Utc);
                        var end = DateTime.SpecifyKind(localEnd.AddHours(-offsetHours), DateTimeKind.Utc);

                        // check conflicts with bookings
                        var overlappingBookings = await _context.Bookings
                            .Where(b => b.EmployeeId == employeeId && b.Status != "cancelled" && b.StartTime < end && b.EndTime > start)
                            .ToListAsync();
                        var hasBlock = await _context.EmployeeTimeBlocks.AnyAsync(b =>
                            b.EmployeeId == employeeId && b.StartTime < end && b.EndTime > start);

                        if (!overlappingBookings.Any() && !hasBlock)
                        {
                            blocksToAdd.Add(new EmployeeTimeBlock
                            {
                                TenantId = employee.TenantId,
                                EmployeeId = employeeId,
                                StartTime = start,
                                EndTime = end,
                                Reason = dto.Reason,
                                SeriesId = seriesId,
                                RecurrencePattern = recurrencePattern
                            });
                        }
                        else if (overlappingBookings.Any() && dto.ForceOverride && !hasBlock)
                        {
                            foreach (var b in overlappingBookings)
                            {
                                b.Status = "cancelled";
                                cancelledCount++;
                            }
                            blocksToAdd.Add(new EmployeeTimeBlock
                            {
                                TenantId = employee.TenantId,
                                EmployeeId = employeeId,
                                StartTime = start,
                                EndTime = end,
                                Reason = dto.Reason,
                                SeriesId = seriesId,
                                RecurrencePattern = recurrencePattern
                            });
                        }
                    }
                    current = current.AddDays(1);
                }

                if (blocksToAdd.Any())
                {
                    _context.EmployeeTimeBlocks.AddRange(blocksToAdd);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { created = blocksToAdd.Count, cancelledBookings = cancelledCount, seriesId = seriesId });
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

                // Conflicts
                var overlappingBookings = await _context.Bookings
                    .Where(b => b.EmployeeId == employeeId && b.Status != "cancelled" && b.StartTime < dto.EndTime && b.EndTime > dto.StartTime)
                    .ToListAsync();
                if (overlappingBookings.Any() && !dto.ForceOverride)
                    return BadRequest(new { message = "Existe una reserva en ese rango. No se puede actualizar (quite las reservas o use forzar)." });

                var overlappingBlocks = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId && b.Id != blockId && b.StartTime < dto.EndTime && b.EndTime > dto.StartTime)
                    .AnyAsync();
                if (overlappingBlocks)
                    return BadRequest(new { message = "Ya existe otro bloqueo en ese rango" });

                if (overlappingBookings.Any() && dto.ForceOverride)
                {
                    foreach (var b in overlappingBookings)
                        b.Status = "cancelled";
                }

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
        [HttpDelete("{blockId:guid}")]
        public async Task<IActionResult> DeleteBlock(Guid employeeId, Guid blockId)
        {
            try
            {
                var block = await _context.EmployeeTimeBlocks
                    .FirstOrDefaultAsync(b => b.Id == blockId && b.EmployeeId == employeeId);
                if (block == null)
                {
                    return NotFound(new { message = "Bloqueo no encontrado" });
                }

                _context.EmployeeTimeBlocks.Remove(block);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Bloqueo eliminado" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Delete all blocks in a series
        [HttpDelete("series/{seriesId:guid}")]
        public async Task<IActionResult> DeleteSeries(Guid employeeId, Guid seriesId)
        {
            try
            {
                var blocks = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId && b.SeriesId == seriesId)
                    .ToListAsync();

                if (!blocks.Any())
                    return NotFound(new { message = "Serie no encontrada" });

                _context.EmployeeTimeBlocks.RemoveRange(blocks);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Serie eliminada", deleted = blocks.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Delete this block and all following blocks in the series
        [HttpDelete("{blockId:guid}/and-following")]
        public async Task<IActionResult> DeleteBlockAndFollowing(Guid employeeId, Guid blockId)
        {
            try
            {
                var block = await _context.EmployeeTimeBlocks
                    .FirstOrDefaultAsync(b => b.Id == blockId && b.EmployeeId == employeeId);
                if (block == null)
                    return NotFound(new { message = "Bloqueo no encontrado" });

                if (!block.SeriesId.HasValue)
                {
                    // Single block, just delete it
                    _context.EmployeeTimeBlocks.Remove(block);
                    await _context.SaveChangesAsync();
                    return Ok(new { message = "Bloqueo eliminado", deleted = 1 });
                }

                // Delete this and all following in the series
                var blocksToDelete = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId && b.SeriesId == block.SeriesId && b.StartTime >= block.StartTime)
                    .ToListAsync();

                _context.EmployeeTimeBlocks.RemoveRange(blocksToDelete);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Bloqueos eliminados", deleted = blocksToDelete.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        public class UpdateSeriesDto
        {
            public string? Reason { get; set; }
            public string? StartTimeOfDay { get; set; } // HH:mm - only for updating time across all blocks
            public string? EndTimeOfDay { get; set; }   // HH:mm
            public bool ForceOverride { get; set; } = false;
        }

        // Update all blocks in a series (reason and/or time)
        [HttpPut("series/{seriesId:guid}")]
        public async Task<IActionResult> UpdateSeries(Guid employeeId, Guid seriesId, [FromBody] UpdateSeriesDto dto)
        {
            try
            {
                var blocks = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId && b.SeriesId == seriesId)
                    .OrderBy(b => b.StartTime)
                    .ToListAsync();

                if (!blocks.Any())
                    return NotFound(new { message = "Serie no encontrada" });

                // Get tenant timezone
                var tenant = _tenantService.GetCurrentTenant();
                var tz = tenant?.TimeZone ?? "-3";
                int offsetHours = int.TryParse(tz, out var oh) ? oh : -3;

                TimeSpan? newStartTod = null;
                TimeSpan? newEndTod = null;
                if (!string.IsNullOrEmpty(dto.StartTimeOfDay) && TimeSpan.TryParse(dto.StartTimeOfDay, out var st))
                    newStartTod = st;
                if (!string.IsNullOrEmpty(dto.EndTimeOfDay) && TimeSpan.TryParse(dto.EndTimeOfDay, out var et))
                    newEndTod = et;

                var cancelledCount = 0;
                foreach (var block in blocks)
                {
                    if (dto.Reason != null)
                        block.Reason = dto.Reason;

                    // Update times if provided
                    if (newStartTod.HasValue || newEndTod.HasValue)
                    {
                        // Get original local date
                        var localStart = block.StartTime.AddHours(offsetHours);
                        var localEnd = block.EndTime.AddHours(offsetHours);
                        var blockDate = localStart.Date;

                        var newLocalStart = blockDate.Add(newStartTod ?? localStart.TimeOfDay);
                        var newLocalEnd = blockDate.Add(newEndTod ?? localEnd.TimeOfDay);

                        var newUtcStart = DateTime.SpecifyKind(newLocalStart.AddHours(-offsetHours), DateTimeKind.Utc);
                        var newUtcEnd = DateTime.SpecifyKind(newLocalEnd.AddHours(-offsetHours), DateTimeKind.Utc);

                        // Check for booking conflicts
                        var overlappingBookings = await _context.Bookings
                            .Where(b => b.EmployeeId == employeeId && b.Status != "cancelled" && b.StartTime < newUtcEnd && b.EndTime > newUtcStart)
                            .ToListAsync();

                        if (overlappingBookings.Any() && !dto.ForceOverride)
                            continue; // Skip this block if conflicts and not forcing

                        if (overlappingBookings.Any() && dto.ForceOverride)
                        {
                            foreach (var b in overlappingBookings)
                            {
                                b.Status = "cancelled";
                                cancelledCount++;
                            }
                        }

                        block.StartTime = newUtcStart;
                        block.EndTime = newUtcEnd;
                    }

                    // Update recurrence pattern if times changed
                    if (newStartTod.HasValue || newEndTod.HasValue)
                    {
                        var pattern = new
                        {
                            startTimeOfDay = dto.StartTimeOfDay ?? newStartTod?.ToString(@"hh\:mm"),
                            endTimeOfDay = dto.EndTimeOfDay ?? newEndTod?.ToString(@"hh\:mm")
                        };
                        block.RecurrencePattern = System.Text.Json.JsonSerializer.Serialize(pattern);
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = "Serie actualizada", updated = blocks.Count, cancelledBookings = cancelledCount });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Update this block and all following in the series
        [HttpPut("{blockId:guid}/and-following")]
        public async Task<IActionResult> UpdateBlockAndFollowing(Guid employeeId, Guid blockId, [FromBody] UpdateSeriesDto dto)
        {
            try
            {
                var block = await _context.EmployeeTimeBlocks
                    .FirstOrDefaultAsync(b => b.Id == blockId && b.EmployeeId == employeeId);
                if (block == null)
                    return NotFound(new { message = "Bloqueo no encontrado" });

                if (!block.SeriesId.HasValue)
                {
                    // Single block, just update it
                    if (dto.Reason != null) block.Reason = dto.Reason;
                    await _context.SaveChangesAsync();
                    return Ok(new { message = "Bloqueo actualizado", updated = 1 });
                }

                // Get all following blocks in the series (including this one)
                var blocksToUpdate = await _context.EmployeeTimeBlocks
                    .Where(b => b.EmployeeId == employeeId && b.SeriesId == block.SeriesId && b.StartTime >= block.StartTime)
                    .OrderBy(b => b.StartTime)
                    .ToListAsync();

                // Create a new series for these blocks
                var newSeriesId = Guid.NewGuid();

                // Get tenant timezone
                var tenant = _tenantService.GetCurrentTenant();
                var tz = tenant?.TimeZone ?? "-3";
                int offsetHours = int.TryParse(tz, out var oh) ? oh : -3;

                TimeSpan? newStartTod = null;
                TimeSpan? newEndTod = null;
                if (!string.IsNullOrEmpty(dto.StartTimeOfDay) && TimeSpan.TryParse(dto.StartTimeOfDay, out var st))
                    newStartTod = st;
                if (!string.IsNullOrEmpty(dto.EndTimeOfDay) && TimeSpan.TryParse(dto.EndTimeOfDay, out var et))
                    newEndTod = et;

                var cancelledCount = 0;
                foreach (var b in blocksToUpdate)
                {
                    b.SeriesId = newSeriesId; // Split into new series
                    if (dto.Reason != null) b.Reason = dto.Reason;

                    if (newStartTod.HasValue || newEndTod.HasValue)
                    {
                        var localStart = b.StartTime.AddHours(offsetHours);
                        var localEnd = b.EndTime.AddHours(offsetHours);
                        var blockDate = localStart.Date;

                        var newLocalStart = blockDate.Add(newStartTod ?? localStart.TimeOfDay);
                        var newLocalEnd = blockDate.Add(newEndTod ?? localEnd.TimeOfDay);

                        var newUtcStart = DateTime.SpecifyKind(newLocalStart.AddHours(-offsetHours), DateTimeKind.Utc);
                        var newUtcEnd = DateTime.SpecifyKind(newLocalEnd.AddHours(-offsetHours), DateTimeKind.Utc);

                        var overlappingBookings = await _context.Bookings
                            .Where(bk => bk.EmployeeId == employeeId && bk.Status != "cancelled" && bk.StartTime < newUtcEnd && bk.EndTime > newUtcStart)
                            .ToListAsync();

                        if (overlappingBookings.Any() && dto.ForceOverride)
                        {
                            foreach (var bk in overlappingBookings)
                            {
                                bk.Status = "cancelled";
                                cancelledCount++;
                            }
                        }

                        if (!overlappingBookings.Any() || dto.ForceOverride)
                        {
                            b.StartTime = newUtcStart;
                            b.EndTime = newUtcEnd;
                        }
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = "Bloqueos actualizados", updated = blocksToUpdate.Count, newSeriesId = newSeriesId, cancelledBookings = cancelledCount });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
