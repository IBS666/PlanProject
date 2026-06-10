public interface INotificationService
{
    Task NotifyUsersAsync(List<User> users, string title, string message, NotificationType type, string entityType, int? entityId);
     
}