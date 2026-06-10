public interface IAuditService
{
    Task LogAsync(int userId, string action, string entity, int? entityId, string? description);

    Task<List<object>> GetLogsAsync();
}