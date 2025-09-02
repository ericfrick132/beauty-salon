using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Common;
using System.Security.Cryptography;
using System.Text;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Services
{
    public interface ITenantProvisioningService
    {
        Task<bool> ProvisionNewTenantAsync(Guid tenantId);
        Task<Models.Common.ServiceResult<string>> CreateTenantAsync(Models.DTOs.CreateTenantDto dto);
    }

    public class TenantProvisioningService : ITenantProvisioningService
    {
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TenantProvisioningService> _logger;
        private readonly ISubscriptionService _subscriptionService;

        public TenantProvisioningService(
            IConfiguration configuration,
            ApplicationDbContext context,
            ILogger<TenantProvisioningService> logger,
            ISubscriptionService subscriptionService)
        {
            _configuration = configuration;
            _context = context;
            _logger = logger;
            _subscriptionService = subscriptionService;
        }

        public async Task<bool> ProvisionNewTenantAsync(Guid tenantId)
        {
            try
            {
                var tenant = await _context.Tenants
                    .Include(t => t.Vertical)
                    .FirstOrDefaultAsync(t => t.Id == tenantId);
                
                if (tenant == null) return false;

                var verticalCode = tenant.Vertical.Code;

                // Obtener categorías y servicios según el vertical
                List<ServiceCategory> categories = verticalCode switch
                {
                    "barbershop" => GetBarbershopCategories(tenantId),
                    "peluqueria" => GetBeautySalonCategories(tenantId), // Usa los mismos servicios que beautysalon
                    "aesthetics" => GetAestheticsCategories(tenantId),
                    _ => new List<ServiceCategory>()
                };

                // Obtener profesionales según el vertical
                List<Employee> professionals = verticalCode switch
                {
                    "barbershop" => GetBarbershopProfessionals(tenantId),
                    "peluqueria" => GetBeautySalonProfessionals(tenantId), // Usa los mismos profesionales que beautysalon
                    "aesthetics" => GetAestheticsProfessionals(tenantId),
                    _ => new List<Employee>()
                };

                // Agregar categorías y servicios
                foreach (var category in categories)
                {
                    _context.ServiceCategories.Add(category);
                    _context.Services.AddRange(category.Services);
                }
                _context.Employees.AddRange(professionals);

                // Agregar algunos clientes de ejemplo
                var sampleCustomers = GetSampleCustomers(tenantId);
                _context.Customers.AddRange(sampleCustomers);

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Tenant {tenantId} provisioned successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error provisioning tenant {tenantId}");
                return false;
            }
        }

        public async Task<ServiceResult<string>> CreateTenantAsync(CreateTenantDto dto)
        {
            try
            {
                // 1. Buscar el vertical
                var vertical = await _context.Verticals
                    .FirstOrDefaultAsync(v => v.Code == dto.VerticalCode);
                
                if (vertical == null)
                {
                    return ServiceResult<string>.Fail("Vertical no encontrado");
                }

                // 2. Crear tenant
                var tenantId = Guid.NewGuid();
                
                var tenant = new Tenant
                {
                    Id = tenantId,
                    VerticalId = vertical.Id,
                    PlanId = dto.PlanId,
                    Subdomain = dto.Subdomain,
                    BusinessName = dto.BusinessName,
                    BusinessAddress = dto.BusinessAddress,
                    SchemaName = $"tenant_{dto.Subdomain}", // Ya no se usa pero lo mantenemos por compatibilidad
                    OwnerEmail = dto.AdminEmail,
                    TimeZone = dto.TimeZone ?? "UTC",
                    Currency = dto.Currency ?? "USD",
                    Language = dto.Language ?? "en",
                    IsDemo = dto.IsDemo,
                    DemoDays = dto.DemoDays,
                    DemoExpiresAt = dto.IsDemo ? DateTime.UtcNow.AddDays(dto.DemoDays ?? 7) : null,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // 3. Crear el usuario admin
                var hashedPassword = HashPassword(dto.AdminPassword);
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = dto.AdminEmail,
                    FirstName = dto.AdminFirstName,
                    LastName = dto.AdminLastName,
                    Phone = dto.AdminPhone,
                    PasswordHash = hashedPassword,
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                // 4. Crear suscripción demo si es necesario
                if (dto.IsDemo)
                {
                    var subscriptionResult = await _subscriptionService.CreateTrialSubscriptionAsync(tenant.Id);
                    if (!subscriptionResult.Success)
                    {
                        _logger.LogWarning($"Could not create demo subscription for tenant {tenant.Id}: {subscriptionResult.Message}");
                    }
                    else
                    {
                        _logger.LogInformation($"Demo subscription created for tenant {tenant.Id}");
                    }
                }

                // 5. Provisionar datos iniciales del tenant
                var provisionSuccess = await ProvisionNewTenantAsync(tenant.Id);
                if (!provisionSuccess)
                {
                    _logger.LogWarning($"Could not provision initial data for tenant {tenant.Id}");
                }

                // 6. Generar URL del tenant
                var baseUrl = _configuration["FrontendUrl"] ?? "https://www.turnos-pro.com";
                var tenantUrl = $"https://{dto.Subdomain}.{dto.VerticalCode}.com";
                
                _logger.LogInformation($"Tenant {tenant.Id} created successfully with URL {tenantUrl}");
                return ServiceResult<string>.Ok(tenantUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating tenant");
                return ServiceResult<string>.Fail($"Error creando tenant: {ex.Message}");
            }
        }

        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "BookingProSalt2024"));
            return Convert.ToBase64String(hashedBytes);
        }

        private List<ServiceCategory> GetBarbershopCategories(Guid tenantId)
        {
            var categories = VerticalSeeders.BarbershopSeeder.GetCategories();
            var result = new List<ServiceCategory>();

            foreach (var cat in categories)
            {
                var category = new ServiceCategory
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = cat.Name,
                    Description = cat.Description,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    Services = new List<Service>()
                };

                foreach (var svc in cat.Services)
                {
                    category.Services.Add(new Service
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        CategoryId = category.Id,
                        Name = svc.Name,
                        Description = svc.Description,
                        DurationMinutes = svc.DurationMinutes,
                        Price = svc.Price,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                result.Add(category);
            }

            return result;
        }

        private List<ServiceCategory> GetBeautySalonCategories(Guid tenantId)
        {
            var categories = VerticalSeeders.BeautySalonSeeder.GetCategories();
            var result = new List<ServiceCategory>();

            foreach (var cat in categories)
            {
                var category = new ServiceCategory
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = cat.Name,
                    Description = cat.Description,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    Services = new List<Service>()
                };

                foreach (var svc in cat.Services)
                {
                    category.Services.Add(new Service
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        CategoryId = category.Id,
                        Name = svc.Name,
                        Description = svc.Description,
                        DurationMinutes = svc.DurationMinutes,
                        Price = svc.Price,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                result.Add(category);
            }

            return result;
        }

        private List<ServiceCategory> GetAestheticsCategories(Guid tenantId)
        {
            var categories = VerticalSeeders.AestheticsSeeder.GetCategories();
            var result = new List<ServiceCategory>();

            foreach (var cat in categories)
            {
                var category = new ServiceCategory
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = cat.Name,
                    Description = cat.Description,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    Services = new List<Service>()
                };

                foreach (var svc in cat.Services)
                {
                    category.Services.Add(new Service
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        CategoryId = category.Id,
                        Name = svc.Name,
                        Description = svc.Description,
                        DurationMinutes = svc.DurationMinutes,
                        Price = svc.Price,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                result.Add(category);
            }

            return result;
        }

        private List<Employee> GetBarbershopProfessionals(Guid tenantId)
        {
            var professionals = VerticalSeeders.GetBarbershopProfessionals();
            return professionals.Select(p => new Employee
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = p.Name,
                Email = p.Email,
                Phone = p.Phone,
                Specialties = JsonSerializer.Serialize(p.Specialties),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private List<Employee> GetBeautySalonProfessionals(Guid tenantId)
        {
            var professionals = VerticalSeeders.GetBeautySalonProfessionals();
            return professionals.Select(p => new Employee
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = p.Name,
                Email = p.Email,
                Phone = p.Phone,
                Specialties = JsonSerializer.Serialize(p.Specialties),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private List<Employee> GetAestheticsProfessionals(Guid tenantId)
        {
            var professionals = VerticalSeeders.GetAestheticsProfessionals();
            return professionals.Select(p => new Employee
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = p.Name,
                Email = p.Email,
                Phone = p.Phone,
                Specialties = JsonSerializer.Serialize(p.Specialties),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }

        private List<Customer> GetSampleCustomers(Guid tenantId)
        {
            var customers = new[]
            {
                new { FirstName = "Juan", LastName = "Pérez", Email = "juan.perez@email.com", Phone = "1122334455", Dni = "30123456" },
                new { FirstName = "María", LastName = "González", Email = "maria.gonzalez@email.com", Phone = "1122334456", Dni = "31234567" },
                new { FirstName = "Carlos", LastName = "López", Email = "carlos.lopez@email.com", Phone = "1122334457", Dni = "32345678" },
                new { FirstName = "Ana", LastName = "Martínez", Email = "ana.martinez@email.com", Phone = "1122334458", Dni = "33456789" },
                new { FirstName = "Luis", LastName = "Rodríguez", Email = "luis.rodriguez@email.com", Phone = "1122334459", Dni = "34567890" }
            };

            return customers.Select(c => new Customer
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Email = c.Email,
                Phone = c.Phone,
                Dni = c.Dni,
                CreatedAt = DateTime.UtcNow
            }).ToList();
        }
    }
}