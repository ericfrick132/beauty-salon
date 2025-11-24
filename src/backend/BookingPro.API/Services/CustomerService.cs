using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Common;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly IRepository<Customer> _customerRepository;
        private readonly IRepository<Booking> _bookingRepository;

        public CustomerService(
            IRepository<Customer> customerRepository,
            IRepository<Booking> bookingRepository)
        {
            _customerRepository = customerRepository;
            _bookingRepository = bookingRepository;
        }

        public async Task<ServiceResult<IEnumerable<CustomerListDto>>> GetCustomersAsync()
        {
            try
            {
                var customers = await _customerRepository.Query(c => c.Bookings)
                    .Where(c => c.Notes == null || !c.Notes.StartsWith("[DELETED"))
                    .Select(c => new CustomerListDto
                    {
                        Id = c.Id,
                        FirstName = c.FirstName,
                        LastName = c.LastName,
                        Email = c.Email,
                        Phone = c.Phone,
                        Dni = c.Dni,
                        BirthDate = c.BirthDate,
                        BookingCount = c.Bookings.Count(),
                        LastBooking = c.Bookings
                            .OrderByDescending(b => b.StartTime)
                            .Select(b => b.StartTime)
                            .FirstOrDefault()
                    })
                    .ToListAsync();

                return ServiceResult<IEnumerable<CustomerListDto>>.Ok(customers);
            }
            catch (Exception ex)
            {
                return ServiceResult<IEnumerable<CustomerListDto>>.Fail($"Error retrieving customers: {ex.Message}");
            }
        }

        public async Task<ServiceResult<CustomerDetailDto>> GetCustomerByIdAsync(Guid id)
        {
            try
            {
                var customer = await _customerRepository.Query(c => c.Bookings)
                    .Where(c => c.Id == id && (c.Notes == null || !c.Notes.StartsWith("[DELETED")))
                    .Select(c => new CustomerDetailDto
                    {
                        Id = c.Id,
                        FirstName = c.FirstName,
                        LastName = c.LastName,
                        Email = c.Email,
                        Phone = c.Phone,
                        Dni = c.Dni,
                        BirthDate = c.BirthDate,
                        Notes = c.Notes,
                        Tags = c.Tags,
                        CreatedAt = c.CreatedAt,
                        Bookings = c.Bookings.Select(b => new BookingSummaryDto
                        {
                            Id = b.Id,
                            StartTime = b.StartTime,
                            EndTime = b.EndTime,
                            Status = b.Status,
                            Service = new ServiceSummaryDto
                            {
                                Id = b.Service.Id,
                                Name = b.Service.Name,
                                Price = b.Service.Price,
                                DurationMinutes = b.Service.DurationMinutes
                            },
                            Employee = new EmployeeSummaryDto
                            {
                                Id = b.Employee.Id,
                                Name = b.Employee.Name
                            }
                        }).OrderByDescending(b => b.StartTime).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (customer == null)
                {
                    return ServiceResult<CustomerDetailDto>.NotFound("Customer not found");
                }

                return ServiceResult<CustomerDetailDto>.Ok(customer);
            }
            catch (Exception ex)
            {
                return ServiceResult<CustomerDetailDto>.Fail($"Error retrieving customer: {ex.Message}");
            }
        }

        public async Task<ServiceResult<Customer>> CreateCustomerAsync(CreateCustomerDto dto)
        {
            try
            {
                // Validar duplicados por email/teléfono
                var validationResult = await ValidateCustomerUniqueness(dto.Email, dto.Phone);
                if (!validationResult.Success)
                    return ServiceResult<Customer>.Fail(validationResult.Message!);

                var customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    Dni = dto.Dni,
                    BirthDate = dto.BirthDate,
                    Notes = dto.Notes,
                    Tags = dto.Tags,
                    CreatedAt = DateTime.UtcNow
                };

                var createdCustomer = await _customerRepository.AddAsync(customer);
                return ServiceResult<Customer>.Ok(createdCustomer, "Customer created successfully");
            }
            catch (Exception ex)
            {
                return ServiceResult<Customer>.Fail($"Error creating customer: {ex.Message}");
            }
        }

        public async Task<ServiceResult<Customer>> UpdateCustomerAsync(Guid id, UpdateCustomerDto dto)
        {
            try
            {
                var customer = await _customerRepository.GetByIdAsync(id);
                if (customer == null)
                    return ServiceResult<Customer>.NotFound("Customer not found");

                // Validar duplicados por email/teléfono (excluyendo el cliente actual)
                if (!string.IsNullOrEmpty(dto.Email) || !string.IsNullOrEmpty(dto.Phone))
                {
                    var validationResult = await ValidateCustomerUniqueness(dto.Email, dto.Phone, id);
                    if (!validationResult.Success)
                        return ServiceResult<Customer>.Fail(validationResult.Message!);
                }

                // Aplicar cambios
                if (!string.IsNullOrEmpty(dto.FirstName))
                    customer.FirstName = dto.FirstName;
                if (dto.LastName != null)
                    customer.LastName = dto.LastName;
                if (dto.Email != null)
                    customer.Email = dto.Email;
                if (!string.IsNullOrEmpty(dto.Phone))
                    customer.Phone = dto.Phone;
                if (dto.Dni != null)
                    customer.Dni = dto.Dni;
                if (dto.BirthDate.HasValue)
                    customer.BirthDate = dto.BirthDate;
                if (dto.Notes != null)
                    customer.Notes = dto.Notes;
                if (dto.Tags != null)
                    customer.Tags = dto.Tags;

                var updatedCustomer = await _customerRepository.UpdateAsync(customer);
                return ServiceResult<Customer>.Ok(updatedCustomer, "Customer updated successfully");
            }
            catch (Exception ex)
            {
                return ServiceResult<Customer>.Fail($"Error updating customer: {ex.Message}");
            }
        }

        public async Task<ServiceResult> DeleteCustomerAsync(Guid id)
        {
            try
            {
                var customer = await _customerRepository.GetByIdAsync(id);
                if (customer == null)
                    return ServiceResult.Fail("Customer not found");

                // Verificar si el cliente tiene citas futuras
                var hasFutureBookings = await _bookingRepository.Query()
                    .Where(b => b.CustomerId == id && 
                               b.StartTime > DateTime.UtcNow && 
                               b.Status != "cancelled")
                    .AnyAsync();

                if (hasFutureBookings)
                {
                    return ServiceResult.Fail("Cannot delete customer with future bookings. Cancel bookings first.");
                }

                // Soft delete - marcar como eliminado en Notes
                var deletionMarker = $"[DELETED {DateTime.UtcNow:yyyy-MM-dd}]";
                customer.Notes = customer.Notes == null ? deletionMarker : $"{deletionMarker} {customer.Notes}";
                // Liberar email/teléfono para permitir volver a registrar al cliente si es necesario
                customer.Email = null;
                customer.Phone = null;
                customer.Dni = null;
                await _customerRepository.UpdateAsync(customer);

                return ServiceResult.Ok("Customer marked as deleted successfully");
            }
            catch (Exception ex)
            {
                return ServiceResult.Fail($"Error deleting customer: {ex.Message}");
            }
        }

        public async Task<ServiceResult<IEnumerable<CustomerSearchDto>>> SearchCustomersAsync(string searchTerm)
        {
            try
            {
                var query = _customerRepository.Query();

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    query = query.Where(c => 
                        (c.Notes == null || !c.Notes.StartsWith("[DELETED")) &&
                        (c.FirstName.Contains(searchTerm) ||
                        c.LastName != null && c.LastName.Contains(searchTerm) ||
                        c.Phone != null && c.Phone.Contains(searchTerm) ||
                        c.Email != null && c.Email.Contains(searchTerm) ||
                        c.Dni != null && c.Dni.Contains(searchTerm)));
                }
                else
                {
                    query = query.Where(c => c.Notes == null || !c.Notes.StartsWith("[DELETED"));
                }

                var customers = await query
                    .Select(c => new CustomerSearchDto
                    {
                        Id = c.Id,
                        FirstName = c.FirstName,
                        LastName = c.LastName,
                        Email = c.Email,
                        Phone = c.Phone,
                        Dni = c.Dni,
                        FullName = $"{c.FirstName} {c.LastName}".Trim()
                    })
                    .OrderBy(c => c.FirstName)
                    .ToListAsync();

                return ServiceResult<IEnumerable<CustomerSearchDto>>.Ok(customers);
            }
            catch (Exception ex)
            {
                return ServiceResult<IEnumerable<CustomerSearchDto>>.Fail($"Error searching customers: {ex.Message}");
            }
        }

        private async Task<ServiceResult> ValidateCustomerUniqueness(string? email, string? phone, Guid? excludeCustomerId = null)
        {
            var query = _customerRepository.Query()
                .Where(c => c.Notes == null || !c.Notes.StartsWith("[DELETED"));

            if (excludeCustomerId.HasValue)
            {
                query = query.Where(c => c.Id != excludeCustomerId.Value);
            }

            // Verificar email único
            if (!string.IsNullOrEmpty(email))
            {
                var emailExists = await query.AnyAsync(c => c.Email == email);
                if (emailExists)
                    return ServiceResult.Fail("A customer with this email already exists");
            }

            // Verificar teléfono único
            if (!string.IsNullOrEmpty(phone))
            {
                var phoneExists = await query.AnyAsync(c => c.Phone == phone);
                if (phoneExists)
                    return ServiceResult.Fail("A customer with this phone number already exists");
            }

            return ServiceResult.Ok();
        }
    }
}
