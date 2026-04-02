using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;

namespace planProject.Services
{
    public class RoleService : IRoleService
    {
        private readonly ApplicationDbContext _context;

        public RoleService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Role>> GetAllRolesAsync()
        {
            return await _context.Roles
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .ToListAsync();
        }

        public async Task<Role?> GetRoleByIdAsync(int id)
        {
            return await _context.Roles
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<Role> CreateRoleAsync(CreateRoleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Le nom du rôle est requis.");

            if (await _context.Roles.AnyAsync(r => r.Name == dto.Name))
                throw new InvalidOperationException("Un rôle avec ce nom existe déjà.");

            var existingIds = await _context.Permissions
                .Where(p => dto.PermissionIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync();

            var invalidIds = dto.PermissionIds.Except(existingIds).ToList();
            if (invalidIds.Count > 0)
                throw new KeyNotFoundException(
                    $"Permission(s) introuvable(s) : {string.Join(", ", invalidIds)}");

            var role = new Role
            {
                Name = dto.Name,
                RolePermissions = dto.PermissionIds
                    .Select(pid => new RolePermission { PermissionId = pid })
                    .ToList()
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            await _context.Entry(role)
                .Collection(r => r.RolePermissions)
                .Query()
                .Include(rp => rp.Permission)
                .LoadAsync();

            return role;
        }

        public async Task UpdateRoleAsync(int id, UpdateRoleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Le nom du rôle est requis.");

            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new KeyNotFoundException("Rôle introuvable.");

            if (await _context.Roles.AnyAsync(r => r.Name == dto.Name && r.Id != id))
                throw new InvalidOperationException("Un autre rôle porte déjà ce nom.");

            var existingIds = await _context.Permissions
                .Where(p => dto.PermissionIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync();

            var invalidIds = dto.PermissionIds.Except(existingIds).ToList();
            if (invalidIds.Count > 0)
                throw new KeyNotFoundException(
                    $"Permission(s) introuvable(s) : {string.Join(", ", invalidIds)}");

            role.Name = dto.Name;
            _context.RolePermissions.RemoveRange(role.RolePermissions);
            role.RolePermissions = dto.PermissionIds
                .Select(pid => new RolePermission { RoleId = id, PermissionId = pid })
                .ToList();

            await _context.SaveChangesAsync();
        }

        public async Task DeleteRoleAsync(int id)
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .Include(r => r.Users)
                .FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new KeyNotFoundException("Rôle introuvable.");

            if (role.Users.Count > 0)
                throw new InvalidOperationException(
                    $"Ce rôle est assigné à {role.Users.Count} utilisateur(s). Réassignez-les d'abord.");

            _context.RolePermissions.RemoveRange(role.RolePermissions);
            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();
        }
    }
}