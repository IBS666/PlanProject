using Microsoft.EntityFrameworkCore;
using planProject.Data;
using planProject.Enums;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;


namespace planProject.Services
{
    public class PlanService : IPlanService
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IAuditService _auditService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly INotificationService _notificationService;

        public PlanService(ApplicationDbContext context, IWebHostEnvironment env, IAuditService auditService, INotificationService notificationService, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _env = env;
            _auditService = auditService;
            _notificationService = notificationService;
            _httpClientFactory = httpClientFactory;
        }

        //  Helper pour notification

        private async Task<int?> GetProjectIdFromLocationAsync(int locationId)
        {
            return await _context.Locations
                .Where(l => l.Id == locationId)
                .Select(l => (int?)l.ProjectId)
                .FirstOrDefaultAsync();
        }

        private async Task<List<User>> GetAllProjectMembersExceptAsync(int projectId, int excludeUserId)
        {
            return await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId && pm.UserId != excludeUserId)
                .Include(pm => pm.User)
                .Select(pm => pm.User)
                .ToListAsync();
        }

        // Méthodes

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
            await _auditService.LogAsync(userId,AuditAction.CREATE.ToString(),"Plan",plan.Id,$"Nouveau plan créé : {plan.Name}");

            var projectId = await GetProjectIdFromLocationAsync(request.LocationId);
            if (projectId.HasValue)
            {
                var members = await GetAllProjectMembersExceptAsync(projectId.Value, userId);
                if (members.Any())
                {
                    await _notificationService.NotifyUsersAsync(
                        members,
                        "Nouveau plan ",
                        $"Un nouveau plan \"{plan.Name}\" a été importé.",
                        NotificationType.PlanImporte,
                        "Plan",
                        plan.Id
                    );
                }
            }

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

        
        public async Task<bool> DeletePlanAsync(int planId , int currentUserId)
        {
            var plan = await _context.Plans
                .Include(p => p.Location)
                .FirstOrDefaultAsync(p => p.Id == planId);

            if (plan == null)
                return false;
            var members = await GetAllProjectMembersExceptAsync(plan.Location.ProjectId, currentUserId);
            _context.Plans.Remove(plan);

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(currentUserId,AuditAction.DELETE.ToString(),"Plan",plan.Id,$"Suppression du plan '{plan.Name}'");  
            if (members.Any())
            {
                await _notificationService.NotifyUsersAsync(
                    members,
                    "Plan supprimé",
                    $"Le plan \"{plan.Name}\" a été supprimé.",
                    NotificationType.PlanSupprime,
                    "Plan",
                    plan.Id
                );
            }                                

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

        public async Task<int> GetMyPlansCountAsync(int userId)
{
    return await _context.Plans
        .Include(p => p.Location)
            .ThenInclude(l => l.Project)
                .ThenInclude(proj => proj.ProjectMembers)
        .Where(p => p.Location.Project.ProjectMembers
            .Any(m => m.UserId == userId))
        .CountAsync();
}

public async Task<int> GetMyVersionsCountAsync(int userId)
{
    return await _context.PlanVersions
        .Include(v => v.Plan)
            .ThenInclude(p => p.Location)
                .ThenInclude(l => l.Project)
                    .ThenInclude(proj => proj.ProjectMembers)
        .Where(v => v.Plan.Location.Project.ProjectMembers
            .Any(m => m.UserId == userId))
        .CountAsync();
}

        public async Task<PlanVersion> AddVersionAsync(int planId, IFormFile file, int userId, string? comment = null)
        {
            var userName = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var plan = await _context.Plans
                .Include(p => p.PlanVersions)
                .Include(p => p.Location)
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

            await _auditService.LogAsync(userId,AuditAction.CREATE.ToString(),"PlanVersion",version.Id,$"Nouvelle version de plan créée : {version.VersionNumber} par {userName}");

             var members = await GetAllProjectMembersExceptAsync(plan.Location.ProjectId, userId);
            // ── Comparaison automatique avec la version précédente ──────────────
        var previousVersion = plan.PlanVersions
            .Where(v => v.VersionNumber == newVersionNumber - 1)
            .FirstOrDefault();

        if (previousVersion != null)
        {
            await RunAutoCompareAndNotifyAsync(
                plan, previousVersion, version, userId, members);
        }
        else
        {
            // Pas de version précédente → juste la notification standard
            if (members.Any())
            {
                await _notificationService.NotifyUsersAsync(
                    members,
                    "Nouvelle version",
                    $"Une nouvelle version (v{newVersionNumber}) du plan \"{plan.Name}\" a été créée.",
                    NotificationType.NouvelleVersion,
                    "PlanVersion",
                    version.Id
                );
            }
        }

        return version;
        }  

        private async Task RunAutoCompareAndNotifyAsync(
    Plan plan,
    PlanVersion olderVersion,
    PlanVersion newerVersion,
    int uploadedByUserId,
    List<User> members)
{
    var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
    var pathOlder = Path.Combine(webRootPath, olderVersion.FilePath!.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
    var pathNewer = Path.Combine(webRootPath, newerVersion.FilePath!.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    if (!File.Exists(pathOlder) || !File.Exists(pathNewer))
    {
        // Fichiers manquants : notif standard quand même
        await _notificationService.NotifyUsersAsync(
            members,
            "Nouvelle version",
            $"Une nouvelle version (v{newerVersion.VersionNumber}) du plan \"{plan.Name}\" a été créée.",
            NotificationType.NouvelleVersion,
            "PlanVersion",
            newerVersion.Id
        );
        return;
    }

    string? comparisonJson = null;
    int totalChanges = 0;
    bool vlmEnabled = false;

    try
    {
        // Convertir PDF → PNG (réutilise la même logique que PlanCompareController)
        var imgOlderBytes = ConvertPdfToPng(pathOlder);
        var imgNewerBytes = ConvertPdfToPng(pathNewer);

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(120);

        using var form = new MultipartFormDataContent();

        var c1 = new ByteArrayContent(imgOlderBytes);
        c1.Headers.ContentType = System.Net.Http.Headers.MediaTypeHeaderValue.Parse("image/png");
        form.Add(c1, "v1", "v1.png");

        var c2 = new ByteArrayContent(imgNewerBytes);
        c2.Headers.ContentType = System.Net.Http.Headers.MediaTypeHeaderValue.Parse("image/png");
        form.Add(c2, "v2", "v2.png");

        var response = await client.PostAsync("http://localhost:8001/compare", form);

        if (response.IsSuccessStatusCode)
        {
            comparisonJson = await response.Content.ReadAsStringAsync();

            // Extraire total et vlm_enabled du JSON
            var parsed = System.Text.Json.JsonDocument.Parse(comparisonJson);
            parsed.RootElement.TryGetProperty("total", out var totalEl);
            parsed.RootElement.TryGetProperty("vlm_enabled", out var vlmEl);
            totalChanges = totalEl.ValueKind == System.Text.Json.JsonValueKind.Number ? totalEl.GetInt32() : 0;
            vlmEnabled = vlmEl.ValueKind == System.Text.Json.JsonValueKind.True;
        }
    }
    catch (Exception ex)
    {
        // Le service Python est down → on continue sans comparaison
        Console.WriteLine($"[AutoCompare] Erreur appel Python: {ex.Message}");
    }

    // ── Sauvegarder dans AIAnalysis ────────────────────────────────
    if (comparisonJson != null)
    {
        var analysis = new AIAnalysis
        {
            VersionId = newerVersion.Id,
            ComparedWithVersionId = olderVersion.Id,
            ComparisonResults = comparisonJson,
            TotalChanges = totalChanges,
            VlmEnabled = vlmEnabled,
            AnalyzedAt = DateTime.UtcNow
        };
        await _context.AIAnalyses.AddAsync(analysis);
        await _context.SaveChangesAsync();
    }

    // ── Notification enrichie avec le résultat ─────────────────────
    if (members.Any())
    {
        var changesSummary = totalChanges > 0
            ? $" {totalChanges} différence(s) détectée(s) par rapport à la version précédente."
            : " Aucune différence détectée automatiquement.";

        await _notificationService.NotifyUsersAsync(
            members,
            "Nouvelle version analysée",
            $"Une nouvelle version (v{newerVersion.VersionNumber}) du plan \"{plan.Name}\" a été créée.{changesSummary}",
            NotificationType.NouvelleVersion,
            "PlanVersion",
            newerVersion.Id
        );
    }
}

// Copie exacte de la méthode dans PlanCompareController
private static byte[] ConvertPdfToPng(string pdfPath)
{
    var library = Docnet.Core.DocLib.Instance;
    using var docReader = library.GetDocReader(pdfPath, new Docnet.Core.Models.PageDimensions(1920, 2716));
    using var pageReader = docReader.GetPageReader(0);

    var rawBytes = pageReader.GetImage();
    int width = pageReader.GetPageWidth();
    int height = pageReader.GetPageHeight();

    using var image = SixLabors.ImageSharp.Image
        .LoadPixelData<SixLabors.ImageSharp.PixelFormats.Bgra32>(rawBytes, width, height);

    using var result = new SixLabors.ImageSharp.Image<SixLabors.ImageSharp.PixelFormats.Rgb24>(
        width, height, new SixLabors.ImageSharp.PixelFormats.Rgb24(255, 255, 255));

    result.Mutate(ctx => ctx.DrawImage(image, 1f));

    using var ms = new MemoryStream();
    result.SaveAsPng(ms);
    return ms.ToArray();
}

        public async Task<bool> DeleteVersionAsync(int versionId, int userId)
{
    var version = await _context.PlanVersions
        .Include(v => v.Plan)
            .ThenInclude(p => p.PlanVersions)
        .Include(v => v.Plan)
            .ThenInclude(p => p.Location) // 👈 Fix Bug 1: include Location
        .FirstOrDefaultAsync(v => v.Id == versionId);

    if (version == null)
        return false;

    // Cache what we need BEFORE removal (Fix Bug 2)
    var plan = version.Plan;
    var planName = plan.Name;
    var versionNumber = version.VersionNumber;
    var projectId = plan.Location.ProjectId;

    // Delete physical file
    var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
    var fullPath = Path.Combine(webRootPath, version.FilePath!.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
    if (System.IO.File.Exists(fullPath))
        System.IO.File.Delete(fullPath);

    _context.PlanVersions.Remove(version);
    await _context.SaveChangesAsync();

    // Recalculate CurrentVersion
    var remaining = await _context.PlanVersions
        .Where(v => v.PlanId == plan.Id)
        .ToListAsync();

    plan.CurrentVersion = remaining.Any() ? remaining.Max(v => v.VersionNumber) : 0;

    var members = await GetAllProjectMembersExceptAsync(projectId, userId); // 👈 uses cached projectId

    await _context.SaveChangesAsync();

    await _auditService.LogAsync(
        userId,
        AuditAction.DELETE.ToString(),
        "PlanVersion",
        versionId,
        $"Suppression version {versionNumber} du plan '{planName}'" // 👈 uses cached values
    );

    if (members.Any())
    {
        await _notificationService.NotifyUsersAsync(
            members,
            "Version supprimée",
            $"La version v{versionNumber} du plan \"{planName}\" a été supprimée.",
            NotificationType.PlanSupprime,
            "PlanVersion",
            versionId
        );
    }

    return true;
}
public async Task<Dictionary<string, int>> GetMyPlansByCategoryAsync(int userId)
{
    var plans = await _context.Plans
        .Include(p => p.Location)
            .ThenInclude(l => l.Project)
                .ThenInclude(proj => proj.ProjectMembers)
        .Where(p => p.Location.Project.ProjectMembers
            .Any(m => m.UserId == userId))
        .ToListAsync();

    return plans
        .GroupBy(p => p.Category ?? "Autre")
        .ToDictionary(g => g.Key, g => g.Count());
}
    }
}