using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("AI_Analysis")]
    public class AIAnalysis
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("version_id")]
        public int VersionId { get; set; }

        [Column("comparison_results")]
        public string? ComparisonResults { get; set; }

        [Column("analyzedAt")]
        public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("VersionId")]
        public virtual PlanVersion PlanVersion { get; set; } = null!;
    }
