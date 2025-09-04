using BookingPro.API.Data;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Interfaces;
using System.Linq.Expressions;

namespace BookingPro.API.Repositories
{
    /// <summary>
    /// Generic repository interface for tenant-aware entities
    /// Automatically applies tenant filtering to all operations
    /// </summary>
    public interface IRepository<T> where T : class, ITenantEntity
    {
        // Basic CRUD operations
        Task<T?> GetByIdAsync(Guid id);
        Task<T?> GetByIdAsync(Guid id, params Expression<Func<T, object>>[] includes);
        Task<IEnumerable<T>> GetAllAsync();
        Task<IEnumerable<T>> GetAllAsync(params Expression<Func<T, object>>[] includes);
        Task<T> AddAsync(T entity);
        Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities);
        Task<T> UpdateAsync(T entity);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> DeleteAsync(T entity);
        Task<int> CountAsync();

        // Query operations with automatic tenant filtering
        IQueryable<T> Query();
        IQueryable<T> Query(params Expression<Func<T, object>>[] includes);
        Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);
        Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes);
        Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
        Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes);
        Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
        Task<int> CountAsync(Expression<Func<T, bool>> predicate);

        // Pagination
        Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
            int pageNumber, 
            int pageSize, 
            Expression<Func<T, bool>>? predicate = null,
            Expression<Func<T, object>>? orderBy = null,
            bool descending = false,
            params Expression<Func<T, object>>[] includes);

        // Access to underlying context for advanced scenarios
        ApplicationDbContext GetContext();
    }
}