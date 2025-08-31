namespace BookingPro.API.Models.Interfaces
{
    public interface ITenantEntity : IEntity
    {
        Guid TenantId { get; set; }
    }
}