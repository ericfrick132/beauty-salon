namespace BookingPro.API.Services.Interfaces
{
    public interface IReportService
    {
        Task<object> GetDashboardStatsAsync(DateTime? startDate = null, DateTime? endDate = null);
        Task<string> ExportBookingsCsvAsync(DateTime startDate, DateTime endDate);
        Task<object> GetEmployeePerformanceAsync(DateTime? startDate = null, DateTime? endDate = null);
    }
}