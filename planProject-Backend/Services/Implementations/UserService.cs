using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;
using planProject.Enums;

namespace planProject.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;
        
        private readonly IAuditService _auditService;

        public UserService(ApplicationDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

     
        public async Task<List<object>> GetAllUsersAsync()
        {
            return await _context.Users
                .Include(u => u.Role)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    Role = u.Role.Name
                })
                .ToListAsync<object>();
        }

  
        public async Task<bool> UpdateUserAsync(int id, UpdateUserDto request,int currentUserId)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            user.Name = request.Name ?? user.Name;
            user.Email = request.Email ?? user.Email;

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(currentUserId,AuditAction.UPDATE.ToString(),"User",user.Id,$"Utilisateur mis à jour : {user.Email}");
            return true;
        }

    
        public async Task<bool> DeleteUserAsync(int id, int currentUserId)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            await _auditService.LogAsync(currentUserId,AuditAction.DELETE.ToString(),"User",user.Id,$"Utilisateur supprimé : {user.Email}");
            return true;
        }

      
        public async Task<string> ChangeUserRoleAsync(int id, ChangeRoleDto request, int currentUserId)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return "User not found";

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
            if (role == null) return "Role does not exist";

            user.RoleId = role.Id;
            await _context.SaveChangesAsync();
            await _auditService.LogAsync(currentUserId,AuditAction.UPDATE.ToString(),"User",user.Id,$"Rôle de l'utilisateur mis à jour : {user.Email} -> {role.Name}");

            return "User role updated successfully";
        }
    }
}
