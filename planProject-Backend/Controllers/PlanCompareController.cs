using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Docnet.Core;
using Docnet.Core.Models;
using System.Net.Http.Headers;
using planProject.Data;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using planProject.Enums;



[ApiController]
[Route("api/plan")]
[Authorize]
public class PlanCompareController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAuditService _auditService;

    public PlanCompareController(
        ApplicationDbContext db,
        IWebHostEnvironment env,
        IHttpClientFactory httpClientFactory,
        IAuditService auditService)
    {
        _db = db;
        _env = env;
        _httpClientFactory = httpClientFactory;
        _auditService = auditService;
    }

   [HttpPost("{planId}/compare")]
public async Task<IActionResult> Compare(int planId, [FromQuery] int v1Id, [FromQuery] int v2Id)
{
    var v1 = await _db.PlanVersions.FirstOrDefaultAsync(v => v.Id == v1Id && v.PlanId == planId);
    var v2 = await _db.PlanVersions.FirstOrDefaultAsync(v => v.Id == v2Id && v.PlanId == planId);

    if (v1 == null || v2 == null) return NotFound("Version introuvable.");
    if (string.IsNullOrEmpty(v1.FilePath) || string.IsNullOrEmpty(v2.FilePath))
        return BadRequest("FilePath manquant sur une des versions.");

    var older = v1.VersionNumber < v2.VersionNumber ? v1 : v2;
    var newer = v1.VersionNumber < v2.VersionNumber ? v2 : v1;

    // ── Extraire userId une seule fois ────────────────────────────
    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    int? uid = userIdClaim != null ? int.Parse(userIdClaim) : null;

    // ── Vérifier le cache ─────────────────────────────────────────
    var cached = await _db.AIAnalyses
        .Where(a => a.VersionId == newer.Id && a.ComparedWithVersionId == older.Id)
        .OrderByDescending(a => a.AnalyzedAt)
        .FirstOrDefaultAsync();

    if (cached?.ComparisonResults != null)
    {
        var cachedNode = System.Text.Json.Nodes.JsonNode.Parse(cached.ComparisonResults)!.AsObject();
        cachedNode["olderVersionId"] = older.Id;
        cachedNode["newerVersionId"] = newer.Id;
        cachedNode["fromCache"] = true;

        if (uid != null)
            await _auditService.LogAsync(
                uid.Value,
                AuditAction.COMPARE.ToString(),
                "PlanVersion",
                newer.Id,
                $"Comparaison v{older.VersionNumber} vs v{newer.VersionNumber} du plan {planId}"
            );

        return Ok(cachedNode);
    }

    // ── Pas en cache → appel Python ───────────────────────────────
    var root = _env.WebRootPath;
    var pathOlder = Path.Combine(root, older.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
    var pathNewer = Path.Combine(root, newer.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    if (!System.IO.File.Exists(pathOlder) || !System.IO.File.Exists(pathNewer))
        return NotFound("Fichier PDF introuvable sur le disque.");

    byte[] imgOlderBytes, imgNewerBytes;
    try
    {
        imgOlderBytes = ConvertPdfToPng(pathOlder);
        imgNewerBytes = ConvertPdfToPng(pathNewer);
    }
    catch (Exception ex) { return StatusCode(500, $"Erreur conversion PDF: {ex.Message}"); }

    var client = _httpClientFactory.CreateClient();
    client.Timeout = TimeSpan.FromSeconds(60);

    using var form = new MultipartFormDataContent();
    var content1 = new ByteArrayContent(imgOlderBytes);
    content1.Headers.ContentType = MediaTypeHeaderValue.Parse("image/png");
    form.Add(content1, "v1", "v1.png");

    var content2 = new ByteArrayContent(imgNewerBytes);
    content2.Headers.ContentType = MediaTypeHeaderValue.Parse("image/png");
    form.Add(content2, "v2", "v2.png");

    HttpResponseMessage response;
    try { response = await client.PostAsync("http://localhost:8001/compare", form); }
    catch (Exception ex) { return StatusCode(503, $"Service Python inaccessible: {ex.Message}"); }

    if (!response.IsSuccessStatusCode) return StatusCode(500, "Erreur dans le service de comparaison.");

    var json = await response.Content.ReadAsStringAsync();

    // ── Sauvegarder en base (upsert) ──────────────────────────────
    var parsed = System.Text.Json.JsonDocument.Parse(json);
    parsed.RootElement.TryGetProperty("total", out var totalEl);
    parsed.RootElement.TryGetProperty("vlm_enabled", out var vlmEl);
    int totalChanges = totalEl.ValueKind == System.Text.Json.JsonValueKind.Number ? totalEl.GetInt32() : 0;
    bool vlmEnabled  = vlmEl.ValueKind == System.Text.Json.JsonValueKind.True;

    var existing = await _db.AIAnalyses
        .FirstOrDefaultAsync(a => a.VersionId == newer.Id && a.ComparedWithVersionId == older.Id);

    if (existing != null)
    {
        existing.ComparisonResults = json;
        existing.TotalChanges      = totalChanges;
        existing.VlmEnabled        = vlmEnabled;
        existing.AnalyzedAt        = DateTime.UtcNow;
    }
    else
    {
        await _db.AIAnalyses.AddAsync(new AIAnalysis
        {
            VersionId             = newer.Id,
            ComparedWithVersionId = older.Id,
            ComparisonResults     = json,
            TotalChanges          = totalChanges,
            VlmEnabled            = vlmEnabled,
            AnalyzedAt            = DateTime.UtcNow
        });
    }

    await _db.SaveChangesAsync();

    // ── Retourner le résultat ─────────────────────────────────────
    var result = System.Text.Json.Nodes.JsonNode.Parse(json)!.AsObject();
    result["olderVersionId"] = older.Id;
    result["newerVersionId"] = newer.Id;
    result["fromCache"]      = false;

    return Ok(result);
}

[HttpPost("{planId}/compare/contours")]
public async Task<IActionResult> CompareContours(int planId, [FromQuery] int v1Id, [FromQuery] int v2Id)
{
    var v1 = await _db.PlanVersions.FirstOrDefaultAsync(v => v.Id == v1Id && v.PlanId == planId);
    var v2 = await _db.PlanVersions.FirstOrDefaultAsync(v => v.Id == v2Id && v.PlanId == planId);

    if (v1 == null || v2 == null) return NotFound("Version introuvable.");
    if (string.IsNullOrEmpty(v1.FilePath) || string.IsNullOrEmpty(v2.FilePath))
        return BadRequest("FilePath manquant sur une des versions.");

    var older = v1.VersionNumber < v2.VersionNumber ? v1 : v2;
    var newer = v1.VersionNumber < v2.VersionNumber ? v2 : v1;

    // ── Extraire userId une seule fois ────────────────────────────
    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    int? uid = userIdClaim != null ? int.Parse(userIdClaim) : null;

    // ── Vérifier le cache (contours uniquement) ───────────────────
    var contoursCacheId = -older.Id;
    var cached = await _db.AIAnalyses
        .Where(a => a.VersionId == newer.Id && a.ComparedWithVersionId == contoursCacheId)
        .OrderByDescending(a => a.AnalyzedAt)
        .FirstOrDefaultAsync();

    if (cached?.ComparisonResults != null)
    {
        var cachedNode = System.Text.Json.Nodes.JsonNode.Parse(cached.ComparisonResults)!.AsObject();
        cachedNode["olderVersionId"] = older.Id;
        cachedNode["newerVersionId"] = newer.Id;
        cachedNode["fromCache"]      = true;

        if (uid != null)
            await _auditService.LogAsync(
                uid.Value,
                AuditAction.COMPARE.ToString(),
                "PlanVersion",
                newer.Id,
                $"Comparaison contours v{older.VersionNumber} vs v{newer.VersionNumber} du plan {planId}"
            );

        return Ok(cachedNode);
    }

    // ── Appel Python ──────────────────────────────────────────────
    var root = _env.WebRootPath;
    var pathOlder = Path.Combine(root, older.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
    var pathNewer = Path.Combine(root, newer.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    if (!System.IO.File.Exists(pathOlder) || !System.IO.File.Exists(pathNewer))
        return NotFound("Fichier PDF introuvable sur le disque.");

    byte[] imgOlderBytes, imgNewerBytes;
    try
    {
        imgOlderBytes = ConvertPdfToPng(pathOlder);
        imgNewerBytes = ConvertPdfToPng(pathNewer);
    }
    catch (Exception ex) { return StatusCode(500, $"Erreur conversion PDF: {ex.Message}"); }

    var client = _httpClientFactory.CreateClient();
    client.Timeout = TimeSpan.FromSeconds(60);

    using var form = new MultipartFormDataContent();
    var content1 = new ByteArrayContent(imgOlderBytes);
    content1.Headers.ContentType = MediaTypeHeaderValue.Parse("image/png");
    form.Add(content1, "v1", "v1.png");

    var content2 = new ByteArrayContent(imgNewerBytes);
    content2.Headers.ContentType = MediaTypeHeaderValue.Parse("image/png");
    form.Add(content2, "v2", "v2.png");

    HttpResponseMessage response;
    try { response = await client.PostAsync("http://localhost:8001/compare/contours", form); }
    catch (Exception ex) { return StatusCode(503, $"Service Python inaccessible: {ex.Message}"); }

    if (!response.IsSuccessStatusCode) return StatusCode(500, "Erreur dans le service de comparaison.");

    var json = await response.Content.ReadAsStringAsync();

    // ── Sauvegarder en base (contours-only) ──────────────────────
    var parsed = System.Text.Json.JsonDocument.Parse(json);
    parsed.RootElement.TryGetProperty("total", out var totalEl);
    int totalChanges = totalEl.ValueKind == System.Text.Json.JsonValueKind.Number ? totalEl.GetInt32() : 0;

    var existing = await _db.AIAnalyses
        .FirstOrDefaultAsync(a => a.VersionId == newer.Id && a.ComparedWithVersionId == contoursCacheId);

    if (existing != null)
    {
        existing.ComparisonResults = json;
        existing.TotalChanges      = totalChanges;
        existing.VlmEnabled        = false;
        existing.AnalyzedAt        = DateTime.UtcNow;
    }
    else
    {
        await _db.AIAnalyses.AddAsync(new AIAnalysis
        {
            VersionId             = newer.Id,
            ComparedWithVersionId = contoursCacheId,  // négatif = contours-only
            ComparisonResults     = json,
            TotalChanges          = totalChanges,
            VlmEnabled            = false,
            AnalyzedAt            = DateTime.UtcNow
        });
    }

    await _db.SaveChangesAsync();

    var result = System.Text.Json.Nodes.JsonNode.Parse(json)!.AsObject();
    result["olderVersionId"] = older.Id;
    result["newerVersionId"] = newer.Id;
    result["fromCache"]      = false;

    return Ok(result);
}
    // ── Conversion PDF → PNG via Docnet ──────────────────────────────
    private static byte[] ConvertPdfToPng(string pdfPath)
{
    var library = DocLib.Instance;
    using var docReader = library.GetDocReader(pdfPath, new PageDimensions(1920, 2716));
    using var pageReader = docReader.GetPageReader(0);

    var rawBytes = pageReader.GetImage(); // BGRA
    int width    = pageReader.GetPageWidth();
    int height   = pageReader.GetPageHeight();

    // BGRA → fond blanc + lignes noires
    using var image = SixLabors.ImageSharp.Image.LoadPixelData<SixLabors.ImageSharp.PixelFormats.Bgra32>(rawBytes, width, height);
    
    // Fond blanc
    using var result = new SixLabors.ImageSharp.Image<SixLabors.ImageSharp.PixelFormats.Rgb24>(width, height, new SixLabors.ImageSharp.PixelFormats.Rgb24(255, 255, 255));
    result.Mutate(ctx => ctx.DrawImage(image, 1f));

    using var ms = new MemoryStream();
    result.SaveAsPng(ms);
    return ms.ToArray();
}

[HttpGet("dashboard-stats")]
public async Task<IActionResult> GetDashboardStats()
{
    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (userIdClaim == null) return Unauthorized();
    int userId = int.Parse(userIdClaim);

    Console.WriteLine($">>> Tous les claims : {string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}"))}");
    Console.WriteLine($">>> userId extrait : {userIdClaim}");

    var projectIds = await _db.ProjectMembers
        .Where(pm => pm.UserId == userId)
        .Select(pm => pm.ProjectId)
        .ToListAsync();

     Console.WriteLine($">>> projectIds trouvés : {projectIds.Count}");
     
    var locationIds = await _db.Locations
        .Where(l => projectIds.Contains(l.ProjectId))
        .Select(l => l.Id)
        .ToListAsync();

    var planIds = await _db.Plans
        .Where(p => locationIds.Contains(p.LocationId))
        .Select(p => p.Id)
        .ToListAsync();

    var totalVersions = await _db.PlanVersions
        .Where(v => planIds.Contains(v.PlanId))
        .CountAsync();

    var totalComparisons = await _db.AuditLogs
        .Where(a => a.UserId == userId && a.Action == AuditAction.COMPARE.ToString())
        .CountAsync();

    var unreadNotifications = await _db.Notifications
        .Where(n => n.UserId == userId && !n.IsRead)
        .CountAsync();

    return Ok(new
    {
        totalProjects       = projectIds.Count,
        totalLocations      = locationIds.Count,
        totalPlans          = planIds.Count,
        totalVersions,
        totalComparisons,
        unreadNotifications
    });
}


[HttpGet("{planId}/versions/{versionId}/analysis")]
public async Task<IActionResult> GetAnalysis(int planId, int versionId)
{
    var version = await _db.PlanVersions
        .FirstOrDefaultAsync(v => v.Id == versionId && v.PlanId == planId);

    if (version == null) return NotFound("Version introuvable.");

    var analysis = await _db.AIAnalyses
        .Where(a => a.VersionId == versionId)
        .OrderByDescending(a => a.AnalyzedAt)
        .FirstOrDefaultAsync();

    if (analysis == null)
        return NotFound("Aucune analyse disponible pour cette version.");

    return Ok(new
    {
        analysis.Id,
        analysis.VersionId,
        analysis.ComparedWithVersionId,
        analysis.TotalChanges,
        analysis.VlmEnabled,
        analysis.AnalyzedAt,
        ComparisonResults = System.Text.Json.JsonDocument.Parse(analysis.ComparisonResults ?? "{}")
    });
}
}