using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;

public class PermissionService : IPermissionService
{
    private readonly ApplicationDbContext _context;

    public PermissionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<string>> GetUserPermissionsAsync(int userId)
    {
        var permissions = await _context.RolePermissions
            .Where(rp => rp.Role.Users.Any(u => u.Id == userId))
            .Select(rp => rp.Permission.Name)
            .Distinct()
            .ToListAsync();

        return permissions;
    }

    public async Task<List<Permission>> GetAllPermissionsAsync()
    {
        return await _context.Permissions.ToListAsync();
    }
}