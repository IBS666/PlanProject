using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services;

namespace planProject.Controllers
{
    [ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, UpdateUserDto request)
    {
        var success = await _userService.UpdateUserAsync(id, request);
        return success ? Ok("User updated successfully") : NotFound("User not found");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var success = await _userService.DeleteUserAsync(id);
        return success ? Ok("User deleted successfully") : NotFound("User not found");
    }

    [HttpPut("{id}/role")]
    public async Task<IActionResult> ChangeUserRole(int id, ChangeRoleDto request)
    {
        var result = await _userService.ChangeUserRoleAsync(id, request);
        if (result == "User not found" || result == "Role does not exist")
            return BadRequest(result);

        return Ok(result);
    }
}
    
}