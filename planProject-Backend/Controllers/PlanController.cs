using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using planProject.Services.Interfaces;
using System.Security.Claims;

namespace planProject.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlanController : ControllerBase
    {
        private readonly IPlanService _planService;

        public PlanController(IPlanService planService)
        {
            _planService = planService;
        }

        
        [AllowAnonymous]
        [HttpGet("{planId}")]
        public async Task<IActionResult> GetPlanById(int planId)
        {
            var plan = await _planService.GetPlanByIdAsync(planId);

            if (plan == null)
                return NotFound();

            return Ok(plan);
        }

        [Authorize(Roles = "Admin,Chef")]
        [HttpPost]
        public async Task<IActionResult> CreatePlan([FromForm] CreatePlanDto request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
                return Unauthorized();

            var userId = int.Parse(userIdClaim.Value);

            var plan = await _planService.CreatePlanAsync(request, userId);

            return Ok(plan);
        }

        [HttpGet("count")]
        public async Task<IActionResult> GetTotalPlansCount()
        {
            var count = await _planService.CountPlansAsync();
            return Ok(count);
        }

        [AllowAnonymous]
        [HttpGet("location-with-plans")]
        public async Task<IActionResult> GetLocationsWithPlans()
        {
            var result = await _planService.GetLocationsWithPlansAsync();
            return Ok(result);
        }

        [HttpGet("location/{locationId}")]
        public async Task<IActionResult> GetPlansByLocation(int locationId)
        {
            var plans = await _planService.GetPlansByLocationAsync(locationId);
            return Ok(plans);
        }

        
        [Authorize(Roles = "Admin,Chef")]
        [HttpDelete("{planId}")]
        public async Task<IActionResult> DeletePlan(int planId)
        {
            var deleted = await _planService.DeletePlanAsync(planId);

            if (!deleted)
                return NotFound();

            return NoContent();
        }

        [Authorize(Roles = "Admin,Chef")]
        [HttpPost("{planId}/versions")]
        public async Task<IActionResult> AddVersion(int planId, [FromForm] IFormFile file, [FromForm] string? comment = null)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            var userId = int.Parse(userIdClaim.Value);

            try
            {
                var version = await _planService.AddVersionAsync(planId, file, userId, comment);
                return Ok(version);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}