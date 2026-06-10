public interface IProjectTaskService
{
    Task<ProjectTask>  CreateTaskAsync(CreateTaskDto request, int creatorId);
    Task<string>       UpdateTaskAsync(int taskId, int currentUserId, UpdateTaskDto request);
    Task<string>       DeleteTaskAsync(int taskId, int currentUserId);
    Task<string>       UpdateTaskStatusAsync(int taskId, int currentUserId, string newStatus);
    Task<List<object>> GetUserTasksAsync(int userId);
    Task<List<object>> GetProjectTasksAsync(int projectId);
}