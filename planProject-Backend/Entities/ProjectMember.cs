using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("ProjectMembers")]
    public class ProjectMember
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("project_id")]
        public int ProjectId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("role_in_project")]
        [StringLength(20)]
        public string RoleInProject { get; set; } = string.Empty;

        [Column("joinedAt")]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("ProjectId")]
        public virtual Project Project { get; set; } = null!;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
