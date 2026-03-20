public interface IPlanService
{
    Task<Plan> CreatePlanAsync(CreatePlanDto request, int userId);

    Task<Plan?> GetPlanByIdAsync(int planId);

    Task<List<Plan>> GetPlansByLocationAsync(int locationId);

    Task<bool> DeletePlanAsync(int planId);

    Task<List<LocationWithPlansDto>> GetLocationsWithPlansAsync();

    Task<int> CountPlansAsync();
}