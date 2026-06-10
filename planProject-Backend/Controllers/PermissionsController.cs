using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using planProject.Data;

[Route("api/[controller]")]
[ApiController]
public class PermissionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PermissionsController(ApplicationDbContext context)
    {
        _context = context;
    }
    
    [Authorize(Policy = "Lire_Permission")]
    [HttpGet]
    
    public async Task<IActionResult> GetAll()
    {
        var permissions = await _context.Permissions
            .Select(p => new
            {
                p.Id,
                p.Name
            })
            .ToListAsync();

        return Ok(permissions);
    }
    
}