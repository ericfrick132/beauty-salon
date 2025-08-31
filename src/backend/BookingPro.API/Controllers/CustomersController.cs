using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookingPro.API.Services.Interfaces;
using BookingPro.API.Models.DTOs;

namespace BookingPro.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerService _customerService;

        public CustomersController(ICustomerService customerService)
        {
            _customerService = customerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers()
        {
            var result = await _customerService.GetCustomersAsync();
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCustomer(Guid id)
        {
            var result = await _customerService.GetCustomerByIdAsync(id);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerDto dto)
        {
            var result = await _customerService.CreateCustomerAsync(dto);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return CreatedAtAction(nameof(GetCustomer), new { id = result.Data!.Id }, new { id = result.Data.Id, message = result.Message });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerDto dto)
        {
            var result = await _customerService.UpdateCustomerAsync(id, dto);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(new { message = result.Message });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(Guid id)
        {
            var result = await _customerService.DeleteCustomerAsync(id);
            
            if (!result.Success)
            {
                if (result.Message?.Contains("not found") == true)
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message, errors = result.Errors });
            }

            return Ok(new { message = result.Message });
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchCustomers([FromQuery] string searchTerm)
        {
            var result = await _customerService.SearchCustomersAsync(searchTerm);
            
            if (!result.Success)
                return BadRequest(new { message = result.Message, errors = result.Errors });
                
            return Ok(result.Data);
        }
    }
}