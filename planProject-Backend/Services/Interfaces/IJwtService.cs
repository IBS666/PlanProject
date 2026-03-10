namespace planProject.Services
{
    public interface IJwtService
    {
        string GenerateToken(User user);

        int? ValidateToken(string token);

        string? GetUserRoleFromToken(string token);

        
    }
}