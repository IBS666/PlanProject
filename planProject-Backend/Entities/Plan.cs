using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("Plans")]
    public class Plan
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }


        [Column("current_version")]
        public int? CurrentVersion { get; set; }

        [Required]
        [Column("name")]
        [StringLength(20)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("status")]
        [StringLength(20)]
        public string Status { get; set; } = string.Empty;

        [Column("category")]
        [StringLength(20)]
        public string? Category { get; set; }

        // Navigation properties
        [ForeignKey("LocationId")]
        public virtual Location Location { get; set; } = null!;

        public virtual ICollection<PlanVersion> PlanVersions { get; set; } = new List<PlanVersion>();
    }
