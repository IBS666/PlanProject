using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


    [Table("Locations")]
    public class Location
{
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("parent_id")]
        public int ParentId { get; set; }

        [Required]
        [Column("project_id")]
        public int ProjectId { get; set; }

        [Required]
        [Column("name")]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("type")]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty;

        

        // Navigation properties
        [ForeignKey("ProjectId")]
        public virtual Project Project { get; set; } = null!;

        [ForeignKey("ParentId")]
        public virtual Location? Parent { get; set; }

        public virtual ICollection<Location> Children { get; set; } = new List<Location>();


        public virtual ICollection<Plan> Plans { get; set; } = new List<Plan>();
    }