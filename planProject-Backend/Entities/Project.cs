using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("Projects")]
    public class Project
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("type")]
        [StringLength(20)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [Column("name")]
        [StringLength(20)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("status")]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Column("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("closed_at")]
        public DateTime? ClosedAt { get; set; }

        // Navigation properties
        public virtual ICollection<Location> Locations { get; set; } = new List<Location>();

        public virtual ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();

    }
