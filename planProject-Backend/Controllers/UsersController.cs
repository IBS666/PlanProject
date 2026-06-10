using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;
using System.Security.Claims;

namespace planProject.Controllers
{
    [ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [Authorize(Policy = "Lire_Utilisateur")]
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    [Authorize(Policy = "Modifier_Utilisateur")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, UpdateUserDto request)
    {
        var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var success = await _userService.UpdateUserAsync(id, request, currentUserId);

        return success ? Ok("User updated successfully") : NotFound("User not found");
    }

    [Authorize(Policy = "Supprimer_Utilisateur")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var success = await _userService.DeleteUserAsync(id, currentUserId);

        return success ? Ok("User deleted successfully") : NotFound("User not found");
    }

    [Authorize(Policy = "Modifier_Utilisateur")]
    [HttpPut("{id}/role")]
    public async Task<IActionResult> ChangeUserRole(int id, ChangeRoleDto request)
    {
        var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var result = await _userService.ChangeUserRoleAsync(id, request, currentUserId);

        if (result == "User not found" || result == "Role does not exist")
            return BadRequest(result);

        return Ok(result);
    }
}
    
}