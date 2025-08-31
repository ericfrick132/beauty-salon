using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Models.Common
{
    /// <summary>
    /// Standard result wrapper for service operations
    /// Provides consistent error handling and success/failure states
    /// </summary>
    public class ServiceResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public List<string>? Errors { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Static factory methods for common results
        public static ServiceResult Ok(string? message = null)
        {
            return new ServiceResult
            {
                Success = true,
                Message = message
            };
        }

        public static ServiceResult Fail(string message)
        {
            return new ServiceResult
            {
                Success = false,
                Message = message
            };
        }

        public static ServiceResult Fail(List<string> errors)
        {
            return new ServiceResult
            {
                Success = false,
                Errors = errors,
                Message = "Multiple validation errors occurred"
            };
        }

        public static ServiceResult ValidationFail(List<ValidationResult> validationResults)
        {
            var errors = validationResults
                .Where(r => !string.IsNullOrEmpty(r.ErrorMessage))
                .Select(r => r.ErrorMessage!)
                .ToList();

            return new ServiceResult
            {
                Success = false,
                Errors = errors,
                Message = "Validation failed"
            };
        }
    }

    /// <summary>
    /// Generic service result with typed data
    /// </summary>
    public class ServiceResult<T> : ServiceResult
    {
        public T? Data { get; set; }

        // Static factory methods for typed results
        public static ServiceResult<T> Ok(T data, string? message = null)
        {
            return new ServiceResult<T>
            {
                Success = true,
                Data = data,
                Message = message
            };
        }

        public static new ServiceResult<T> Fail(string message)
        {
            return new ServiceResult<T>
            {
                Success = false,
                Message = message
            };
        }

        public static new ServiceResult<T> Fail(List<string> errors)
        {
            return new ServiceResult<T>
            {
                Success = false,
                Errors = errors,
                Message = "Multiple errors occurred"
            };
        }

        public static ServiceResult<T> NotFound(string? message = null)
        {
            return new ServiceResult<T>
            {
                Success = false,
                Message = message ?? "Resource not found"
            };
        }
    }

    /// <summary>
    /// Paginated service result for list operations
    /// </summary>
    public class PaginatedServiceResult<T> : ServiceResult<IEnumerable<T>>
    {
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasNextPage => PageNumber < TotalPages;
        public bool HasPreviousPage => PageNumber > 1;

        public static PaginatedServiceResult<T> Ok(
            IEnumerable<T> data,
            int totalCount,
            int pageNumber,
            int pageSize,
            string? message = null)
        {
            return new PaginatedServiceResult<T>
            {
                Success = true,
                Data = data,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize,
                Message = message
            };
        }
    }
}