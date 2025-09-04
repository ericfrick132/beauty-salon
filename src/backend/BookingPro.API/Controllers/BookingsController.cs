using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookingPro.API.Services;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.DTOs;
using BookingPro.API.Models.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _bookingService;
        private readonly ITenantService _tenantService;

        public BookingsController(
            IBookingService bookingService,
            ITenantService tenantService)
        {
            _bookingService = bookingService;
            _tenantService = tenantService;
        }

        [HttpGet]
        public async Task<IActionResult> GetBookings(
            [FromQuery] DateTime? date,
            [FromQuery] Guid? professionalId,
            [FromQuery] string? status)
        {
            var result = await _bookingService.GetBookingsAsync(date, professionalId, status);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBooking(Guid id)
        {
            var result = await _bookingService.GetBookingByIdAsync(id);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto dto)
        {
            var result = await _bookingService.CreateBookingAsync(dto);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(new { id = result.Data!.Id, message = result.Message });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBooking(Guid id, [FromBody] UpdateBookingDto dto)
        {
            var result = await _bookingService.UpdateBookingAsync(id, dto);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(new { message = result.Message });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBooking(Guid id)
        {
            var result = await _bookingService.DeleteBookingAsync(id);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(new { message = result.Message });
        }

        [HttpGet("unpaid")]
        public async Task<IActionResult> GetUnpaidBookings()
        {
            var result = await _bookingService.GetUnpaidBookingsAsync();
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
        }

        [HttpGet("available-slots")]
        public async Task<IActionResult> GetAvailableSlots(
            [FromQuery] Guid employeeId,
            [FromQuery] DateTime date,
            [FromQuery] Guid serviceId)
        {
            var result = await _bookingService.GetAvailableTimeSlotsAsync(employeeId, date, serviceId);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
        }
    }
}