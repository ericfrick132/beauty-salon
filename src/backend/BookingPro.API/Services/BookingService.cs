using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Enums;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace BookingPro.API.Services
{
    public class BookingService : IBookingService
    {
        private readonly IRepository<Booking> _bookingRepository;
        private readonly IRepository<Service> _serviceRepository;
        private readonly IRepository<Employee> _employeeRepository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly ITenantService _tenantService;
        private readonly ILogger<BookingService> _logger;

        private record BusinessHoursConfig(TimeSpan Opening, TimeSpan Closing, HashSet<int> ClosedDays);
        private static readonly TimeSpan DefaultOpening = new TimeSpan(9, 0, 0);
        private static readonly TimeSpan DefaultClosing = new TimeSpan(22, 0, 0);

        public BookingService(
            IRepository<Booking> bookingRepository,
            IRepository<Service> serviceRepository,
            IRepository<Employee> employeeRepository,
            IRepository<Customer> customerRepository,
            ITenantService tenantService,
            ILogger<BookingService> logger)
        {
            _bookingRepository = bookingRepository;
            _serviceRepository = serviceRepository;
            _employeeRepository = employeeRepository;
            _customerRepository = customerRepository;
            _tenantService = tenantService;
            _logger = logger;
        }

        public async Task<ServiceResult<IEnumerable<BookingListDto>>> GetBookingsAsync(DateTime? date = null, Guid? employeeId = null, string? status = null)
        {
            try
            {
                var query = _bookingRepository.Query(b => b.Customer, b => b.Employee, b => b.Service);

                if (date.HasValue)
                {
                    query = query.Where(b => b.StartTime.Date == date.Value.Date);
                }

                if (employeeId.HasValue)
                {
                    query = query.Where(b => b.EmployeeId == employeeId.Value);
                }

                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(b => b.Status == status);
                }

                var bookings = await query
                    .OrderBy(b => b.StartTime)
                    .Select(b => new BookingListDto
                    {
                        Id = b.Id,
                        CustomerId = b.CustomerId,
                        CustomerName = $"{b.Customer.FirstName} {b.Customer.LastName}",
                        CustomerPhone = b.Customer.Phone,
                        EmployeeId = b.EmployeeId,
                        EmployeeName = b.Employee.Name,
                        ServiceId = b.ServiceId,
                        ServiceName = b.Service.Name,
                        StartTime = b.StartTime,
                        EndTime = b.EndTime,
                        Status = b.Status,
                        Price = b.Price ?? 0,
                        Notes = b.Notes,
                        HasPayment = _bookingRepository.GetContext().Set<Payment>()
                            .Any(p => p.BookingId == b.Id),
                        IsPaymentSuccessful = _bookingRepository.GetContext().Set<Payment>()
                            .Any(p => p.BookingId == b.Id && p.Status == "completed")
                    })
                    .ToListAsync();

                return ServiceResult<IEnumerable<BookingListDto>>.Ok(bookings);
            }
            catch (Exception ex)
            {
                return ServiceResult<IEnumerable<BookingListDto>>.Fail($"Error retrieving bookings: {ex.Message}");
            }
        }

        public async Task<ServiceResult<IEnumerable<BookingListDto>>> GetUnpaidBookingsAsync()
        {
            try
            {
                // Get all bookings that are not cancelled and don't have successful payments
                var bookings = await _bookingRepository.Query(b => b.Customer, b => b.Employee, b => b.Service)
                    .Where(b => b.Status != "cancelled")
                    .Where(b => !_bookingRepository.GetContext().Set<Payment>()
                        .Any(p => p.BookingId == b.Id && p.Status == "completed"))
                    .Select(b => new BookingListDto
                    {
                        Id = b.Id,
                        CustomerId = b.CustomerId,
                        CustomerName = $"{b.Customer.FirstName} {b.Customer.LastName}",
                        CustomerPhone = b.Customer.Phone,
                        EmployeeId = b.EmployeeId,
                        EmployeeName = b.Employee.Name,
                        ServiceId = b.ServiceId,
                        ServiceName = b.Service.Name,
                        StartTime = b.StartTime,
                        EndTime = b.EndTime,
                        Status = b.Status,
                        Price = b.Price ?? 0,
                        Notes = b.Notes,
                        HasPayment = false, // By definition, unpaid bookings don't have successful payments
                        IsPaymentSuccessful = false
                    })
                    .OrderBy(b => b.StartTime)
                    .ToListAsync();

                return ServiceResult<IEnumerable<BookingListDto>>.Ok(bookings);
            }
            catch (Exception ex)
            {
                return ServiceResult<IEnumerable<BookingListDto>>.Fail($"Error retrieving unpaid bookings: {ex.Message}");
            }
        }

        public async Task<ServiceResult<BookingDetailDto>> GetBookingByIdAsync(Guid id)
        {
            try
            {
                var booking = await _bookingRepository.GetByIdAsync(id, b => b.Customer, b => b.Employee, b => b.Service);

                if (booking == null)
                {
                    return ServiceResult<BookingDetailDto>.NotFound("Booking not found");
                }

                var result = new BookingDetailDto
                {
                    Id = booking.Id,
                    Customer = new CustomerSummaryDto
                    {
                        Id = booking.Customer.Id,
                        Name = $"{booking.Customer.FirstName} {booking.Customer.LastName}",
                        Phone = booking.Customer.Phone,
                        Email = booking.Customer.Email
                    },
                    Employee = new EmployeeSummaryDto
                    {
                        Id = booking.Employee.Id,
                        Name = booking.Employee.Name
                    },
                    Service = new ServiceSummaryDto
                    {
                        Id = booking.Service.Id,
                        Name = booking.Service.Name,
                        Price = booking.Service.Price,
                        DurationMinutes = booking.Service.DurationMinutes
                    },
                    StartTime = booking.StartTime,
                    EndTime = booking.EndTime,
                    Status = booking.Status,
                    Price = booking.Price ?? 0,
                    Notes = booking.Notes,
                    ReminderSent = booking.ReminderSent,
                    CreatedAt = booking.CreatedAt,
                    UpdatedAt = booking.UpdatedAt,
                    CancelledAt = booking.CancelledAt,
                    CancellationReason = booking.CancellationReason
                };

                return ServiceResult<BookingDetailDto>.Ok(result);
            }
            catch (Exception ex)
            {
                return ServiceResult<BookingDetailDto>.Fail($"Error retrieving booking: {ex.Message}");
            }
        }

        public async Task<ServiceResult<Booking>> CreateBookingAsync(CreateBookingDto dto)
        {
            try
            {
                // Validar que el servicio existe
                var service = await _serviceRepository.GetByIdAsync(dto.ServiceId);
                if (service == null)
                    return ServiceResult<Booking>.Fail("Service not found");

                // Validar que el empleado existe
                var employee = await _employeeRepository.GetByIdAsync(dto.EmployeeId);
                if (employee == null)
                    return ServiceResult<Booking>.Fail("Employee not found");

                // Validar que el cliente existe
                var customer = await _customerRepository.GetByIdAsync(dto.CustomerId);
                if (customer == null)
                    return ServiceResult<Booking>.Fail("Customer not found");

                // Validaciones críticas de negocio
                var validationResult = await ValidateBookingBusinessRules(dto.EmployeeId, dto.StartTime, dto.EndTime, service, null);
                if (!validationResult.Success)
                    return ServiceResult<Booking>.Fail(validationResult.Message!);

                var booking = new Booking
                {
                    Id = Guid.NewGuid(),
                    CustomerId = dto.CustomerId,
                    EmployeeId = dto.EmployeeId,
                    ServiceId = dto.ServiceId,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    Status = dto.Status ?? "pending",
                    Price = dto.Price ?? service.Price,
                    Notes = dto.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var createdBooking = await _bookingRepository.AddAsync(booking);
                return ServiceResult<Booking>.Ok(createdBooking, "Booking created successfully");
            }
            catch (Exception ex)
            {
                return ServiceResult<Booking>.Fail($"Error creating booking: {ex.Message}");
            }
        }

        public async Task<ServiceResult<Booking>> UpdateBookingAsync(Guid id, UpdateBookingDto dto)
        {
            try
            {
                var booking = await _bookingRepository.GetByIdAsync(id, b => b.Service);
                if (booking == null)
                    return ServiceResult<Booking>.NotFound("Booking not found");

                // Si se están cambiando fecha/hora/empleado, validar reglas de negocio
                if (dto.StartTime.HasValue || dto.EndTime.HasValue || dto.EmployeeId.HasValue)
                {
                    var startTime = dto.StartTime ?? booking.StartTime;
                    var endTime = dto.EndTime ?? booking.EndTime;
                    var employeeId = dto.EmployeeId ?? booking.EmployeeId;
                    var service = booking.Service;

                    if (dto.ServiceId.HasValue)
                    {
                        service = await _serviceRepository.GetByIdAsync(dto.ServiceId.Value);
                        if (service == null)
                            return ServiceResult<Booking>.Fail("Service not found");
                    }

                    var validationResult = await ValidateBookingBusinessRules(employeeId, startTime, endTime, service, id);
                    if (!validationResult.Success)
                        return ServiceResult<Booking>.Fail(validationResult.Message!);
                }

                // Aplicar cambios
                if (dto.CustomerId.HasValue)
                    booking.CustomerId = dto.CustomerId.Value;
                if (dto.EmployeeId.HasValue)
                    booking.EmployeeId = dto.EmployeeId.Value;
                if (dto.ServiceId.HasValue)
                    booking.ServiceId = dto.ServiceId.Value;
                if (dto.StartTime.HasValue)
                    booking.StartTime = dto.StartTime.Value;
                if (dto.EndTime.HasValue)
                    booking.EndTime = dto.EndTime.Value;
                if (!string.IsNullOrEmpty(dto.Status))
                    booking.Status = dto.Status;
                if (dto.Price.HasValue)
                    booking.Price = dto.Price.Value;
                if (dto.Notes != null)
                    booking.Notes = dto.Notes;

                booking.UpdatedAt = DateTime.UtcNow;

                if (dto.Status == "cancelled" && booking.CancelledAt == null)
                {
                    booking.CancelledAt = DateTime.UtcNow;
                    booking.CancellationReason = dto.CancellationReason;
                }

                var updatedBooking = await _bookingRepository.UpdateAsync(booking);
                return ServiceResult<Booking>.Ok(updatedBooking, "Booking updated successfully");
            }
            catch (Exception ex)
            {
                return ServiceResult<Booking>.Fail($"Error updating booking: {ex.Message}");
            }
        }

        public async Task<ServiceResult> DeleteBookingAsync(Guid id)
        {
            try
            {
                var booking = await _bookingRepository.GetByIdAsync(id);
                if (booking == null)
                    return ServiceResult.Fail("Booking not found");

                var context = _bookingRepository.GetContext();

                // Delete associated PaymentTransactions first (they have Restrict on BookingId)
                var paymentTransactions = await context.Set<PaymentTransaction>()
                    .Where(pt => pt.BookingId == id)
                    .ToListAsync();

                if (paymentTransactions.Any())
                {
                    context.Set<PaymentTransaction>().RemoveRange(paymentTransactions);
                }

                // Delete associated Payments (they have Restrict on BookingId)
                var payments = await context.Set<Payment>()
                    .Where(p => p.BookingId == id)
                    .ToListAsync();

                if (payments.Any())
                {
                    context.Set<Payment>().RemoveRange(payments);
                }

                // Now delete the booking
                await _bookingRepository.DeleteAsync(booking);
                return ServiceResult.Ok("Booking deleted successfully");
            }
            catch (Exception ex)
            {
                return ServiceResult.Fail($"Error deleting booking: {ex.Message}");
            }
        }

        public async Task<ServiceResult<IEnumerable<string>>> GetAvailableTimeSlotsAsync(Guid professionalId, DateTime date, Guid serviceId)
        {
            try
            {
                var businessConfig = await GetBusinessHoursConfigAsync();

                var service = await _serviceRepository.GetByIdAsync(serviceId);
                if (service == null)
                    return ServiceResult<IEnumerable<string>>.Fail("Service not found");

                // Get tenant timezone offset
                var tenantInfo = _tenantService.GetCurrentTenant();
                var timezoneOffset = tenantInfo?.TimeZone ?? "-3";
                
                // Parse timezone offset (e.g., "-3" -> -3 hours)
                if (!int.TryParse(timezoneOffset, out int offsetHours))
                {
                    offsetHours = -3; // Default to Argentina timezone
                }

                // Convert input date to tenant timezone using simple offset
                var localDate = date.Kind == DateTimeKind.Utc 
                    ? date.AddHours(offsetHours)
                    : date;

                if (businessConfig.ClosedDays.Contains((int)localDate.DayOfWeek))
                {
                    return ServiceResult<IEnumerable<string>>.Ok(new List<string>());
                }
                
                var startOfDay = localDate.Date;
                var endOfDay = startOfDay.AddDays(1);

                // Convert to UTC for database query (subtract the offset)
                var utcStartOfDay = DateTime.SpecifyKind(startOfDay.AddHours(-offsetHours), DateTimeKind.Utc);
                var utcEndOfDay = DateTime.SpecifyKind(endOfDay.AddHours(-offsetHours), DateTimeKind.Utc);

                var existingBookings = await _bookingRepository.FindAsync(b => 
                    b.EmployeeId == professionalId && 
                    b.StartTime >= utcStartOfDay &&
                    b.StartTime < utcEndOfDay &&
                    b.Status != "cancelled");

                // Load employee blocks for the day (in UTC)
                var context = _bookingRepository.GetContext();
                var blocks = await context.Set<EmployeeTimeBlock>()
                    .Where(b => b.EmployeeId == professionalId && b.StartTime < utcEndOfDay && b.EndTime > utcStartOfDay)
                    .ToListAsync();

                var availableSlots = new List<string>();
                var employeeHours = GetEmployeeBusinessHoursForDate(professionalId, localDate);
                var businessHours = employeeHours ?? (businessConfig.Opening, businessConfig.Closing);
                var startWindow = businessHours.start < businessConfig.Opening ? businessConfig.Opening : businessHours.start;
                var endWindow = businessHours.end > businessConfig.Closing ? businessConfig.Closing : businessHours.end;
                if (startWindow >= endWindow)
                {
                    return ServiceResult<IEnumerable<string>>.Ok(availableSlots);
                }
                var slotDuration = TimeSpan.FromMinutes(service.DurationMinutes);
                var minimumGap = TimeSpan.FromMinutes(15); // Tiempo mínimo entre citas

                for (var time = startWindow; time <= endWindow.Subtract(slotDuration); time = time.Add(TimeSpan.FromMinutes(30)))
                {
                    var localSlotStart = startOfDay.Add(time);
                    var localSlotEnd = localSlotStart.Add(slotDuration);
                    
                    // Convert to UTC for comparison with existing bookings (subtract the offset)
                    var utcSlotStart = localSlotStart.AddHours(-offsetHours);
                    var utcSlotEnd = localSlotEnd.AddHours(-offsetHours);

                    // Verificar conflictos con reservas existentes (incluyendo tiempo mínimo)
                    var hasConflict = existingBookings.Any(b => 
                    {
                        var bufferStart = b.StartTime.Subtract(minimumGap);
                        var bufferEnd = b.EndTime.Add(minimumGap);
                        return utcSlotStart < bufferEnd && utcSlotEnd > bufferStart;
                    }) || blocks.Any(bl => utcSlotStart < bl.EndTime && utcSlotEnd > bl.StartTime);

                    if (!hasConflict && IsWithinBusinessHours(localSlotStart, localSlotEnd, businessConfig))
                    {
                        // Compare with current time in tenant timezone
                        var currentTimeInTenantZone = DateTime.UtcNow.AddHours(offsetHours);
                        var isPast = localSlotStart <= currentTimeInTenantZone;
                        var timeString = localSlotStart.ToString("HH:mm");
                        
                        
                        availableSlots.Add(isPast ? $"PAST:{timeString}" : timeString);
                    }
                }

                return ServiceResult<IEnumerable<string>>.Ok(availableSlots);
            }
            catch (Exception ex)
            {
                return ServiceResult<IEnumerable<string>>.Fail($"Error getting available slots: {ex.Message}");
            }
        }

        // Validaciones críticas de negocio
        private async Task<ServiceResult> ValidateBookingBusinessRules(Guid employeeId, DateTime startTime, DateTime endTime, Service service, Guid? bookingIdToExclude = null)
        {
            _logger.LogInformation("ValidateBookingBusinessRules: employeeId={EmployeeId}, startTime={StartTime}, endTime={EndTime}, dayOfWeek={DayOfWeek}",
                employeeId, startTime, endTime, (int)startTime.DayOfWeek);

            var businessConfig = await GetBusinessHoursConfigAsync();
            _logger.LogInformation("BusinessConfig: Opening={Opening}, Closing={Closing}, ClosedDays={ClosedDays}",
                businessConfig.Opening, businessConfig.Closing, string.Join(",", businessConfig.ClosedDays));

            if (businessConfig.ClosedDays.Contains((int)startTime.DayOfWeek))
            {
                _logger.LogWarning("Validation failed: Business closed on day {DayOfWeek}", (int)startTime.DayOfWeek);
                return ServiceResult.Fail("El negocio está cerrado en ese día");
            }

            // 1. Validar horario de negocio (general window)
            if (!IsWithinBusinessHours(startTime, endTime, businessConfig))
            {
                _logger.LogWarning("Validation failed: Outside business hours. Start={StartTime}, End={EndTime}, Opening={Opening}, Closing={Closing}",
                    startTime.TimeOfDay, endTime.TimeOfDay, businessConfig.Opening, businessConfig.Closing);
                return ServiceResult.Fail("La cita está fuera del horario de atención del negocio");
            }

            // 1b. Validar horario del empleado (turno de trabajo)
            var withinSchedule = await ValidateWithinEmployeeSchedule(employeeId, startTime, endTime);
            if (!withinSchedule.Success)
            {
                _logger.LogWarning("Validation failed: Employee schedule. Message={Message}", withinSchedule.Message);
                return withinSchedule;
            }

            // 2. Nota: Permitimos citas en el pasado (puede ser útil para registrar citas que ya ocurrieron)
            // No validamos si está en el pasado

            // 3. Validar duración mínima
            if (endTime <= startTime)
            {
                _logger.LogWarning("Validation failed: End time before start time");
                return ServiceResult.Fail("La hora de fin debe ser posterior a la hora de inicio");
            }

            // 4. Prevenir doble booking
            var doubleBookingResult = await ValidateNoDoubleBooking(employeeId, startTime, endTime, bookingIdToExclude);
            if (!doubleBookingResult.Success)
            {
                _logger.LogWarning("Validation failed: Double booking. Message={Message}", doubleBookingResult.Message);
                return doubleBookingResult;
            }

            // 5. Validar bloqueos del empleado
            var blockResult = await ValidateEmployeeNotBlocked(employeeId, startTime, endTime);
            if (!blockResult.Success)
            {
                _logger.LogWarning("Validation failed: Employee blocked. Message={Message}", blockResult.Message);
                return blockResult;
            }

            // 6. Validar tiempo mínimo entre citas
            var gapResult = await ValidateMinimumGapBetweenAppointments(employeeId, startTime, endTime, bookingIdToExclude);
            if (!gapResult.Success)
            {
                _logger.LogWarning("Validation failed: Minimum gap. Message={Message}", gapResult.Message);
                return gapResult;
            }

            return ServiceResult.Ok("Validation passed");
        }

        private async Task<ServiceResult> ValidateNoDoubleBooking(Guid employeeId, DateTime startTime, DateTime endTime, Guid? bookingIdToExclude)
        {
            var query = _bookingRepository.Query()
                .Where(b => b.EmployeeId == employeeId &&
                           b.Status != "cancelled" &&
                           b.StartTime < endTime &&
                           b.EndTime > startTime);

            if (bookingIdToExclude.HasValue)
            {
                query = query.Where(b => b.Id != bookingIdToExclude.Value);
            }

            var conflictingBooking = await query.FirstOrDefaultAsync();
            if (conflictingBooking != null)
            {
                return ServiceResult.Fail($"El empleado ya tiene una cita programada de {conflictingBooking.StartTime:HH:mm} a {conflictingBooking.EndTime:HH:mm}");
            }

            return ServiceResult.Ok();
        }

        private async Task<ServiceResult> ValidateMinimumGapBetweenAppointments(Guid employeeId, DateTime startTime, DateTime endTime, Guid? bookingIdToExclude)
        {
            var minimumGap = TimeSpan.FromMinutes(15);
            var bufferStart = startTime.Subtract(minimumGap);
            var bufferEnd = endTime.Add(minimumGap);

            var query = _bookingRepository.Query()
                .Where(b => b.EmployeeId == employeeId &&
                           b.Status != "cancelled" &&
                           ((b.StartTime >= bufferStart && b.StartTime < startTime) ||
                            (b.EndTime > endTime && b.EndTime <= bufferEnd)));

            if (bookingIdToExclude.HasValue)
            {
                query = query.Where(b => b.Id != bookingIdToExclude.Value);
            }

            var nearbyBooking = await query.FirstOrDefaultAsync();
            if (nearbyBooking != null)
            {
                return ServiceResult.Fail($"Debe haber al menos 15 minutos entre citas. Hay una cita muy cerca programada de {nearbyBooking.StartTime:HH:mm} a {nearbyBooking.EndTime:HH:mm}");
            }

            return ServiceResult.Ok();
        }

        private (TimeSpan start, TimeSpan end)? GetEmployeeBusinessHoursForDate(Guid employeeId, DateTime localDate)
        {
            var ctx = _bookingRepository.GetContext();
            var dow = (int)localDate.DayOfWeek;
            var sched = ctx.Set<Schedule>()
                .AsNoTracking()
                .Where(s => s.EmployeeId == employeeId && s.IsActive && s.DayOfWeek == dow)
                .Select(s => new { s.StartTime, s.EndTime })
                .ToList();
            if (!sched.Any()) return null;
            var start = sched.Min(s => s.StartTime);
            var end = sched.Max(s => s.EndTime);
            return (start, end);
        }

        private bool IsWithinBusinessHours(DateTime startTime, DateTime endTime, BusinessHoursConfig businessConfig)
        {
            if (businessConfig.ClosedDays.Contains((int)startTime.DayOfWeek) ||
                businessConfig.ClosedDays.Contains((int)endTime.DayOfWeek))
            {
                return false;
            }

            var startTimeOfDay = startTime.TimeOfDay;
            var endTimeOfDay = endTime.TimeOfDay;

            return startTimeOfDay >= businessConfig.Opening &&
                   endTimeOfDay <= businessConfig.Closing &&
                   startTime.Date == endTime.Date; // Misma fecha
        }

        private async Task<BusinessHoursConfig> GetBusinessHoursConfigAsync()
        {
            var defaultConfig = new BusinessHoursConfig(DefaultOpening, DefaultClosing, new HashSet<int>());
            var tenantInfo = _tenantService.GetCurrentTenant();
            if (tenantInfo == null) return defaultConfig;

            var ctx = _bookingRepository.GetContext();
            var tenant = await ctx.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantInfo.Id);
            if (tenant == null) return defaultConfig;

            try
            {
                var settings = JsonSerializer.Deserialize<Dictionary<string, object>>(tenant.Settings ?? "{}") ?? new();
                var opening = ParseTimeSetting(settings, "businessOpeningTime") ?? DefaultOpening;
                var closing = ParseTimeSetting(settings, "businessClosingTime") ?? DefaultClosing;
                if (opening >= closing)
                {
                    opening = DefaultOpening;
                    closing = DefaultClosing;
                }

                var closedDays = ParseClosedDays(settings);
                return new BusinessHoursConfig(opening, closing, closedDays);
            }
            catch
            {
                return defaultConfig;
            }
        }

        private static TimeSpan? ParseTimeSetting(Dictionary<string, object> settings, string key)
        {
            if (!settings.TryGetValue(key, out var value) || value == null) return null;

            if (value is JsonElement je && je.ValueKind == JsonValueKind.String)
            {
                if (TimeSpan.TryParse(je.GetString(), out var parsed)) return parsed;
            }
            else if (value is string str && TimeSpan.TryParse(str, out var parsed))
            {
                return parsed;
            }
            else if (TimeSpan.TryParse(value.ToString(), out var parsedObj))
            {
                return parsedObj;
            }

            return null;
        }

        private static HashSet<int> ParseClosedDays(Dictionary<string, object> settings)
        {
            try
            {
                if (!settings.TryGetValue("businessClosedDays", out var value) || value == null)
                {
                    return new HashSet<int>();
                }

                if (value is JsonElement je && je.ValueKind == JsonValueKind.Array)
                {
                    var days = je.EnumerateArray()
                        .Where(item => item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out _))
                        .Select(item => item.GetInt32());
                    return new HashSet<int>(days);
                }

                if (value is IEnumerable<object> objList)
                {
                    return new HashSet<int>(objList.Select(o => Convert.ToInt32(o)));
                }

                var parsed = JsonSerializer.Deserialize<List<int>>(value.ToString() ?? "[]") ?? new List<int>();
                return new HashSet<int>(parsed);
            }
            catch
            {
                return new HashSet<int>();
            }
        }

        private async Task<ServiceResult> ValidateWithinEmployeeSchedule(Guid employeeId, DateTime startTime, DateTime endTime)
        {
            var ctx = _bookingRepository.GetContext();
            var dow = (int)startTime.DayOfWeek;
            var schedules = await ctx.Set<Schedule>()
                .Where(s => s.EmployeeId == employeeId && s.IsActive && s.DayOfWeek == dow)
                .ToListAsync();

            _logger.LogInformation("ValidateWithinEmployeeSchedule: employeeId={EmployeeId}, dayOfWeek={DayOfWeek}, schedulesFound={Count}",
                employeeId, dow, schedules.Count);

            if (!schedules.Any())
            {
                _logger.LogWarning("No schedules found for employee {EmployeeId} on day {DayOfWeek}", employeeId, dow);
                return ServiceResult.Fail("El profesional no atiende en ese día");
            }

            var startTod = startTime.TimeOfDay;
            var endTod = endTime.TimeOfDay;

            foreach (var s in schedules)
            {
                _logger.LogInformation("Schedule: DayOfWeek={DayOfWeek}, Start={Start}, End={End}, IsActive={IsActive}",
                    s.DayOfWeek, s.StartTime, s.EndTime, s.IsActive);
            }

            var ok = schedules.Any(s => startTod >= s.StartTime && endTod <= s.EndTime);
            _logger.LogInformation("Time check: bookingStart={BookingStart}, bookingEnd={BookingEnd}, withinSchedule={Ok}",
                startTod, endTod, ok);

            if (!ok) return ServiceResult.Fail("El profesional no atiende en ese horario");
            return ServiceResult.Ok();
        }

        private async Task<ServiceResult> ValidateEmployeeNotBlocked(Guid employeeId, DateTime startTime, DateTime endTime)
        {
            var ctx = _bookingRepository.GetContext();
            var hasBlock = await ctx.Set<EmployeeTimeBlock>()
                .AnyAsync(b => b.EmployeeId == employeeId && b.StartTime < endTime && b.EndTime > startTime);
            if (hasBlock)
            {
                return ServiceResult.Fail("El profesional tiene un bloqueo en ese horario");
            }
            return ServiceResult.Ok();
        }

        public async Task<ServiceResult<bool>> HasSuccessfulPaymentAsync(Guid bookingId)
        {
            try
            {
                var hasSuccessfulPayment = await _bookingRepository.GetContext().Set<Payment>()
                    .AnyAsync(p => p.BookingId == bookingId && p.Status == "completed");

                return ServiceResult<bool>.Ok(hasSuccessfulPayment);
            }
            catch (Exception ex)
            {
                return ServiceResult<bool>.Fail($"Error checking payment status: {ex.Message}");
            }
        }
    }
}
