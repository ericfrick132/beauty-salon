using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using BC = BCrypt.Net.BCrypt;
using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Common;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;

namespace BookingPro.API.Services
{
    public class InvitationService : IInvitationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantProvisioningService _tenantProvisioningService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<InvitationService> _logger;

        public InvitationService(
            ApplicationDbContext context,
            ITenantProvisioningService tenantProvisioningService,
            IConfiguration configuration,
            ILogger<InvitationService> logger)
        {
            _context = context;
            _tenantProvisioningService = tenantProvisioningService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<ServiceResult<InvitationResponseDto>> CreateInvitationAsync(CreateInvitationDto dto)
        {
            try
            {
                // Validar que el vertical existe
                var vertical = await _context.Verticals
                    .FirstOrDefaultAsync(v => v.Code == dto.VerticalCode);
                
                if (vertical == null)
                {
                    return ServiceResult<InvitationResponseDto>.Fail("Vertical no encontrado");
                }

                // Validar plan si se especifica
                Plan? plan = null;
                if (!string.IsNullOrEmpty(dto.PlanCode))
                {
                    plan = await _context.Plans
                        .FirstOrDefaultAsync(p => p.Code == dto.PlanCode && p.VerticalId == vertical.Id);
                    
                    if (plan == null)
                    {
                        return ServiceResult<InvitationResponseDto>.Fail("Plan no encontrado");
                    }
                }

                // Validar que no existe un tenant con ese subdominio
                var existingTenant = await _context.Tenants
                    .FirstOrDefaultAsync(t => t.Subdomain == dto.Subdomain && t.VerticalId == vertical.Id);
                
                if (existingTenant != null)
                {
                    return ServiceResult<InvitationResponseDto>.Fail("Ya existe un negocio con ese subdominio");
                }

                // Validar que no existe una invitación pendiente con ese subdominio
                var existingInvitation = await _context.Invitations
                    .FirstOrDefaultAsync(i => i.Subdomain == dto.Subdomain && 
                                            i.VerticalId == vertical.Id && 
                                            i.Status == "pending" && 
                                            i.ExpiresAt > DateTime.UtcNow);
                
                if (existingInvitation != null)
                {
                    return ServiceResult<InvitationResponseDto>.Fail("Ya existe una invitación pendiente para ese subdominio");
                }

                // Crear token único
                var token = GenerateSecureToken();
                
                // Crear invitación
                var invitation = new Invitation
                {
                    VerticalId = vertical.Id,
                    PlanId = plan?.Id,
                    Token = token,
                    Subdomain = dto.Subdomain,
                    BusinessName = dto.BusinessName,
                    BusinessAddress = dto.BusinessAddress,
                    AdminEmail = dto.AdminEmail,
                    AdminPhone = dto.AdminPhone,
                    TimeZone = dto.TimeZone ?? "UTC",
                    Currency = dto.Currency ?? "USD",
                    Language = dto.Language ?? "en",
                    Notes = dto.Notes,
                    IsDemo = dto.IsDemo,
                    DemoDays = dto.DemoDays,
                    ExpiresAt = DateTime.UtcNow.AddDays(dto.ExpiresInDays),
                    Status = "pending"
                };

                _context.Invitations.Add(invitation);
                await _context.SaveChangesAsync();

                // Generar URL de invitación
                var baseUrl = _configuration["FrontendUrl"] ?? "http://localhost:3000";
                var invitationUrl = $"{baseUrl}/invitation/{token}";

                var response = new InvitationResponseDto
                {
                    Id = invitation.Id,
                    Token = invitation.Token,
                    Subdomain = invitation.Subdomain,
                    BusinessName = invitation.BusinessName,
                    BusinessAddress = invitation.BusinessAddress,
                    AdminEmail = invitation.AdminEmail,
                    AdminPhone = invitation.AdminPhone,
                    TimeZone = invitation.TimeZone,
                    Currency = invitation.Currency,
                    Language = invitation.Language,
                    Notes = invitation.Notes,
                    IsDemo = invitation.IsDemo,
                    DemoDays = invitation.DemoDays,
                    Status = invitation.Status,
                    ExpiresAt = invitation.ExpiresAt,
                    CreatedAt = invitation.CreatedAt,
                    VerticalName = vertical.Name,
                    PlanName = plan?.Name,
                    InvitationUrl = invitationUrl
                };

                return ServiceResult<InvitationResponseDto>.Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating invitation");
                return ServiceResult<InvitationResponseDto>.Fail("Error interno del servidor");
            }
        }

        public async Task<ServiceResult<InvitationDetailsDto>> GetInvitationByTokenAsync(string token)
        {
            try
            {
                var invitation = await _context.Invitations
                    .Include(i => i.Vertical)
                    .Include(i => i.Plan)
                    .FirstOrDefaultAsync(i => i.Token == token);

                if (invitation == null)
                {
                    return ServiceResult<InvitationDetailsDto>.Fail("Invitación no encontrada");
                }

                if (invitation.Status != "pending")
                {
                    return ServiceResult<InvitationDetailsDto>.Fail("La invitación ya ha sido utilizada o cancelada");
                }

                if (invitation.ExpiresAt <= DateTime.UtcNow)
                {
                    invitation.Status = "expired";
                    await _context.SaveChangesAsync();
                    return ServiceResult<InvitationDetailsDto>.Fail("La invitación ha expirado");
                }

                var response = new InvitationDetailsDto
                {
                    Id = invitation.Id,
                    BusinessName = invitation.BusinessName,
                    BusinessAddress = invitation.BusinessAddress,
                    Subdomain = invitation.Subdomain,
                    AdminEmail = invitation.AdminEmail,
                    AdminPhone = invitation.AdminPhone,
                    TimeZone = invitation.TimeZone,
                    Currency = invitation.Currency,
                    Language = invitation.Language,
                    IsDemo = invitation.IsDemo,
                    DemoDays = invitation.DemoDays,
                    Status = invitation.Status,
                    ExpiresAt = invitation.ExpiresAt,
                    VerticalName = invitation.Vertical.Name,
                    VerticalCode = invitation.Vertical.Code,
                    VerticalDomain = invitation.Vertical.Domain,
                    PlanName = invitation.Plan?.Name,
                    PlanPrice = invitation.Plan?.PriceMonthly,
                    PlanFeatures = invitation.Plan?.Features
                };

                return ServiceResult<InvitationDetailsDto>.Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invitation by token {Token}", token);
                return ServiceResult<InvitationDetailsDto>.Fail("Error interno del servidor");
            }
        }

        public async Task<ServiceResult<string>> AcceptInvitationAsync(AcceptInvitationDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var invitation = await _context.Invitations
                    .Include(i => i.Vertical)
                    .Include(i => i.Plan)
                    .FirstOrDefaultAsync(i => i.Token == dto.Token);

                if (invitation == null)
                {
                    return ServiceResult<string>.Fail("Invitación no encontrada");
                }

                if (invitation.Status != "pending")
                {
                    return ServiceResult<string>.Fail("La invitación ya ha sido utilizada o cancelada");
                }

                if (invitation.ExpiresAt <= DateTime.UtcNow)
                {
                    invitation.Status = "expired";
                    await _context.SaveChangesAsync();
                    return ServiceResult<string>.Fail("La invitación ha expirado");
                }

                // Crear tenant usando el servicio de provisioning
                var createTenantDto = new CreateTenantDto
                {
                    VerticalCode = invitation.Vertical.Code,
                    Subdomain = invitation.Subdomain,
                    BusinessName = invitation.BusinessName,
                    BusinessAddress = invitation.BusinessAddress,
                    AdminEmail = invitation.AdminEmail,
                    AdminFirstName = dto.FirstName,
                    AdminLastName = dto.LastName,
                    AdminPhone = dto.Phone,
                    AdminPassword = dto.Password,
                    TimeZone = invitation.TimeZone,
                    Currency = invitation.Currency,
                    Language = invitation.Language,
                    IsDemo = invitation.IsDemo,
                    DemoDays = invitation.DemoDays,
                    PlanId = invitation.PlanId
                };

                var tenantResult = await _tenantProvisioningService.CreateTenantAsync(createTenantDto);
                if (!tenantResult.Success)
                {
                    return ServiceResult<string>.Fail($"Error creando tenant: {tenantResult.Message}");
                }

                // El usuario admin ya se crea en TenantProvisioningService.CreateTenantAsync
                // No necesitamos crear el usuario aquí

                // Marcar invitación como usada
                invitation.Status = "used";
                invitation.UsedAt = DateTime.UtcNow;
                // tenantResult.Data contiene la URL del tenant
                invitation.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Retornar URL del tenant creado
                return ServiceResult<string>.Ok(tenantResult.Data ?? string.Empty);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error accepting invitation {Token}", dto.Token);
                return ServiceResult<string>.Fail("Error interno del servidor");
            }
        }

        public async Task<ServiceResult<List<InvitationResponseDto>>> GetPendingInvitationsAsync()
        {
            try
            {
                var invitations = await _context.Invitations
                    .Include(i => i.Vertical)
                    .Include(i => i.Plan)
                    .Where(i => i.Status == "pending" && i.ExpiresAt > DateTime.UtcNow)
                    .OrderByDescending(i => i.CreatedAt)
                    .Select(i => new InvitationResponseDto
                    {
                        Id = i.Id,
                        Token = i.Token,
                        Subdomain = i.Subdomain,
                        BusinessName = i.BusinessName,
                        BusinessAddress = i.BusinessAddress,
                        AdminEmail = i.AdminEmail,
                        AdminPhone = i.AdminPhone,
                        TimeZone = i.TimeZone,
                        Currency = i.Currency,
                        Language = i.Language,
                        Notes = i.Notes,
                        IsDemo = i.IsDemo,
                        DemoDays = i.DemoDays,
                        Status = i.Status,
                        ExpiresAt = i.ExpiresAt,
                        CreatedAt = i.CreatedAt,
                        VerticalName = i.Vertical.Name,
                        PlanName = i.Plan != null ? i.Plan.Name : null,
                        InvitationUrl = $"{_configuration["FrontendUrl"]}/invitation/{i.Token}"
                    })
                    .ToListAsync();

                return ServiceResult<List<InvitationResponseDto>>.Ok(invitations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending invitations");
                return ServiceResult<List<InvitationResponseDto>>.Fail("Error interno del servidor");
            }
        }

        public async Task<ServiceResult<bool>> CancelInvitationAsync(Guid invitationId)
        {
            try
            {
                var invitation = await _context.Invitations.FindAsync(invitationId);
                if (invitation == null)
                {
                    return ServiceResult<bool>.Fail("Invitación no encontrada");
                }

                if (invitation.Status != "pending")
                {
                    return ServiceResult<bool>.Fail("Solo se pueden cancelar invitaciones pendientes");
                }

                invitation.Status = "cancelled";
                invitation.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling invitation {InvitationId}", invitationId);
                return ServiceResult<bool>.Fail("Error interno del servidor");
            }
        }

        public async Task<ServiceResult<bool>> ResendInvitationAsync(Guid invitationId)
        {
            try
            {
                var invitation = await _context.Invitations.FindAsync(invitationId);
                if (invitation == null)
                {
                    return ServiceResult<bool>.Fail("Invitación no encontrada");
                }

                if (invitation.Status != "pending")
                {
                    return ServiceResult<bool>.Fail("Solo se pueden reenviar invitaciones pendientes");
                }

                // Extender expiración si está muy cerca
                if (invitation.ExpiresAt <= DateTime.UtcNow.AddDays(1))
                {
                    invitation.ExpiresAt = DateTime.UtcNow.AddDays(7);
                    invitation.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                // TODO: Aquí se enviaría el email nuevamente
                _logger.LogInformation("Invitation {InvitationId} resent to {Email}", invitationId, invitation.AdminEmail);

                return ServiceResult<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resending invitation {InvitationId}", invitationId);
                return ServiceResult<bool>.Fail("Error interno del servidor");
            }
        }

        private static string GenerateSecureToken()
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[32];
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }
    }
}