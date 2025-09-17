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
                        reason = b.Reason
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
                                Reason = dto.Reason
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
                                Reason = dto.Reason
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

                return Ok(new { created = blocksToAdd.Count, cancelledBookings = cancelledCount });
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
    }
}
