using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("RolePermissions")]
    public class RolePermission
    {
        [Key]
        [Column("role_id")]
        public int RoleId { get; set; }

        [Key]
        [Column("permission_id")]
        public int PermissionId { get; set; }

        // Navigation properties
        [ForeignKey("RoleId")]
        public virtual Role Role { get; set; } = null!;

        [ForeignKey("PermissionId")]
        public virtual Permission Permission { get; set; } = null!;
    }
