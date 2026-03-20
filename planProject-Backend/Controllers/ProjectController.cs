using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using planProject.Services;

namespace planProject.Controllers
{   
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        [Authorize (Roles = "Chef")]
        [HttpPost]
        public async Task<IActionResult> CreateProject(CreateProjectDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var project = await _projectService.CreateProjectAsync(request, userId);
            return Ok(project);
        }

        [Authorize (Roles = "Admin,Chef")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(int id, UpdateProjectDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _projectService.UpdateProjectAsync(id, userId, request);

            return result switch
            {
                "Project not found" => NotFound(result),
                "Unauthorized" => Forbid(),
                _ => Ok(result)
            };
        }

        [Authorize (Roles = "Admin,Chef")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _projectService.DeleteProjectAsync(id, userId);

            return result switch
            {
                "Project not found" => NotFound(result),
                "Unauthorized" => Forbid(),
                _ => Ok(result)
            };
        }

        [Authorize (Roles = "Admin,Chef")]
        [HttpPost("{projectId}/members/{userEmail}")]
        public async Task<IActionResult> AddMemberByEmail(int projectId, string userEmail)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _projectService.AddMemberByEmailAsync(projectId, userEmail, currentUserId);

            return result switch
            {
                "Project not found" => NotFound(result),
                "User not found" => NotFound(result),
                "Unauthorized" => Forbid(),
                "User is already a member" => BadRequest(result),
                _ => Ok(result)
            };
        }

        [Authorize (Roles = "Admin,Chef")]
        [HttpDelete("{projectId}/members/{userId}")]
        public async Task<IActionResult> RemoveMember(int projectId, int userId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _projectService.RemoveMemberAsync(projectId, userId, currentUserId);

            return result switch
            {
                "Project not found" => NotFound(result),
                "Unauthorized" => Forbid(),
                "User is not a member of the project" => BadRequest(result),
                "Cannot remove the Owner" => BadRequest(result),
                _ => Ok(result)
            };
        }

        [AllowAnonymous]
        [HttpGet("{projectId}/members")]
        public async Task<IActionResult> GetMembers(int projectId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var members = await _projectService.GetProjectMembersAsync(projectId, userId);

            if (members == null) return Forbid();
            return Ok(members);
        }

        [Authorize (Roles = "Ingenieur,Tech,Chef")]
        [HttpGet("my-projects")]
        public async Task<IActionResult> GetMyProjects()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var projects = await _projectService.GetUserProjectsAsync(userId);
            return Ok(projects);
        }


        [Authorize (Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAllProjects()
        {
            var projects = await _projectService.GetAllProjectsAsync();
            return Ok(projects);
        }
    }
}