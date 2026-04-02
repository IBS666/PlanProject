using planProject.Services.Interfaces;

namespace planProject.Services
{
    public interface IRoleService
    {
        Task<List<Role>> GetAllRolesAsync();
        Task<Role?> GetRoleByIdAsync(int id);
        Task<Role> CreateRoleAsync(CreateRoleDto dto);
        Task UpdateRoleAsync(int id, UpdateRoleDto dto);
        Task DeleteRoleAsync(int id);
    }
}