using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using planProject.Services.Interfaces;

namespace planProject.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LocationController : ControllerBase
    {
        private readonly ILocationService _locationService;

        public LocationController(ILocationService locationService)
        {
            _locationService = locationService;
        }

        
        [Authorize(Roles = "Admin,Chef")]
        [HttpPost]
        public async Task<IActionResult> CreateLocation(CreateLocationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var location = await _locationService.CreateLocationAsync(request);

            return CreatedAtAction(nameof(GetLocationById), new { locationId = location.Id }, location);
        }

        
        [AllowAnonymous]
        [HttpGet("{locationId}")]
        public async Task<IActionResult> GetLocationById(int locationId)
        {
            var location = await _locationService.GetLocationByIdAsync(locationId);

            if (location == null)
                return NotFound();

            return Ok(location);
        }

        
        [AllowAnonymous]
        [HttpGet("{locationId}/children")]
        public async Task<IActionResult> GetChildren(int locationId)
        {
            var children = await _locationService.GetLocationChildrensAsync(locationId);

            return Ok(children);
        }

        
        [AllowAnonymous]
        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetLocationsByProject(int projectId)
        {
            var locations = await _locationService.GetLocationsByProjectIdAsync(projectId);

            return Ok(locations);
        }

        
        [AllowAnonymous]
        [HttpGet("project/{projectId}/tree")]
        public async Task<IActionResult> GetLocationTree(int projectId)
        {
            var tree = await _locationService.GetLocationTreeByProjectAsync(projectId);

            return Ok(tree);
        }

        
        [Authorize(Roles = "Admin,Chef")]
        [HttpDelete("{locationId}")]
        public async Task<IActionResult> DeleteLocation(int locationId)
        {
            try
            {
                var deleted = await _locationService.DeleteLocationAsync(locationId);

                if (!deleted)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}