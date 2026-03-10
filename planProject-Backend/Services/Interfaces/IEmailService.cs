namespace planProject.Services.Interfaces
{
    public interface IEmailService
    {
        Task SendResetPasswordEmailAsync(string toEmail, string resetLink);

        Task SendWelcomeEmailAsync(string toEmail, string name, string password);
    }
}