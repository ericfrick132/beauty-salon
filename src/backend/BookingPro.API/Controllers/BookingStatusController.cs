using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using System.ComponentModel.DataAnnotations;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/bookings/{bookingId}/status")]
    [Authorize]
    public class BookingStatusController : ControllerBase
    {
        private readonly IBookingService _bookingService;
        private readonly IBookingStatusService _bookingStatusService;

        public BookingStatusController(
            IBookingService bookingService,
            IBookingStatusService bookingStatusService)
        {
            _bookingService = bookingService;
            _bookingStatusService = bookingStatusService;
        }

        [HttpPut]
        public async Task<IActionResult> UpdateStatus(Guid bookingId, [FromBody] UpdateBookingStatusDto dto)
        {
            try
            {
                var result = await _bookingStatusService.UpdateStatusAsync(bookingId, dto);
                
                if (!result.Success)
                {
                    return BadRequest(new { message = result.ErrorMessage });
                }

                return Ok(new 
                { 
                    message = "Status updated successfully", 
                    previousStatus = result.PreviousStatus,
                    currentStatus = result.CurrentStatus,
                    timestamp = result.UpdatedAt
                });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetStatusHistory(Guid bookingId)
        {
            try
            {
                var history = await _bookingStatusService.GetStatusHistoryAsync(bookingId);
                return Ok(history);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("allowed-transitions")]
        public async Task<IActionResult> GetAllowedTransitions(Guid bookingId)
        {
            try
            {
                var transitions = await _bookingStatusService.GetAllowedTransitionsAsync(bookingId);
                return Ok(transitions);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}