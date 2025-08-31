using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Interfaces;
using BookingPro.API.Services;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace BookingPro.API.Repositories
{
    /// <summary>
    /// Generic repository implementation with automatic tenant filtering
    /// All queries are automatically scoped to the current tenant
    /// </summary>
    public class GenericRepository<T> : IRepository<T> where T : class, ITenantEntity
    {
        protected readonly ApplicationDbContext _context;
        protected readonly ITenantService _tenantService;
        protected readonly DbSet<T> _dbSet;

        public GenericRepository(ApplicationDbContext context, ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
            _dbSet = context.Set<T>();
        }

        // Get current tenant ID for filtering
        protected async Task<Guid> GetCurrentTenantIdAsync()
        {
            var config = await _tenantService.GetCurrentConfigAsync();
            return config.Id;
        }

        // Apply tenant filter to queryable
        protected IQueryable<T> ApplyTenantFilter(IQueryable<T> query)
        {
            // Note: Entity Framework Global Query Filters should handle this automatically,
            // but we add this as an extra safety measure
            var tenantId = _tenantService.GetCurrentTenantIdFromContext();
            if (tenantId != Guid.Empty)
            {
                return query.Where(e => e.TenantId == tenantId);
            }
            return query;
        }

        // Basic CRUD operations
        public virtual async Task<T?> GetByIdAsync(Guid id)
        {
            return await ApplyTenantFilter(_dbSet).FirstOrDefaultAsync(e => e.Id == id);
        }

        public virtual async Task<T?> GetByIdAsync(Guid id, params Expression<Func<T, object>>[] includes)
        {
            var query = ApplyTenantFilter(_dbSet);
            
            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            return await query.FirstOrDefaultAsync(e => e.Id == id);
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync()
        {
            return await ApplyTenantFilter(_dbSet).ToListAsync();
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync(params Expression<Func<T, object>>[] includes)
        {
            var query = ApplyTenantFilter(_dbSet);
            
            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            return await query.ToListAsync();
        }

        public virtual async Task<T> AddAsync(T entity)
        {
            // Set tenant ID automatically
            entity.TenantId = await GetCurrentTenantIdAsync();
            
            _dbSet.Add(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public virtual async Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities)
        {
            var tenantId = await GetCurrentTenantIdAsync();
            
            foreach (var entity in entities)
            {
                entity.TenantId = tenantId;
            }

            _dbSet.AddRange(entities);
            await _context.SaveChangesAsync();
            return entities;
        }

        public virtual async Task<T> UpdateAsync(T entity)
        {
            // Ensure tenant ID is not modified
            var tenantId = await GetCurrentTenantIdAsync();
            entity.TenantId = tenantId;

            _dbSet.Update(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public virtual async Task<bool> DeleteAsync(Guid id)
        {
            var entity = await GetByIdAsync(id);
            if (entity == null)
                return false;

            _dbSet.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public virtual async Task<bool> DeleteAsync(T entity)
        {
            _dbSet.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public virtual async Task<int> CountAsync()
        {
            return await ApplyTenantFilter(_dbSet).CountAsync();
        }

        // Query operations
        public virtual IQueryable<T> Query()
        {
            return ApplyTenantFilter(_dbSet);
        }

        public virtual IQueryable<T> Query(params Expression<Func<T, object>>[] includes)
        {
            var query = ApplyTenantFilter(_dbSet);
            
            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            return query;
        }

        public virtual async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate)
        {
            return await ApplyTenantFilter(_dbSet).FirstOrDefaultAsync(predicate);
        }

        public virtual async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes)
        {
            var query = ApplyTenantFilter(_dbSet);
            
            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            return await query.FirstOrDefaultAsync(predicate);
        }

        public virtual async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
        {
            return await ApplyTenantFilter(_dbSet).Where(predicate).ToListAsync();
        }

        public virtual async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes)
        {
            var query = ApplyTenantFilter(_dbSet);
            
            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            return await query.Where(predicate).ToListAsync();
        }

        public virtual async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
        {
            return await ApplyTenantFilter(_dbSet).AnyAsync(predicate);
        }

        public virtual async Task<int> CountAsync(Expression<Func<T, bool>> predicate)
        {
            return await ApplyTenantFilter(_dbSet).CountAsync(predicate);
        }

        // Pagination
        public virtual async Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
            int pageNumber,
            int pageSize,
            Expression<Func<T, bool>>? predicate = null,
            Expression<Func<T, object>>? orderBy = null,
            bool descending = false,
            params Expression<Func<T, object>>[] includes)
        {
            var query = ApplyTenantFilter(_dbSet);

            // Apply includes
            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            // Apply predicate filter
            if (predicate != null)
            {
                query = query.Where(predicate);
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply ordering
            if (orderBy != null)
            {
                query = descending 
                    ? query.OrderByDescending(orderBy) 
                    : query.OrderBy(orderBy);
            }

            // Apply pagination
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }
    }
}