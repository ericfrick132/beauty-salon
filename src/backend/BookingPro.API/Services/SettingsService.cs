using BookingPro.API.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BookingPro.API.Services
{
    public interface ISettingsService
    {
        Task<Dictionary<string, object>> GetSettingsAsync(Guid tenantId);
        Task SaveSettingsAsync(Guid tenantId, Dictionary<string, object> settings);
    }

    public class SettingsService : ISettingsService
    {
        private readonly ApplicationDbContext _context;

        public SettingsService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Dictionary<string, object>> GetSettingsAsync(Guid tenantId)
        {
            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null) throw new KeyNotFoundException("Tenant not found");

            return ParseSettings(tenant.Settings);
        }

        public async Task SaveSettingsAsync(Guid tenantId, Dictionary<string, object> settings)
        {
            var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null) throw new KeyNotFoundException("Tenant not found");

            tenant.Settings = JsonSerializer.Serialize(settings);
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private static Dictionary<string, object> ParseSettings(string json)
        {
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                return dict ?? new Dictionary<string, object>();
            }
            catch
            {
                return new Dictionary<string, object>();
            }
        }
    }
}
