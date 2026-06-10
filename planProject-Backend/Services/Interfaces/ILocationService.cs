using planProject.Data;

namespace planProject.Services.Interfaces
{
    public interface ILocationService
    {
        Task<Location> CreateLocationAsync(CreateLocationDto request, int currentUserId);

        Task<Location?> GetLocationByIdAsync(int locationId);

        Task<List<Location>> GetLocationsByProjectIdAsync(int projectId);

        Task<List<Location>> GetLocationChildrensAsync(int locationId);

        Task<List<Location>> GetLocationTreeByProjectAsync(int projectId);

        Task<bool> DeleteLocationAsync(int locationId, int currentUserId);
    }
}