using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("Role")]
    public class Role
    {
        [Key]
        [Column("role_id")]
        public int Id { get; set; }

        [Required]
        [Column("name")]
        [StringLength(20)]
        public string Name { get; set; } = string.Empty;

        // Navigation properties
        public virtual ICollection<User> Users { get; set; } = new List<User>();
        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
