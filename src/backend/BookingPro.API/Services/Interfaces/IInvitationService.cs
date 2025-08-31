using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Common;

namespace BookingPro.API.Services.Interfaces
{
    public interface IInvitationService
    {
        Task<ServiceResult<InvitationResponseDto>> CreateInvitationAsync(CreateInvitationDto dto);
        Task<ServiceResult<InvitationDetailsDto>> GetInvitationByTokenAsync(string token);
        Task<ServiceResult<string>> AcceptInvitationAsync(AcceptInvitationDto dto);
        Task<ServiceResult<List<InvitationResponseDto>>> GetPendingInvitationsAsync();
        Task<ServiceResult<bool>> CancelInvitationAsync(Guid invitationId);
        Task<ServiceResult<bool>> ResendInvitationAsync(Guid invitationId);
    }
}