using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;

namespace planProject.Services
{
    public class LocationService : ILocationService
    {
        private readonly ApplicationDbContext _context;

        public LocationService(ApplicationDbContext context)
        {
            _context = context;
        }

        // CREATE LOCATION
        public async Task<Location> CreateLocationAsync(CreateLocationDto request)
        {
            var location = new Location
            {
                Name = request.Name,
                Type = request.Type,
                ProjectId = request.ProjectId,
                ParentId = request.ParentId
            };

            _context.Locations.Add(location);
            await _context.SaveChangesAsync();

            return location;
        }

        // GET LOCATION BY ID
        public async Task<Location?> GetLocationByIdAsync(int locationId)
        {
            return await _context.Locations
                .Include(l => l.Children)
                .FirstOrDefaultAsync(l => l.Id == locationId);
        }

        // GET LOCATIONS BY PROJECT
        public async Task<List<Location>> GetLocationsByProjectIdAsync(int projectId)
        {
            return await _context.Locations
                .Where(l => l.ProjectId == projectId)
                .ToListAsync();
        }

        // GET CHILDREN OF A LOCATION
        public async Task<List<Location>> GetLocationChildrensAsync(int locationId)
        {
            return await _context.Locations
                .Where(l => l.ParentId == locationId)
                .ToListAsync();
        }

        // GET TREE STRUCTURE
        public async Task<List<Location>> GetLocationTreeByProjectAsync(int projectId)
        {
            var locations = await _context.Locations
                .Where(l => l.ProjectId == projectId)
                .ToListAsync();

            var lookup = locations.ToLookup(l => l.ParentId);

            foreach (var location in locations)
            {
                location.Children = lookup[location.Id].ToList();
            }

            return lookup[null].ToList();
        }

        // DELETE LOCATION
        public async Task<bool> DeleteLocationAsync(int locationId)
        {
            var location = await _context.Locations
                .Include(l => l.Children)
                .FirstOrDefaultAsync(l => l.Id == locationId);

            if (location == null)
                return false;

            if (location.Children.Any())
                throw new Exception("Cannot delete location with children");

            _context.Locations.Remove(location);
            await _context.SaveChangesAsync();

            return true;
        }
    }
}