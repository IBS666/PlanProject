using Microsoft.EntityFrameworkCore;
using planProject.Data;

namespace planProject.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;
        

        public UserService(ApplicationDbContext context)
        {
            _context = context;
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

  
        public async Task<bool> UpdateUserAsync(int id, UpdateUserDto request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            user.Name = request.Name ?? user.Name;
            user.Email = request.Email ?? user.Email;

            await _context.SaveChangesAsync();
            return true;
        }

    
        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }

      
        public async Task<string> ChangeUserRoleAsync(int id, ChangeRoleDto request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return "User not found";

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
            if (role == null) return "Role does not exist";

            user.RoleId = role.Id;
            await _context.SaveChangesAsync();

            return "User role updated successfully";
        }
    }
}
