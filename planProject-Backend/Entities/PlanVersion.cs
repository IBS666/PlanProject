using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("PlanVersions")]
    public class PlanVersion
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("created_by")]
        public int CreatedBy { get; set; }

        [Column("plan_id")]
        public int PlanId { get; set; }

        [Column("validated_by")]
        public int? ValidatedBy { get; set; }

        [Column("file_path")]
        [StringLength(50)]
        public string? FilePath { get; set; }

        [Column("file_type")]
        [StringLength(20)]
        public string? FileType { get; set; }

        [Column("file_size")]
        public long? FileSize { get; set; }

        [Column("version_number")]
        public int VersionNumber { get; set; }

        [Column("comment")]
        public string? Comment { get; set; }

        [Column("is_validated")]
        public bool IsValidated { get; set; } = false;

        [Column("validated_at")]
        public DateTime? ValidatedAt { get; set; }

        [Column("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("PlanId")]
        public virtual Plan Plan { get; set; } = null!;

        [ForeignKey("CreatedBy")]
        public virtual User Creator { get; set; } = null!;

        [ForeignKey("ValidatedBy")]
        public virtual User? Validator { get; set; }

        public virtual ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();
        public virtual ICollection<AIAnalysis> AIAnalyses { get; set; } = new List<AIAnalysis>();
    }
