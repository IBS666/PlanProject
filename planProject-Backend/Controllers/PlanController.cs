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

        
        [Authorize(Policy = "Lire_Plan")]
        [HttpGet("{planId}")]
        public async Task<IActionResult> GetPlanById(int planId)
        {
            var plan = await _planService.GetPlanByIdAsync(planId);

            if (plan == null)
                return NotFound();

            return Ok(plan);
        }

        [Authorize(Policy = "Creer_Plan")]
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreatePlan([FromForm] CreatePlanDto request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
                return Unauthorized();

            var userId = int.Parse(userIdClaim.Value);

            var plan = await _planService.CreatePlanAsync(request, userId);

            return Ok(plan);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("count")]
        public async Task<IActionResult> GetTotalPlansCount()
        {
            var count = await _planService.CountPlansAsync();
            return Ok(count);
        }

        [Authorize(Policy = "Lire_Localisation")]
        [HttpGet("location-with-plans")]
        public async Task<IActionResult> GetLocationsWithPlans()
        {
            var result = await _planService.GetLocationsWithPlansAsync();
            return Ok(result);
        }

        [Authorize(Policy = "Lire_Plan")]
        [HttpGet("location/{locationId}")]
        public async Task<IActionResult> GetPlansByLocation(int locationId)
        {
            var plans = await _planService.GetPlansByLocationAsync(locationId);
            return Ok(plans);
        }

        
        [Authorize(Policy = "Supprimer_Plan")]
        [HttpDelete("{planId}")]
        public async Task<IActionResult> DeletePlan(int planId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var deleted = await _planService.DeletePlanAsync(planId, currentUserId);

            if (!deleted)
                return NotFound();

            return NoContent();
        }

        [Authorize(Policy = "Creer_VersionPlan")]
[HttpPost("{planId}/versions")]
[Consumes("multipart/form-data")]
public async Task<IActionResult> AddVersion(int planId, [FromForm] AddVersionDto request)
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
    if (userIdClaim == null) return Unauthorized();

    var userId = int.Parse(userIdClaim.Value);

    try
    {
        var version = await _planService.AddVersionAsync(planId, request.File, userId, request.Comment);
        return Ok(version);
    }
    catch (Exception ex)
    {
        return BadRequest(ex.Message);
    }
}

        [Authorize(Policy = "Supprimer_VersionPlan")]
        [HttpDelete("versions/{versionId}")]
        public async Task<IActionResult> DeleteVersion(int versionId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var deleted = await _planService.DeleteVersionAsync(versionId, currentUserId);
            if (!deleted)
                return NotFound();
            return NoContent();
        }

        [HttpGet("my-plans-count")]
[Authorize] 
public async Task<IActionResult> GetMyPlansCount()
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
    if (userIdClaim == null) return Unauthorized();
    var userId = int.Parse(userIdClaim.Value);

    var count = await _planService.GetMyPlansCountAsync(userId);
    return Ok(count);
}

[HttpGet("my-versions-count")]
[Authorize] 
public async Task<IActionResult> GetMyVersionsCount()
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
    if (userIdClaim == null) return Unauthorized();
    var userId = int.Parse(userIdClaim.Value);

    var count = await _planService.GetMyVersionsCountAsync(userId);
    return Ok(count);
}

[HttpGet("my-plans-by-category")]
[Authorize]
public async Task<IActionResult> GetMyPlansByCategory()
{
    try
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        var userId = int.Parse(userIdClaim.Value);
        var data = await _planService.GetMyPlansByCategoryAsync(userId);
        return Ok(data);
    }
    catch (Exception ex)
    {
        return BadRequest(ex.Message);
    }
}

    }
}