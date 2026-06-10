using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Enums;
using planProject.Services.Interfaces;

namespace planProject.Services
{
    public class ProjectTaskService : IProjectTaskService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuditService _auditService;
        private readonly INotificationService _notificationService;

        public ProjectTaskService(ApplicationDbContext context, IAuditService auditService, INotificationService notificationService)
        {
            _context = context;
            _auditService = auditService;
            _notificationService = notificationService;
        }

        public async Task<ProjectTask> CreateTaskAsync(CreateTaskDto request, int creatorId)
        {
            var task = new ProjectTask
            {
                ProjectId   = request.ProjectId,
                CreatedBy   = creatorId,
                AssignedTo  = request.AssignedTo,
                Title       = request.Title,
                Description = request.Description,
                Status      = "todo",
                Priority    = request.Priority ?? "medium",
                DueDate     = request.DueDate,
                CreatedAt   = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            if (request.AssignedTo.HasValue)
            {
                var assignee = await _context.Users.FindAsync(request.AssignedTo.Value);
                if (assignee != null)
                    await _notificationService.NotifyUsersAsync(
                        new List<User> { assignee },
                        "Nouvelle tâche assignée",
                        $"La tâche \"{task.Title}\" vous a été assignée.",
                        NotificationType.TaskAssignee,
                        "Task", task.Id
                    );
            }

            await _auditService.LogAsync(creatorId, AuditAction.CREATE.ToString(), "Task", task.Id,
                $"Tâche créée : {task.Title}");

            return task;
        }

        public async Task<string> UpdateTaskAsync(int taskId, int currentUserId, UpdateTaskDto request)
        {
            var task = await _context.Tasks.FindAsync(taskId);
            if (task == null)
                return "Task not found";

            var previousAssignee = task.AssignedTo;

            task.Title       = request.Title       ?? task.Title;
            task.Description = request.Description ?? task.Description;
            task.Status      = request.Status      ?? task.Status;
            task.Priority    = request.Priority    ?? task.Priority;
            task.DueDate     = request.DueDate     ?? task.DueDate;
            task.AssignedTo  = request.AssignedTo  ?? task.AssignedTo;

            await _context.SaveChangesAsync();

            if (request.AssignedTo.HasValue && request.AssignedTo != previousAssignee)
            {
                var newAssignee = await _context.Users.FindAsync(request.AssignedTo.Value);
                if (newAssignee != null)
                    await _notificationService.NotifyUsersAsync(
                        new List<User> { newAssignee },
                        "Tâche réassignée",
                        $"La tâche \"{task.Title}\" vous a été assignée.",
                        NotificationType.TaskAssignee,
                        "Task", task.Id
                    );
            }

            await _auditService.LogAsync(currentUserId, AuditAction.UPDATE.ToString(), "Task", task.Id,
                $"Tâche mise à jour : {task.Title}");

            return "Task updated successfully";
        }

        public async Task<string> DeleteTaskAsync(int taskId, int currentUserId)
        {
            var task = await _context.Tasks.FindAsync(taskId);
            if (task == null)
                return "Task not found";

            if (task.AssignedTo.HasValue)
            {
                var assignee = await _context.Users.FindAsync(task.AssignedTo.Value);
                if (assignee != null)
                    await _notificationService.NotifyUsersAsync(
                        new List<User> { assignee },
                        "Tâche supprimée",
                        $"La tâche \"{task.Title}\" a été supprimée.",
                        NotificationType.TaskSupprimee,
                        "Task", task.Id
                    );
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(currentUserId, AuditAction.DELETE.ToString(), "Task", task.Id,
                $"Tâche supprimée : {task.Title}");

            return "Task deleted successfully";
        }

        public async Task<string> UpdateTaskStatusAsync(int taskId, int currentUserId, string newStatus)
        {
            var task = await _context.Tasks
                .Include(t => t.Creator)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
                return "Task not found";

            task.Status = newStatus;
            await _context.SaveChangesAsync();

            if (task.CreatedBy != currentUserId)
                await _notificationService.NotifyUsersAsync(
                    new List<User> { task.Creator },
                    "Statut de tâche modifié",
                    $"La tâche \"{task.Title}\" est maintenant : {newStatus}.",
                    NotificationType.TaskStatutModifie,
                    "Task", task.Id
                );

            await _auditService.LogAsync(currentUserId, AuditAction.UPDATE.ToString(), "Task", task.Id,
                $"Statut changé → {newStatus} : {task.Title}");

            return "Task status updated successfully";
        }

        public async Task<List<object>> GetUserTasksAsync(int userId)
        {
            return await _context.Tasks
                .Where(t => t.AssignedTo == userId)
                .Include(t => t.Project)
                .Include(t => t.Creator)
                .OrderBy(t => t.DueDate)
                .Select(t => (object)new
                {
                    t.Id,
                    t.Title,
                    t.Status,
                    t.Priority,
                    t.DueDate,
                    Project = new { t.Project.Id, t.Project.Name },
                    Creator = new { t.Creator.Id, t.Creator.Name }
                })
                .ToListAsync();
        }

        public async Task<List<object>> GetProjectTasksAsync(int projectId)
        {
            return await _context.Tasks
                .Where(t => t.ProjectId == projectId)
                .Include(t => t.Creator)
                .Include(t => t.Assignee)
                .OrderBy(t => t.DueDate)
                .Select(t => (object)new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Status,
                    t.Priority,
                    t.DueDate,
                    t.CreatedAt,
                    Creator  = new { t.Creator.Id, t.Creator.Name, t.Creator.Email },
                    Assignee = t.Assignee == null ? null : new { t.Assignee.Id, t.Assignee.Name, t.Assignee.Email }
                })
                .ToListAsync();
        }
    }
}