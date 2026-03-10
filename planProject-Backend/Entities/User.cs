using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("Users")]
    public class User
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("roleId")]
        public int RoleId { get; set; }

        [Required]
        [Column("name")]
        [StringLength(20)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        [StringLength(30)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column("password_hash")]
        [StringLength(100)]
        public string PasswordHash { get; set; } = string.Empty;

        [Column("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("RoleId")]
        public virtual Role Role { get; set; } = null!;

        public virtual ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
        public virtual ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();
    }
