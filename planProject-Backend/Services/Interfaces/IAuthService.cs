namespace planProject.Services
{
    public interface IAuthService
    {
        Task<string> RegisterAsync(RegisterDto request);

        Task<string> LoginAsync(LoginDto request);

        Task<string> ChangePasswordAsync(int userId, ChangePasswordDto request);

        Task<string> ResetPasswordAsync(string token, string newPassword);

        Task<string> ForgotPasswordAsync(string email);

    }
}