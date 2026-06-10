using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Services.Interfaces;
using planProject.Enums;

namespace planProject.Services
{
    public class LocationService : ILocationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuditService _auditService;
        private readonly INotificationService _notificationService;

        public LocationService(ApplicationDbContext context, IAuditService auditService, INotificationService notificationService)
        {
            _context = context;
            _auditService = auditService;
            _notificationService = notificationService;
        }

        
        public async Task<Location> CreateLocationAsync(CreateLocationDto request, int currentUserId)
        {
            var location = new Location
            {
                Name = request.Name,
                Type = request.Type,
                ProjectId = request.ProjectId,
                ParentId = request.ParentId
            };

            var allUsersexceptCurrent = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == request.ProjectId && pm.UserId != currentUserId)
                .Select(pm => pm.User)
                .ToListAsync();
            
            var projectName = await _context.Projects
                .Where(p => p.Id == request.ProjectId)
                .Select(p => p.Name)
                .FirstOrDefaultAsync();
             

            _context.Locations.Add(location);
            await _context.SaveChangesAsync();
            await _notificationService.NotifyUsersAsync(allUsersexceptCurrent, "Nouvelle localisation", $"Une nouvelle localisation {location.Name} a été créée dans le projet {projectName}.", NotificationType.LocalisationCree, "Location", location.Id);
            await _auditService.LogAsync(currentUserId,AuditAction.CREATE.ToString(),"Location",location.Id,$"Nouvelle localisation créée : {location.Name}");

            return location;
        }

      
        public async Task<Location?> GetLocationByIdAsync(int locationId)
        {
            return await _context.Locations
                .Include(l => l.Children)
                .FirstOrDefaultAsync(l => l.Id == locationId);
        }

        
        public async Task<List<Location>> GetLocationsByProjectIdAsync(int projectId)
        {
            return await _context.Locations
                .Where(l => l.ProjectId == projectId)
                .ToListAsync();
        }

        
        public async Task<List<Location>> GetLocationChildrensAsync(int locationId)
        {
            return await _context.Locations
                .Where(l => l.ParentId == locationId)
                .ToListAsync();
        }

        
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

       
        public async Task<bool> DeleteLocationAsync(int locationId, int currentUserId)
        {
            var location = await _context.Locations
                .Include(l => l.Children)
                .FirstOrDefaultAsync(l => l.Id == locationId);

            if (location == null)
                return false;

            if (location.Children.Any())
                throw new Exception("Cannot delete location with children");

                var allUsersExceptCurrent = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == location.ProjectId && pm.UserId != currentUserId)
                .Select(pm => pm.User)
                .ToListAsync();

                var projectName = await _context.Projects
                .Where(p => p.Id == location.ProjectId)
                .Select(p => p.Name)
                .FirstOrDefaultAsync();


            _context.Locations.Remove(location);
            await _context.SaveChangesAsync();
            await _notificationService.NotifyUsersAsync(allUsersExceptCurrent, "Localisation supprimée", $"La localisation {location.Name} a été supprimée du projet {projectName}.", NotificationType.LocalisationSupprime, "Location", location.Id);
            await _auditService.LogAsync(currentUserId,AuditAction.DELETE.ToString(),"Location",location.Id,$"Localisation supprimée : {location.Name}");

            return true;
        }
    }
}