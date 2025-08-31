using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/subscription-plans")]
    public class SubscriptionPlansController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SubscriptionPlansController> _logger;

        public SubscriptionPlansController(
            ApplicationDbContext context,
            ILogger<SubscriptionPlansController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/subscription-plans
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans([FromQuery] bool? isActive = null)
        {
            try
            {
                var query = _context.SubscriptionPlans.AsQueryable();

                if (isActive.HasValue)
                {
                    query = query.Where(p => p.IsActive == isActive.Value);
                }

                var plans = await query
                    .OrderBy(p => p.DisplayOrder)
                    .ThenBy(p => p.Price)
                    .Select(p => new SubscriptionPlanDto
                    {
                        Code = p.Code,
                        Name = p.Name,
                        Description = p.Description,
                        Price = p.Price,
                        Currency = p.Currency,
                        MaxBookingsPerMonth = p.MaxBookingsPerMonth,
                        MaxServices = p.MaxServices,
                        MaxStaff = p.MaxStaff,
                        MaxCustomers = p.MaxCustomers,
                        AllowOnlinePayments = p.AllowOnlinePayments,
                        AllowCustomBranding = p.AllowCustomBranding,
                        AllowSmsNotifications = p.AllowSmsNotifications,
                        AllowEmailMarketing = p.AllowEmailMarketing,
                        AllowReports = p.AllowReports,
                        AllowMultiLocation = p.AllowMultiLocation,
                        AllowWhatsApp = p.AllowWhatsApp,
                        WhatsAppMonthlyLimit = p.WhatsAppMonthlyLimit,
                        WhatsAppExtraMessageCost = p.WhatsAppExtraMessageCost,
                        IsPopular = p.IsPopular,
                        TrialDays = p.TrialDays
                    })
                    .ToListAsync();

                return Ok(plans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription plans");
                return StatusCode(500, new { error = "Error al obtener planes" });
            }
        }

        // GET: api/subscription-plans/{code}
        [HttpGet("{code}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlan(string code)
        {
            try
            {
                var plan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Code == code);

                if (plan == null)
                {
                    return NotFound(new { error = "Plan no encontrado" });
                }

                return Ok(new SubscriptionPlanDto
                {
                    Code = plan.Code,
                    Name = plan.Name,
                    Description = plan.Description,
                    Price = plan.Price,
                    Currency = plan.Currency,
                    MaxBookingsPerMonth = plan.MaxBookingsPerMonth,
                    MaxServices = plan.MaxServices,
                    MaxStaff = plan.MaxStaff,
                    MaxCustomers = plan.MaxCustomers,
                    AllowOnlinePayments = plan.AllowOnlinePayments,
                    AllowCustomBranding = plan.AllowCustomBranding,
                    AllowSmsNotifications = plan.AllowSmsNotifications,
                    AllowEmailMarketing = plan.AllowEmailMarketing,
                    AllowReports = plan.AllowReports,
                    AllowMultiLocation = plan.AllowMultiLocation,
                    AllowWhatsApp = plan.AllowWhatsApp,
                    WhatsAppMonthlyLimit = plan.WhatsAppMonthlyLimit,
                    WhatsAppExtraMessageCost = plan.WhatsAppExtraMessageCost,
                    IsPopular = plan.IsPopular,
                    TrialDays = plan.TrialDays
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription plan {Code}", code);
                return StatusCode(500, new { error = "Error al obtener el plan" });
            }
        }

        // POST: api/subscription-plans
        [HttpPost]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> CreatePlan([FromBody] CreateSubscriptionPlanDto dto)
        {
            try
            {
                // Verificar si ya existe un plan con el mismo código
                var existingPlan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Code == dto.Code);

                if (existingPlan != null)
                {
                    return BadRequest(new { error = "Ya existe un plan con este código" });
                }

                var plan = new SubscriptionPlan
                {
                    Id = Guid.NewGuid(),
                    Code = dto.Code,
                    Name = dto.Name,
                    Description = dto.Description,
                    Price = dto.Price,
                    Currency = dto.Currency ?? "ARS",
                    MaxBookingsPerMonth = dto.MaxBookingsPerMonth,
                    MaxServices = dto.MaxServices,
                    MaxStaff = dto.MaxStaff,
                    MaxCustomers = dto.MaxCustomers,
                    AllowOnlinePayments = dto.AllowOnlinePayments,
                    AllowCustomBranding = dto.AllowCustomBranding,
                    AllowSmsNotifications = dto.AllowSmsNotifications,
                    AllowEmailMarketing = dto.AllowEmailMarketing,
                    AllowReports = dto.AllowReports,
                    AllowMultiLocation = dto.AllowMultiLocation,
                    AllowWhatsApp = dto.AllowWhatsApp,
                    WhatsAppMonthlyLimit = dto.WhatsAppMonthlyLimit,
                    WhatsAppExtraMessageCost = dto.WhatsAppExtraMessageCost,
                    IsPopular = dto.IsPopular,
                    IsActive = dto.IsActive,
                    TrialDays = dto.TrialDays,
                    DisplayOrder = dto.DisplayOrder ?? 0,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SubscriptionPlans.Add(plan);
                await _context.SaveChangesAsync();

                return Ok(new { id = plan.Id, message = "Plan creado exitosamente" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription plan");
                return StatusCode(500, new { error = "Error al crear el plan" });
            }
        }

        // PUT: api/subscription-plans/{code}
        [HttpPut("{code}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> UpdatePlan(string code, [FromBody] UpdateSubscriptionPlanDto dto)
        {
            try
            {
                var plan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Code == code);

                if (plan == null)
                {
                    return NotFound(new { error = "Plan no encontrado" });
                }

                // Si se está cambiando el código, verificar que no exista otro plan con el nuevo código
                if (dto.Code != code)
                {
                    var existingPlan = await _context.SubscriptionPlans
                        .FirstOrDefaultAsync(p => p.Code == dto.Code);

                    if (existingPlan != null)
                    {
                        return BadRequest(new { error = "Ya existe un plan con este código" });
                    }

                    plan.Code = dto.Code;
                }

                plan.Name = dto.Name;
                plan.Description = dto.Description;
                plan.Price = dto.Price;
                plan.Currency = dto.Currency ?? plan.Currency;
                plan.MaxBookingsPerMonth = dto.MaxBookingsPerMonth;
                plan.MaxServices = dto.MaxServices;
                plan.MaxStaff = dto.MaxStaff;
                plan.MaxCustomers = dto.MaxCustomers;
                plan.AllowOnlinePayments = dto.AllowOnlinePayments;
                plan.AllowCustomBranding = dto.AllowCustomBranding;
                plan.AllowSmsNotifications = dto.AllowSmsNotifications;
                plan.AllowEmailMarketing = dto.AllowEmailMarketing;
                plan.AllowReports = dto.AllowReports;
                plan.AllowMultiLocation = dto.AllowMultiLocation;
                plan.AllowWhatsApp = dto.AllowWhatsApp;
                plan.WhatsAppMonthlyLimit = dto.WhatsAppMonthlyLimit;
                plan.WhatsAppExtraMessageCost = dto.WhatsAppExtraMessageCost;
                plan.IsPopular = dto.IsPopular;
                plan.IsActive = dto.IsActive;
                plan.TrialDays = dto.TrialDays;
                plan.DisplayOrder = dto.DisplayOrder ?? plan.DisplayOrder;
                plan.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Plan actualizado exitosamente" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating subscription plan {Code}", code);
                return StatusCode(500, new { error = "Error al actualizar el plan" });
            }
        }

        // DELETE: api/subscription-plans/{code}
        [HttpDelete("{code}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeletePlan(string code)
        {
            try
            {
                var plan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Code == code);

                if (plan == null)
                {
                    return NotFound(new { error = "Plan no encontrado" });
                }

                // Verificar si hay suscripciones activas con este plan
                var activeSubscriptions = await _context.Subscriptions
                    .AnyAsync(s => s.PlanType == code && s.Status == "active");

                if (activeSubscriptions)
                {
                    return BadRequest(new { error = "No se puede eliminar un plan con suscripciones activas" });
                }

                _context.SubscriptionPlans.Remove(plan);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Plan eliminado exitosamente" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting subscription plan {Code}", code);
                return StatusCode(500, new { error = "Error al eliminar el plan" });
            }
        }

        // POST: api/subscription-plans/seed
        [HttpPost("seed")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> SeedDefaultPlans()
        {
            try
            {
                // Verificar si ya existen planes
                var existingPlans = await _context.SubscriptionPlans.AnyAsync();
                if (existingPlans)
                {
                    return BadRequest(new { error = "Ya existen planes en la base de datos" });
                }

                var plans = new List<SubscriptionPlan>
                {
                    new SubscriptionPlan
                    {
                        Id = Guid.NewGuid(),
                        Code = "basic",
                        Name = "Plan Básico",
                        Description = "Todo lo que necesitas para gestionar tu negocio",
                        Price = 15000,
                        Currency = "ARS",
                        MaxBookingsPerMonth = -1,
                        MaxServices = -1,
                        MaxStaff = -1,
                        MaxCustomers = -1,
                        AllowOnlinePayments = true,
                        AllowCustomBranding = true,
                        AllowSmsNotifications = true,
                        AllowEmailMarketing = true,
                        AllowReports = true,
                        AllowMultiLocation = true,
                        AllowWhatsApp = false,
                        WhatsAppMonthlyLimit = 0,
                        WhatsAppExtraMessageCost = 0,
                        IsPopular = false,
                        IsActive = true,
                        TrialDays = 0,
                        DisplayOrder = 1,
                        CreatedAt = DateTime.UtcNow
                    },
                    new SubscriptionPlan
                    {
                        Id = Guid.NewGuid(),
                        Code = "premium",
                        Name = "Plan Premium",
                        Description = "Incluye WhatsApp con 100 mensajes/mes",
                        Price = 20000,
                        Currency = "ARS",
                        MaxBookingsPerMonth = -1,
                        MaxServices = -1,
                        MaxStaff = -1,
                        MaxCustomers = -1,
                        AllowOnlinePayments = true,
                        AllowCustomBranding = true,
                        AllowSmsNotifications = true,
                        AllowEmailMarketing = true,
                        AllowReports = true,
                        AllowMultiLocation = true,
                        AllowWhatsApp = true,
                        WhatsAppMonthlyLimit = 100,
                        WhatsAppExtraMessageCost = 50,
                        IsPopular = true,
                        IsActive = true,
                        TrialDays = 0,
                        DisplayOrder = 2,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                _context.SubscriptionPlans.AddRange(plans);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Planes por defecto creados exitosamente", count = plans.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding default subscription plans");
                return StatusCode(500, new { error = "Error al crear planes por defecto" });
            }
        }
    }

    public class CreateSubscriptionPlanDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string? Currency { get; set; }
        public int MaxBookingsPerMonth { get; set; } = -1;
        public int MaxServices { get; set; } = -1;
        public int MaxStaff { get; set; } = -1;
        public int MaxCustomers { get; set; } = -1;
        public bool AllowOnlinePayments { get; set; } = true;
        public bool AllowCustomBranding { get; set; } = true;
        public bool AllowSmsNotifications { get; set; } = true;
        public bool AllowEmailMarketing { get; set; } = true;
        public bool AllowReports { get; set; } = true;
        public bool AllowMultiLocation { get; set; } = true;
        public bool AllowWhatsApp { get; set; } = false;
        public int WhatsAppMonthlyLimit { get; set; } = 0;
        public decimal WhatsAppExtraMessageCost { get; set; } = 0;
        public bool IsPopular { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public int TrialDays { get; set; } = 0;
        public int? DisplayOrder { get; set; }
    }

    public class UpdateSubscriptionPlanDto : CreateSubscriptionPlanDto
    {
    }
}