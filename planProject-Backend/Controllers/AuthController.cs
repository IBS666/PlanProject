using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using planProject.Services;
using planProject.Services.Interfaces;

namespace planProject.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        private readonly IEmailService _emailService;


        public AuthController(IAuthService authService, IEmailService emailService)
        {
            _authService = authService;
            _emailService = emailService; 
        }


        [Authorize(Roles = "Admin")]
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto request)
        {
            var result = await _authService.RegisterAsync(request);

            if (result != "User registered successfully")
                return BadRequest(result);

            try
            {
                await _emailService.SendWelcomeEmailAsync(
                    request.Email,
                    request.Name,
                    request.Password  
                );
            }
            catch (Exception ex)
            {
                
                Console.WriteLine($"Email error: {ex.Message}");
            }

            return Ok(result);
    
        }


        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto request)
        {
            var token = await _authService.LoginAsync(request);

            if (token == "Invalid credentials")
                return Unauthorized(token);

            return Ok(new { token });
        }


        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _authService.ChangePasswordAsync(userId, request);

            if (result == "User not found" || result == "Current password is incorrect")
                return BadRequest(result);

            return Ok(result);
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            var result = await _authService.ForgotPasswordAsync(request.Email);

            if (result == "User not found")
                return NotFound(result);

            return Ok(result); // Pour test (normalement on envoie un email)
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto request)
        {
            var result = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);

            if (result == "Invalid or expired token" || result == "User not found")
                return BadRequest(result);

            return Ok(result);
        }
    }
}
