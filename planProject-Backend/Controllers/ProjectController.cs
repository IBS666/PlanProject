using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using planProject.Services.Interfaces;

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

        [Authorize(Policy = "Creer_Projet")]
        [HttpPost]
        public async Task<IActionResult> CreateProject(CreateProjectDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var project = await _projectService.CreateProjectAsync(request, userId);
            return Ok(project);
        }

        [Authorize(Policy = "Modifier_Projet")]
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

        [Authorize(Policy = "Supprimer_Projet")]
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

        [Authorize(Policy = "Ajouter_MembreProjet")]
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

        [Authorize(Policy = "Supprimer_MembreProjet")]
        [HttpDelete("{projectId}/members/{userId}")]
        public async Task<IActionResult> RemoveMember(int projectId, int userId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _projectService.RemoveMemberAsync(projectId, userId, currentUserId);
            
            Console.WriteLine($"==> RemoveMember: projectId={projectId}, userId={userId}, currentUserId={currentUserId}");

            return result switch
            {
                "Project not found" => NotFound(result),
                "Unauthorized" => Forbid(),
                "User is not a member of the project" => BadRequest(result),
                "Cannot remove the Owner" => BadRequest(result),
                _ => Ok(result)
            };
        }

        [Authorize(Policy = "Voir_MembresProjet")]
        [HttpGet("{projectId}/members")]
        public async Task<IActionResult> GetMembers(int projectId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var members = await _projectService.GetProjectMembersAsync(projectId, userId);

            if (members == null) return Forbid();
            return Ok(members);
        }

        [Authorize(Policy = "Lire_MesProjets")]
        [HttpGet("my-projects")]
        public async Task<IActionResult> GetMyProjects()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var projects = await _projectService.GetUserProjectsAsync(userId);
            return Ok(projects);
        }


        [Authorize(Policy = "Voir_Tous_Projets")]
        [HttpGet]
        public async Task<IActionResult> GetAllProjects()
        {
            var projects = await _projectService.GetAllProjectsAsync();
            return Ok(projects);
        }
    }
}