using BookingPro.API.Data;
using BookingPro.API.Models;
using BookingPro.API.Models.Enums;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BookingPro.API.Services
{
    public class TenantService : ITenantService
    {
        private readonly ApplicationDbContext _context;
        private TenantInfo? _currentTenant;

        public TenantService(ApplicationDbContext context)
        {
            _context = context;
        }

        public string GetCurrentTenantId()
        {
            return _currentTenant?.Id.ToString() ?? throw new InvalidOperationException("No tenant context set");
        }

        public Guid GetCurrentTenantIdFromContext()
        {
            return _currentTenant?.Id ?? Guid.Empty;
        }

        public Task<TenantInfo> GetCurrentConfigAsync()
        {
            return Task.FromResult(_currentTenant ?? throw new InvalidOperationException("No tenant context set"));
        }

        public string GetSchemaName()
        {
            return _currentTenant?.SchemaName ?? throw new InvalidOperationException("No tenant context set");
        }

        public TenantInfo? GetCurrentTenant()
        {
            return _currentTenant;
        }

        public void SetCurrentTenant(TenantInfo tenant)
        {
            _currentTenant = tenant;
        }

        public async Task<TenantInfo?> GetTenantBySubdomain(string subdomain, string domain)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Vertical)
                .FirstOrDefaultAsync(t => 
                    t.Subdomain == subdomain && 
                    t.Vertical.Domain == domain &&
                    (t.Status == TenantStatus.Active.ToString().ToLower() || t.Status == TenantStatus.Trial.ToString().ToLower()));

            if (tenant == null) return null;

            return new TenantInfo
            {
                Id = tenant.Id,
                Subdomain = tenant.Subdomain,
                BusinessName = tenant.BusinessName,
                VerticalCode = tenant.Vertical.Code,
                SchemaName = tenant.SchemaName,
                Domain = domain,
                TimeZone = tenant.TimeZone ?? "-3",
                Theme = System.Text.Json.JsonSerializer.Deserialize<TenantTheme>(tenant.Vertical.DefaultTheme) ?? new TenantTheme(),
                Features = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(tenant.Vertical.Features) ?? new(),
                Terminology = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(tenant.Vertical.Terminology) ?? new()
            };
        }

        public async Task<TenantInfo?> GetTenantByCustomDomain(string hostname)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Vertical)
                .FirstOrDefaultAsync(t => 
                    t.CustomDomain == hostname &&
                    (t.Status == TenantStatus.Active.ToString().ToLower() || t.Status == TenantStatus.Trial.ToString().ToLower()));

            if (tenant == null) return null;

            return new TenantInfo
            {
                Id = tenant.Id,
                Subdomain = tenant.Subdomain,
                BusinessName = tenant.BusinessName,
                VerticalCode = tenant.Vertical.Code,
                SchemaName = tenant.SchemaName,
                Domain = hostname,
                TimeZone = tenant.TimeZone ?? "-3",
                Theme = System.Text.Json.JsonSerializer.Deserialize<TenantTheme>(tenant.Vertical.DefaultTheme) ?? new TenantTheme(),
                Features = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(tenant.Vertical.Features) ?? new(),
                Terminology = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(tenant.Vertical.Terminology) ?? new()
            };
        }

        public async Task<TenantInfo?> GetTenantBySubdomainOnly(string subdomain)
        {
            // Para desarrollo local, buscar tenant solo por subdomain
            var tenant = await _context.Tenants
                .Include(t => t.Vertical)
                .FirstOrDefaultAsync(t => 
                    t.Subdomain == subdomain &&
                    (t.Status == TenantStatus.Active.ToString().ToLower() || t.Status == TenantStatus.Trial.ToString().ToLower()));

            if (tenant == null) return null;

            return new TenantInfo
            {
                Id = tenant.Id,
                Subdomain = tenant.Subdomain,
                BusinessName = tenant.BusinessName,
                VerticalCode = tenant.Vertical.Code,
                SchemaName = tenant.SchemaName,
                Domain = tenant.Vertical.Domain,
                TimeZone = tenant.TimeZone ?? "-3",
                Theme = System.Text.Json.JsonSerializer.Deserialize<TenantTheme>(tenant.Vertical.DefaultTheme) ?? new TenantTheme(),
                Features = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(tenant.Vertical.Features) ?? new(),
                Terminology = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(tenant.Vertical.Terminology) ?? new()
            };
        }

        public async Task<bool> UpdateTimezoneAsync(string timezone)
        {
            try
            {
                if (_currentTenant == null)
                    return false;

                var tenant = await _context.Tenants.FindAsync(_currentTenant.Id);
                if (tenant == null)
                    return false;

                tenant.TimeZone = timezone;
                tenant.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
                
                // Update current tenant info
                _currentTenant.TimeZone = timezone;
                
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<ServiceResult<TenantCreationResult>> CreateSelfRegisteredTenantAsync(CreateTenantDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Get vertical
                var vertical = await _context.Verticals
                    .FirstOrDefaultAsync(v => v.Code == dto.VerticalCode);
                
                if (vertical == null)
                {
                    return ServiceResult<TenantCreationResult>.Fail("Vertical not found");
                }

                // Create tenant
                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    VerticalId = vertical.Id,
                    Subdomain = dto.Subdomain,
                    BusinessName = dto.BusinessName,
                    BusinessAddress = dto.BusinessAddress,
                    OwnerEmail = dto.AdminEmail, // Fix: Set the owner email
                    OwnerPhone = dto.AdminPhone, // Fix: Set the owner phone
                    SchemaName = GenerateSchemaName(dto.Subdomain),
                    TimeZone = dto.TimeZone ?? "America/Argentina/Buenos_Aires",
                    Currency = dto.Currency ?? "ARS",
                    Language = dto.Language ?? "es",
                    Status = dto.IsDemo ? TenantStatus.Trial.ToString().ToLower() : TenantStatus.Active.ToString().ToLower(),
                    TrialEndsAt = dto.IsDemo ? DateTime.UtcNow.AddDays(dto.DemoDays ?? 7) : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                // Create admin user
                var user = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = dto.AdminEmail,
                    FirstName = dto.AdminFirstName,
                    LastName = dto.AdminLastName,
                    Phone = dto.AdminPhone,
                    PasswordHash = Services.Security.PasswordHasher.Hash(dto.AdminPassword),
                    Role = "admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    LastLogin = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Create subscription for demo
                if (dto.IsDemo)
                {
                    var trialDays = dto.DemoDays ?? 7;
                    var subscription = new Subscription
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenant.Id,
                        PlanType = "demo",
                        MonthlyAmount = 0,
                        Status = "trial",
                        IsTrialPeriod = true,
                        TrialEndsAt = DateTime.UtcNow.AddDays(trialDays),
                        // NextPaymentDate is NOT used for trial; use TrialEndsAt instead
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Subscriptions.Add(subscription);
                    await _context.SaveChangesAsync();
                }

                // Initialize tenant data (services, categories, etc.)
                await InitializeTenantData(tenant.Id, vertical.Code);

                await transaction.CommitAsync();

                // Build tenant URL (always use production domain; controllers may override for localhost)
                var tenantUrl = $"https://{tenant.Subdomain}.turnos-pro.com";

                var result = new TenantCreationResult
                {
                    Id = tenant.Id,
                    Subdomain = tenant.Subdomain,
                    BusinessName = tenant.BusinessName,
                    TenantUrl = tenantUrl,
                    IsDemo = dto.IsDemo,
                    DemoDays = dto.DemoDays ?? 7
                };

                return ServiceResult<TenantCreationResult>.Ok(result, "Tenant created successfully");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return ServiceResult<TenantCreationResult>.Fail($"Error creating tenant: {ex.Message}");
            }
        }

        private string GenerateSchemaName(string subdomain)
        {
            return $"tenant_{subdomain.Replace("-", "_")}";
        }

        // Password hashing centralized in Services.Security.PasswordHasher

        private async Task InitializeTenantData(Guid tenantId, string verticalCode)
        {
            // Set current tenant context for seeding
            var tempTenant = new TenantInfo 
            { 
                Id = tenantId, 
                VerticalCode = verticalCode 
            };
            
            var previousTenant = _currentTenant;
            SetCurrentTenant(tempTenant);

            try
            {
                // Initialize basic data based on vertical
                // This would call the seeding logic for the specific vertical
                // For now, we'll add basic service categories

                if (verticalCode == "barbershop")
                {
                    await SeedBarbershopData(tenantId);
                }
                else if (verticalCode == "salon")
                {
                    await SeedSalonData(tenantId);
                }
                // Add more verticals as needed

                await _context.SaveChangesAsync();
            }
            finally
            {
                // Restore previous tenant context
                if (previousTenant != null)
                    SetCurrentTenant(previousTenant);
            }
        }

        private async Task SeedBarbershopData(Guid tenantId)
        {
            // Add default service categories and services for barbershop
            var cortesCategory = new Models.Entities.ServiceCategory
            {
                TenantId = tenantId,
                Name = "Cortes",
                Description = "Servicios de corte de cabello",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.ServiceCategories.Add(cortesCategory);
            await _context.SaveChangesAsync();

            // Add default services
            var services = new[]
            {
                new Service { TenantId = tenantId, CategoryId = cortesCategory.Id, Name = "Corte Clásico", Description = "Corte tradicional", DurationMinutes = 30, Price = 15000, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Service { TenantId = tenantId, CategoryId = cortesCategory.Id, Name = "Corte + Barba", Description = "Corte y arreglo de barba", DurationMinutes = 45, Price = 20000, IsActive = true, CreatedAt = DateTime.UtcNow }
            };

            _context.Services.AddRange(services);
        }

        private async Task SeedSalonData(Guid tenantId)
        {
            // Add default service categories and services for salon
            var corteCategory = new Models.Entities.ServiceCategory
            {
                TenantId = tenantId,
                Name = "Cortes",
                Description = "Servicios de corte de cabello",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.ServiceCategories.Add(corteCategory);
            await _context.SaveChangesAsync();

            var services = new[]
            {
                new Service { TenantId = tenantId, CategoryId = corteCategory.Id, Name = "Corte Dama", Description = "Corte para damas", DurationMinutes = 45, Price = 18000, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Service { TenantId = tenantId, CategoryId = corteCategory.Id, Name = "Lavado y Peinado", Description = "Lavado y peinado completo", DurationMinutes = 60, Price = 25000, IsActive = true, CreatedAt = DateTime.UtcNow }
            };

            _context.Services.AddRange(services);
        }
    }
}
