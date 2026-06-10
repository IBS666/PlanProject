public interface IPlanService
{
    Task<Plan> CreatePlanAsync(CreatePlanDto request, int userId);

    Task<Plan?> GetPlanByIdAsync(int planId);

    Task<List<Plan>> GetPlansByLocationAsync(int locationId);

    Task<bool> DeletePlanAsync(int planId, int currentUserId);

    Task<List<LocationWithPlansDto>> GetLocationsWithPlansAsync();

    Task<int> CountPlansAsync();

    Task<PlanVersion> AddVersionAsync(int planId, IFormFile file, int userId, string? comment = null);

    Task<bool> DeleteVersionAsync(int versionId, int currentUserId);

    Task<int> GetMyPlansCountAsync(int userId);
    Task<int> GetMyVersionsCountAsync(int userId);

    Task<Dictionary<string, int>> GetMyPlansByCategoryAsync(int userId);
}