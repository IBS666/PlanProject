namespace planProject.Services.Interfaces
{
    public interface IUserService
    {
        public  Task<List<object>> GetAllUsersAsync();

        public  Task<bool> UpdateUserAsync(int id, UpdateUserDto request,int currentUserId);

        public  Task<bool> DeleteUserAsync(int id, int currentUserId);

        public  Task<string> ChangeUserRoleAsync(int id, ChangeRoleDto request, int currentUserId);

        
    }
}