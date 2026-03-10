using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("AuditLogs")]
    public class AuditLog
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Required]
        [Column("action")]
        [StringLength(20)]
        public string Action { get; set; } = string.Empty;

        [Column("entity")]
        [StringLength(20)]
        public string? Entity { get; set; }

        [Column("entity_id")]
        public int? EntityId { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
