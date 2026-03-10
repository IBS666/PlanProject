using Microsoft.EntityFrameworkCore;
using planProject.Data;

namespace planProject.Services
{
    public class PlanService
    {
        private readonly ApplicationDbContext _context;

        public PlanService(ApplicationDbContext context)
        {
            _context = context;
        }
   
    
    public async Task<Plan> CreatePlanAsync(CreatePlanDto request)
    {
        var plan = new Plan
        {
            Name = request.Name,
            Status = request.Status,
            Category = request.Category,
        };

        _context.Plans.Add(plan);
        await _context.SaveChangesAsync();

        return plan;
    }

}}