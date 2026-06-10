public class CreateTaskDto
{
    public int     ProjectId   { get; set; }
    public int?    AssignedTo  { get; set; }
    public string  Title       { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Priority    { get; set; }
    public DateTime? DueDate   { get; set; }
}