public class CreatePlanDto
{
    public string Name { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? Category { get; set; }

    public int LocationId { get; set; }

    public IFormFile File { get; set; } = null!;
}