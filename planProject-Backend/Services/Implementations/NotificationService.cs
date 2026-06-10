using Microsoft.EntityFrameworkCore;
using planProject.Data;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task NotifyUsersAsync(List<User> users, string title, string message, NotificationType type, string entityType, int? entityId)
    {
        var notifications = users.Select(u => new Notification
        {
            UserId = u.Id,
            Name = title,
            Type = type.ToString(),
            Message = message,
            RelatedEntityType = entityType,
            RelatedEntityId = entityId,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        await _context.Notifications.AddRangeAsync(notifications);
        await _context.SaveChangesAsync();
    }

    
}