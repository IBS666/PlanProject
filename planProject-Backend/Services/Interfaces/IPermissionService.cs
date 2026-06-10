public interface IPermissionService
{
    Task<List<string>> GetUserPermissionsAsync(int userId);
}