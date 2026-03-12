public class CreateLocationDto
{
    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public int ProjectId { get; set; }
    
    public int? ParentId { get; set; }



}