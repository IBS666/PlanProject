using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("Annotations")]
    public class Annotation
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("version_id")]
        public int VersionId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("type")]
        [StringLength(20)]
        public string? Type { get; set; }

        [Column("data")]
        public string? Data { get; set; }

        [Column("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("VersionId")]
        public virtual PlanVersion PlanVersion { get; set; } = null!;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }

