using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;

namespace planProject.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly JwtService _jwtService;
        private readonly IEmailService _emailService;

    
        public AuthService(ApplicationDbContext context, JwtService jwtService, IEmailService emailService)
        {
            _context = context;
            _jwtService = jwtService;
            _emailService = emailService;
        }

        
        public async Task<string> RegisterAsync(RegisterDto request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return "Email already exists";

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == request.Role);

            if (role == null)
                return "Invalid role";

            var user = new User
            {
                Name = request.Name,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RoleId = role.Id,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return "User registered successfully";
        }


        public async Task<string> LoginAsync(LoginDto request)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
                return "Invalid credentials";

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return "Invalid credentials";

            var token = _jwtService.GenerateToken(user);
            return token;
        }

        public async Task<string> ChangePasswordAsync(int userId, ChangePasswordDto request)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return "User not found";

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return "Current password is incorrect";

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            await _context.SaveChangesAsync();
            return "Password changed successfully";
        }

        public async Task<string> ForgotPasswordAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return "User not found";

            var token = _jwtService.GenerateResetToken(user);
            
            // Lien vers votre frontend
            var resetLink = $"http://localhost:5173/reset-password?token={token}";
            
            await _emailService.SendResetPasswordEmailAsync(email, resetLink);

            return "Reset password email sent";
        }

        public async Task<string> ResetPasswordAsync(string token, string newPassword)
        {
            // Valider le token et récupérer l'utilisateur associé
            var userId = _jwtService.ValidateResetToken(token);
            if (userId == null) return "Invalid or expired token";

            var user = await _context.Users.FindAsync(userId.Value);
            if (user == null) return "User not found";

            // Mettre à jour le mot de passe
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();

            return "Password has been reset successfully";
        }
    }
}

