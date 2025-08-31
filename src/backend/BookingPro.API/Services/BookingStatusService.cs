using BookingPro.API.Data;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using BookingPro.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BookingPro.API.Services
{
    public class BookingStatusService : IBookingStatusService
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantService _tenantService;

        // Estados válidos del sistema
        private readonly string[] VALID_STATUSES = { "pending", "confirmed", "completed", "cancelled", "no_show" };

        // Transiciones permitidas
        private readonly Dictionary<string, string[]> STATUS_TRANSITIONS = new()
        {
            ["pending"] = new[] { "confirmed", "cancelled" },
            ["confirmed"] = new[] { "completed", "cancelled", "no_show" },
            ["completed"] = new string[] { }, // Estado final
            ["cancelled"] = new string[] { }, // Estado final
            ["no_show"] = new string[] { }    // Estado final
        };

        // Configuración de transiciones
        private readonly Dictionary<string, AllowedStatusTransition[]> TRANSITION_CONFIG = new()
        {
            ["pending"] = new[]
            {
                new AllowedStatusTransition
                {
                    FromStatus = "pending",
                    ToStatus = "confirmed",
                    DisplayName = "Confirmar Cita",
                    RequiresReason = false,
                    Description = "Confirma que la cita está programada"
                },
                new AllowedStatusTransition
                {
                    FromStatus = "pending",
                    ToStatus = "cancelled",
                    DisplayName = "Cancelar Cita",
                    RequiresReason = true,
                    Description = "Cancela la cita antes de confirmar"
                }
            },
            ["confirmed"] = new[]
            {
                new AllowedStatusTransition
                {
                    FromStatus = "confirmed",
                    ToStatus = "completed",
                    DisplayName = "Marcar como Completada",
                    RequiresReason = false,
                    Description = "La cita se completó exitosamente"
                },
                new AllowedStatusTransition
                {
                    FromStatus = "confirmed",
                    ToStatus = "cancelled",
                    DisplayName = "Cancelar Cita",
                    RequiresReason = true,
                    Description = "Cancela la cita confirmada"
                },
                new AllowedStatusTransition
                {
                    FromStatus = "confirmed",
                    ToStatus = "no_show",
                    DisplayName = "Marcar como No Show",
                    RequiresReason = false,
                    Description = "El cliente no se presentó a la cita"
                }
            }
        };

        public BookingStatusService(ApplicationDbContext context, ITenantService tenantService)
        {
            _context = context;
            _tenantService = tenantService;
        }

        public async Task<BookingStatusUpdateResult> UpdateStatusAsync(Guid bookingId, UpdateBookingStatusDto dto)
        {
            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null)
            {
                return new BookingStatusUpdateResult
                {
                    Success = false,
                    ErrorMessage = "Booking not found"
                };
            }

            var previousStatus = booking.Status;
            var newStatus = dto.NewStatus.ToLower();

            // Validar estado nuevo
            if (!VALID_STATUSES.Contains(newStatus))
            {
                return new BookingStatusUpdateResult
                {
                    Success = false,
                    ErrorMessage = $"Invalid status: {newStatus}"
                };
            }

            // Verificar si la transición está permitida
            if (!await CanTransitionToStatus(previousStatus, newStatus))
            {
                return new BookingStatusUpdateResult
                {
                    Success = false,
                    ErrorMessage = $"Cannot transition from {previousStatus} to {newStatus}"
                };
            }

            // Validar políticas de cancelación
            if (newStatus == "cancelled")
            {
                var cancellationValidation = ValidateCancellationPolicy(booking);
                if (!cancellationValidation.IsValid)
                {
                    return new BookingStatusUpdateResult
                    {
                        Success = false,
                        ErrorMessage = cancellationValidation.ErrorMessage
                    };
                }
            }

            // Aplicar cambio de estado
            booking.Status = newStatus;
            booking.UpdatedAt = DateTime.UtcNow;

            // Aplicar campos específicos por estado
            if (newStatus == "cancelled")
            {
                booking.CancelledAt = DateTime.UtcNow;
                booking.CancellationReason = dto.CancellationReason ?? dto.Reason;
            }

            // Crear entrada en el historial
            var historyEntry = new BookingStatusHistory
            {
                TenantId = booking.TenantId,
                BookingId = bookingId,
                FromStatus = previousStatus,
                ToStatus = newStatus,
                Reason = dto.Reason,
                Notes = dto.Notes,
                ChangedAt = DateTime.UtcNow,
                ChangedBy = GetCurrentUser() // TODO: Implementar gestión de usuario actual
            };

            _context.BookingStatusHistory.Add(historyEntry);
            await _context.SaveChangesAsync();

            return new BookingStatusUpdateResult
            {
                Success = true,
                PreviousStatus = previousStatus,
                CurrentStatus = newStatus,
                UpdatedAt = DateTime.UtcNow
            };
        }

        public async Task<IEnumerable<BookingStatusHistoryItem>> GetStatusHistoryAsync(Guid bookingId)
        {
            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null)
                throw new ArgumentException("Booking not found");

            var history = await _context.BookingStatusHistory
                .Where(h => h.BookingId == bookingId)
                .OrderBy(h => h.ChangedAt)
                .Select(h => new BookingStatusHistoryItem
                {
                    FromStatus = h.FromStatus,
                    ToStatus = h.ToStatus,
                    Reason = h.Reason,
                    Notes = h.Notes,
                    ChangedAt = h.ChangedAt,
                    ChangedBy = h.ChangedBy
                })
                .ToListAsync();

            return history;
        }

        public async Task<IEnumerable<AllowedStatusTransition>> GetAllowedTransitionsAsync(Guid bookingId)
        {
            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null)
                throw new ArgumentException("Booking not found");

            var currentStatus = booking.Status;
            
            if (TRANSITION_CONFIG.ContainsKey(currentStatus))
            {
                return TRANSITION_CONFIG[currentStatus];
            }

            return new List<AllowedStatusTransition>();
        }

        public Task<bool> CanTransitionToStatus(string currentStatus, string newStatus)
        {
            if (STATUS_TRANSITIONS.ContainsKey(currentStatus))
            {
                return Task.FromResult(STATUS_TRANSITIONS[currentStatus].Contains(newStatus));
            }
            return Task.FromResult(false);
        }

        private (bool IsValid, string? ErrorMessage) ValidateCancellationPolicy(Booking booking)
        {
            // Política: No se puede cancelar si faltan menos de 2 horas
            var minimumCancellationTime = TimeSpan.FromHours(2);
            var timeUntilBooking = booking.StartTime - DateTime.UtcNow;

            if (timeUntilBooking < minimumCancellationTime && timeUntilBooking > TimeSpan.Zero)
            {
                return (false, "No se puede cancelar una cita con menos de 2 horas de anticipación");
            }

            // Si la cita ya pasó, no se puede cancelar
            if (booking.StartTime < DateTime.UtcNow)
            {
                return (false, "No se puede cancelar una cita que ya pasó");
            }

            return (true, null);
        }

        private string? GetCurrentUser()
        {
            // TODO: Implementar gestión de usuario actual desde JWT/Claims
            return "system";
        }
    }
}