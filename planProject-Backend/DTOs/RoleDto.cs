public class RoleDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<PermissionDto> Permissions { get; set; } = new();
    }