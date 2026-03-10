namespace planProject.Services
{
    public interface IUserService
    {
        public  Task<List<object>> GetAllUsersAsync();

        public  Task<bool> UpdateUserAsync(int id, UpdateUserDto request);

        public  Task<bool> DeleteUserAsync(int id);

        public  Task<string> ChangeUserRoleAsync(int id, ChangeRoleDto request);

        
    }
}