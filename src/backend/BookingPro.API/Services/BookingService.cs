using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Common;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class BookingService : IBookingService
    {
        private readonly IRepository<Booking> _bookingRepository;
        private readonly IRepository<Service> _serviceRepository;
        private readonly IRepository<Employee> _employeeRepository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly ITenantService _tenantService;

        public BookingService(
            IRepository<Booking> bookingRepository,
            IRepository<Service> serviceRepository,
            IRepository<Employee> employeeRepository,
            IRepository<Customer> customerRepository,
            ITenantService tenantService)
        {
            _bookingRepository = bookingRepository;
            _serviceRepository = serviceRepository;
            _employeeRepository = employeeRepository;
            _customerRepository = customerRepository;
            _tenantService = tenantService;
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
                        Notes = b.Notes
                    })
                    .ToListAsync();

                return ServiceResult<IEnumerable<BookingListDto>>.Ok(bookings);
            }
            catch (Exception ex)
            {
                return ServiceResult<IEnumerable<BookingListDto>>.Fail($"Error retrieving bookings: {ex.Message}");
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
                var service = await _serviceRepository.GetByIdAsync(serviceId);
                if (service == null)
                    return ServiceResult<IEnumerable<string>>.Fail("Service not found");

                // Ensure date is UTC to avoid PostgreSQL timezone issues
                var utcDate = date.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(date, DateTimeKind.Utc) 
                    : date.ToUniversalTime();
                
                var startOfDay = utcDate.Date;
                var endOfDay = startOfDay.AddDays(1);

                var existingBookings = await _bookingRepository.FindAsync(b => 
                    b.EmployeeId == professionalId && 
                    b.StartTime >= startOfDay &&
                    b.StartTime < endOfDay &&
                    b.Status != "cancelled");

                var availableSlots = new List<string>();
                var businessHours = GetBusinessHours();
                var slotDuration = TimeSpan.FromMinutes(service.DurationMinutes);
                var minimumGap = TimeSpan.FromMinutes(15); // Tiempo mínimo entre citas

                for (var time = businessHours.start; time <= businessHours.end.Subtract(slotDuration); time = time.Add(TimeSpan.FromMinutes(30)))
                {
                    var slotStart = DateTime.SpecifyKind(utcDate.Date.Add(time), DateTimeKind.Utc);
                    var slotEnd = DateTime.SpecifyKind(slotStart.Add(slotDuration), DateTimeKind.Utc);

                    // Verificar conflictos con reservas existentes (incluyendo tiempo mínimo)
                    var hasConflict = existingBookings.Any(b => 
                    {
                        var bufferStart = b.StartTime.Subtract(minimumGap);
                        var bufferEnd = b.EndTime.Add(minimumGap);
                        return slotStart < bufferEnd && slotEnd > bufferStart;
                    });

                    if (!hasConflict && IsWithinBusinessHours(slotStart, slotEnd))
                    {
                        availableSlots.Add(slotStart.ToString("HH:mm"));
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
            // 1. Validar horario de negocio
            if (!IsWithinBusinessHours(startTime, endTime))
                return ServiceResult.Fail("La cita está fuera del horario de atención del negocio");

            // 2. Validar que no sea en el pasado
            if (startTime <= DateTime.UtcNow)
                return ServiceResult.Fail("No se pueden crear citas en el pasado");

            // 3. Validar duración mínima
            if (endTime <= startTime)
                return ServiceResult.Fail("La hora de fin debe ser posterior a la hora de inicio");

            // 4. Prevenir doble booking
            var doubleBookingResult = await ValidateNoDoubleBooking(employeeId, startTime, endTime, bookingIdToExclude);
            if (!doubleBookingResult.Success)
                return doubleBookingResult;

            // 5. Validar tiempo mínimo entre citas
            var gapResult = await ValidateMinimumGapBetweenAppointments(employeeId, startTime, endTime, bookingIdToExclude);
            if (!gapResult.Success)
                return gapResult;

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

        private (TimeSpan start, TimeSpan end) GetBusinessHours()
        {
            // TODO: Esto debería ser configurable por tenant/negocio
            return (new TimeSpan(9, 0, 0), new TimeSpan(18, 0, 0));
        }

        private bool IsWithinBusinessHours(DateTime startTime, DateTime endTime)
        {
            var businessHours = GetBusinessHours();
            var startTimeOfDay = startTime.TimeOfDay;
            var endTimeOfDay = endTime.TimeOfDay;

            return startTimeOfDay >= businessHours.start &&
                   endTimeOfDay <= businessHours.end &&
                   startTime.Date == endTime.Date; // Misma fecha
        }
    }
}