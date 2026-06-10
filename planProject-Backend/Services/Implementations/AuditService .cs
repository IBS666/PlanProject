using Microsoft.EntityFrameworkCore;
using planProject.Data;


public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;

    public AuditService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(int userId, string action, string entity, int? entityId, string? description)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Description = description,
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<List<object>> GetLogsAsync()
    {
        return await _context.AuditLogs
            .Include(l => l.User)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id,
                l.Action,
                l.Entity,
                l.EntityId,
                l.Description,
                l.CreatedAt,
                UserName  = l.User != null ? l.User.Name  : "Système",
                UserEmail = l.User != null ? l.User.Email : "—"
            })
            .ToListAsync<object>();
    }
}