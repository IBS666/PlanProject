using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Enums;
using planProject.Services.Interfaces;

namespace planProject.Services
{
    public class ProjectService : IProjectService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuditService _auditService;
        private readonly INotificationService _notificationService;

        public ProjectService(ApplicationDbContext context, IAuditService auditService, INotificationService notificationService)
        {
            _context = context;
            _auditService = auditService;
            _notificationService = notificationService;
        }

        
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
            await _auditService.LogAsync(userId,AuditAction.CREATE.ToString(),"Project",project.Id,$"Nouveau projet créé : {project.Name}");

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
            var allMembersExceptCurrent = await GetAllProjectMembersExceptAsync(projectId, currentUserId);
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
            await _notificationService.NotifyUsersAsync(allMembersExceptCurrent, "Projet mis à jour", $"Le projet {project.Name} a été mis à jour.", NotificationType.ProjetModifie, "Project", project.Id);
            await _auditService.LogAsync(currentUserId,AuditAction.UPDATE.ToString(),"Project",project.Id,$"Projet mis à jour : {project.Name}");
            return "Project updated successfully";
        }

        public async Task<string> DeleteProjectAsync(int projectId, int currentUserId)
        {   
            var allMembersExceptCurrent = await GetAllProjectMembersExceptAsync(projectId, currentUserId);
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
                return "Project not found";
          
            var members = _context.ProjectMembers.Where(pm => pm.ProjectId == projectId);
        

            await _notificationService.NotifyUsersAsync(allMembersExceptCurrent, "Projet supprimé", $"Le projet {project.Name} a été supprimé.", NotificationType.ProjetSupprime, "Project", project.Id);


            _context.ProjectMembers.RemoveRange(members);

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(currentUserId,AuditAction.DELETE.ToString(),"Project",project.Id,$"Projet supprimé : {project.Name}");

            return "Project deleted successfully";
        }


        public async Task<string> AddMemberByEmailAsync(int projectId, string emailToAdd, int currentUserId)
        {
            var projectName = await _context.Projects.Where(p => p.Id == projectId).Select(p => p.Name).FirstOrDefaultAsync();
            var allMembersExceptCurrent = await GetAllProjectMembersExceptAsync(projectId, currentUserId);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == emailToAdd);
            if (user == null)
                return "User not found";

            if (await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == user.Id))
                return "User is already a member";

            _context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = projectId,
                UserId = user.Id,
                RoleInProject = "Member",
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await _notificationService.NotifyUsersAsync(new List<User> { user }, "Membre ajouté", $"Vous avez été ajouté au projet {projectName}.", NotificationType.MembreAjoute, "Project", projectId);
            await _notificationService.NotifyUsersAsync(allMembersExceptCurrent, "Membre ajouté", $"Le membre {user.Email} a été ajouté au projet {projectName}.", NotificationType.MembreAjoute, "Project", projectId);
            await _auditService.LogAsync(currentUserId,AuditAction.UPDATE.ToString(),"Project",projectId,$"Membre ajouté au projet : {user.Email}");
            return "Member added successfully";
        }

        public async Task<string> RemoveMemberAsync(int projectId, int userIdToRemove, int currentUserId)
        {
            var projectName = await _context.Projects.Where(p => p.Id == projectId).Select(p => p.Name).FirstOrDefaultAsync();
            var allMembersExceptCurrent = await GetAllProjectMembersExceptAsync(projectId, currentUserId);
            var membership = await _context.ProjectMembers
            .Include(pm => pm.User)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userIdToRemove);

            if (membership == null)
                return "User is not a member of the project";

            if (membership.RoleInProject == "Owner")
                return "Cannot remove the Owner";

            

              

            _context.ProjectMembers.Remove(membership);
            await _context.SaveChangesAsync();
            await _notificationService.NotifyUsersAsync(new List<User> { membership.User }, "Membre supprimé", $"Vous avez été supprimé du projet {projectName}.", NotificationType.MembreSupprime, "Project", projectId);
            await _notificationService.NotifyUsersAsync(allMembersExceptCurrent, "Membre supprimé", $"Le membre {membership.User.Email} a été supprimé du projet {projectName}.", NotificationType.MembreSupprime, "Project", projectId);
            
            await _auditService.LogAsync(currentUserId,AuditAction.UPDATE.ToString(),"Project",projectId,$"Membre supprimé du projet : {membership.User.Email}");


            return "Member removed successfully";
        }

        public async Task<List<object>?> GetProjectMembersAsync(int projectId, int currentUserId)
        {
            

            return await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Include(pm => pm.User)
                .ThenInclude(u => u.Role)
                .Select(pm => new
                {
                    pm.User.Id,
                    pm.User.Name,
                    pm.User.Email,
                    pm.RoleInProject,
                    Role = pm.User.Role.Name
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

        


        private async Task<List<User>> GetAllProjectMembersExceptAsync(int projectId, int excludeUserId)
        {
            return await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId && pm.UserId != excludeUserId)
                .Include(pm => pm.User)
                .Select(pm => pm.User)
                .ToListAsync();
        }
    }
}