using BookingPro.API.Data;
using BookingPro.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/super-admin/emails")]
    [Authorize(Roles = "super_admin")]
    public class SuperAdminEmailsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<SuperAdminEmailsController> _logger;

        public SuperAdminEmailsController(
            ApplicationDbContext context,
            IEmailService emailService,
            ILogger<SuperAdminEmailsController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        /// <summary>
        /// Lista los últimos emails registrados con filtros opcionales.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] int limit = 100,
            [FromQuery] string? status = null,
            [FromQuery] string? templateKey = null,
            [FromQuery] Guid? tenantId = null)
        {
            if (limit <= 0 || limit > 1000) limit = 100;

            var query = _context.EmailLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(l => l.Status == status);
            if (!string.IsNullOrWhiteSpace(templateKey))
                query = query.Where(l => l.TemplateKey == templateKey);
            if (tenantId.HasValue)
                query = query.Where(l => l.TenantId == tenantId.Value);

            // Project with a left-join on Tenants so the UI gets business name
            var logs = await (from log in query
                              orderby log.CreatedAt descending
                              join tenant in _context.Tenants on log.TenantId equals tenant.Id into tj
                              from tenant in tj.DefaultIfEmpty()
                              select new
                              {
                                  id = log.Id,
                                  toEmail = log.ToEmail,
                                  subject = log.Subject,
                                  templateKey = log.TemplateKey,
                                  status = log.Status,
                                  errorMessage = log.ErrorMessage,
                                  tenantId = log.TenantId,
                                  tenantName = tenant != null ? tenant.BusinessName : null,
                                  createdAt = log.CreatedAt
                              })
                              .Take(limit)
                              .ToListAsync();

            return Ok(logs);
        }

        public record SendTestEmailRequest(string ToEmail);

        /// <summary>
        /// Envía un email de prueba. Se registra en EmailLog como cualquier otro.
        /// </summary>
        [HttpPost("test")]
        public async Task<IActionResult> SendTest([FromBody] SendTestEmailRequest body)
        {
            if (body == null || string.IsNullOrWhiteSpace(body.ToEmail))
                return BadRequest(new { error = "toEmail requerido" });

            try
            {
                await _emailService.SendTestEmailAsync(body.ToEmail.Trim());
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending super admin test email to {Email}", body.ToEmail);
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
