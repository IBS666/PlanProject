using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;

namespace planProject.Services
{
    public class PlanService : IPlanService
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public PlanService(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        public async Task<Plan> CreatePlanAsync(CreatePlanDto request, int userId)
        {
           
            var plan = new Plan
            {
                Name = request.Name,
                Status = request.Status,
                Category = request.Category,
                LocationId = request.LocationId,
                CurrentVersion = 1
            };

            await _context.Plans.AddAsync(plan);
            await _context.SaveChangesAsync();


            var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var folderPath = Path.Combine(webRootPath, "plans", plan.Id.ToString());

            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            
            var fileName = $"v1_{request.File.FileName}";
            var fullPath = Path.Combine(folderPath, fileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await request.File.CopyToAsync(stream);
            }

           
            var version = new PlanVersion
            {
                PlanId = plan.Id,
                VersionNumber = 1,
                FilePath = $"/plans/{plan.Id}/{fileName}",
                FileSize = request.File.Length,
                FileType = request.File.ContentType,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            await _context.PlanVersions.AddAsync(version);

            await _context.SaveChangesAsync();

            return plan;
        }

    
        public async Task<Plan?> GetPlanByIdAsync(int planId)
        {
            return await _context.Plans
                .Include(p => p.PlanVersions)
                .FirstOrDefaultAsync(p => p.Id == planId);
        }

        
        public async Task<List<Plan>> GetPlansByLocationAsync(int locationId)
        {
            return await _context.Plans
                .Where(p => p.LocationId == locationId)
                .Include(p => p.PlanVersions)
                .ToListAsync();
        }

        
        public async Task<bool> DeletePlanAsync(int planId)
        {
            var plan = await _context.Plans
                .FirstOrDefaultAsync(p => p.Id == planId);

            if (plan == null)
                return false;

            _context.Plans.Remove(plan);

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<LocationWithPlansDto>> GetLocationsWithPlansAsync()
        {
            return await _context.Locations
                .Select(l => new LocationWithPlansDto
                {
                    LocationId = l.Id,
                    HasPlans = l.Plans.Any()
                })
                .ToListAsync();
        }

        public async Task<int> CountPlansAsync()
        {
            return await _context.Plans.CountAsync();
        }

        public async Task<PlanVersion> AddVersionAsync(int planId, IFormFile file, int userId, string? comment = null)
        {
            var plan = await _context.Plans
                .Include(p => p.PlanVersions)
                .FirstOrDefaultAsync(p => p.Id == planId);

            if (plan == null)
                throw new Exception("Plan introuvable");

            var newVersionNumber = plan.PlanVersions.Any()
                ? plan.PlanVersions.Max(v => v.VersionNumber) + 1
                : 1;

            var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var folderPath = Path.Combine(webRootPath, "plans", plan.Id.ToString());

            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            var fileName = $"v{newVersionNumber}_{file.FileName}";
            var fullPath = Path.Combine(folderPath, fileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var version = new PlanVersion
            {
                PlanId = plan.Id,
                VersionNumber = newVersionNumber,
                FilePath = $"/plans/{plan.Id}/{fileName}",
                FileSize = file.Length,
                FileType = file.ContentType,
                Comment = comment, 
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            plan.CurrentVersion = newVersionNumber;

            await _context.PlanVersions.AddAsync(version);
            await _context.SaveChangesAsync();

            return version;
        }       
    }
}