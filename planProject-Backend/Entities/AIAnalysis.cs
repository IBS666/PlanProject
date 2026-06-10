using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("AI_Analysis")]
public class AIAnalysis
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("version_id")]         // la version APRÈS (nouvelle)
    public int VersionId { get; set; }

    [Column("compared_with_version_id")]  // ← NOUVEAU : la version AVANT
    public int? ComparedWithVersionId { get; set; }

    [Column("comparison_results")]
    public string? ComparisonResults { get; set; }

    [Column("total_changes")]      // ← NOUVEAU : nombre de changements détectés
    public int? TotalChanges { get; set; }

    [Column("vlm_enabled")]        // ← NOUVEAU : VLM ou CV-only ?
    public bool VlmEnabled { get; set; } = false;

    [Column("analyzedAt")]
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("VersionId")]
    public virtual PlanVersion PlanVersion { get; set; } = null!;
}
    
