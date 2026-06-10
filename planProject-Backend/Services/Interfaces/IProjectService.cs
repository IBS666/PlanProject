using planProject.Data;

namespace planProject.Services.Interfaces
{
    public interface IProjectService
    {
        Task<Project> CreateProjectAsync(CreateProjectDto request, int userId);

        Task<string> UpdateProjectAsync(int projectId, int currentUserId, UpdateProjectDto request);

        Task<string> DeleteProjectAsync(int projectId, int currentUserId);


        Task<string> RemoveMemberAsync(int projectId, int userIdToRemove, int currentUserId);

        Task<List<object>?> GetProjectMembersAsync(int projectId, int currentUserId);

        Task<List<Project>> GetUserProjectsAsync(int userId);

        Task<List<Project>> GetAllProjectsAsync();

        Task<bool> IsProjectOwner(int projectId, int userId);

        Task<string> AddMemberByEmailAsync(int projectId, string emailToAdd, int currentUserId);
    }
}