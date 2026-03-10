using Microsoft.EntityFrameworkCore;
using planProject.Data;

namespace planProject.Services
{
    public class ProjectService : IProjectService
    {
        private readonly ApplicationDbContext _context;

        public ProjectService(ApplicationDbContext context)
        {
            _context = context;
        }

        // Créer un projet → le créateur devient Owner
        public async Task<Project> CreateProjectAsync(CreateProjectDto request, int userId)
        {
            var project = new Project
            {
                Name = request.Name,
                Status = request.Status,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var ownerMember = new ProjectMember
            {
                ProjectId = project.Id,
                UserId = userId,
                RoleInProject = "Owner",
                JoinedAt = DateTime.UtcNow
            };

            _context.ProjectMembers.Add(ownerMember);
            await _context.SaveChangesAsync();

            return project;
        }

        public async Task<bool> IsProjectOwner(int projectId, int userId)
        {
            return await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId 
                             && pm.UserId == userId 
                             && pm.RoleInProject == "Owner" );
        }

        public async Task<string> UpdateProjectAsync(int projectId, int currentUserId, UpdateProjectDto request)
        {
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
                return "Project not found";

            if (!await IsProjectOwner(projectId, currentUserId) && currentUserId != 1 )
                return "Unauthorized";

            project.Type = request.Type ?? project.Type;
            project.Name = request.Name ?? project.Name;
            project.Status = request.Status ?? project.Status;
            project.Description = request.Description ?? project.Description;

            await _context.SaveChangesAsync();
            return "Project updated successfully";
        }

        public async Task<string> DeleteProjectAsync(int projectId, int currentUserId)
        {
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
                return "Project not found";

            if (!await IsProjectOwner(projectId, currentUserId))
                return "Unauthorized";

            var members = _context.ProjectMembers.Where(pm => pm.ProjectId == projectId);
            _context.ProjectMembers.RemoveRange(members);

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return "Project deleted successfully";
        }

        public async Task<string> AddMemberAsync(int projectId, int userIdToAdd, int currentUserId)
        {
            if (!await IsProjectOwner(projectId, currentUserId))
                return "Unauthorized";

            var user = await _context.Users.FindAsync(userIdToAdd);
            if (user == null)
                return "User not found";

            if (await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userIdToAdd))
                return "User is already a member";

            _context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = projectId,
                UserId = userIdToAdd,
                RoleInProject = "Member",
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return "Member added successfully";
        }

        public async Task<string> RemoveMemberAsync(int projectId, int userIdToRemove, int currentUserId)
        {
            if (!await IsProjectOwner(projectId, currentUserId))
                return "Unauthorized";

            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userIdToRemove);

            if (membership == null)
                return "User is not a member of the project";

            if (membership.RoleInProject == "Owner")
                return "Cannot remove the Owner";

            _context.ProjectMembers.Remove(membership);
            await _context.SaveChangesAsync();

            return "Member removed successfully";
        }

        public async Task<List<object>?> GetProjectMembersAsync(int projectId, int currentUserId)
        {
            if (!await IsProjectOwner(projectId, currentUserId))
                return null;

            return await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Include(pm => pm.User)
                .Select(pm => new
                {
                    pm.User.Id,
                    pm.User.Name,
                    pm.User.Email,
                    pm.RoleInProject
                })
                .ToListAsync<object>();
        }

        public async Task<List<Project>> GetUserProjectsAsync(int userId)
        {
            return await _context.ProjectMembers
                .Where(pm => pm.UserId == userId)
                .Include(pm => pm.Project)
                .Select(pm => pm.Project)
                .ToListAsync();
        }

        public async Task<List<Project>> GetAllProjectsAsync()
        {
            return await _context.Projects.ToListAsync();
        }
    }
}