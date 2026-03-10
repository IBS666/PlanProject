using Microsoft.EntityFrameworkCore;


namespace planProject.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // DbSets
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<ProjectMember> ProjectMembers { get; set; }
        public DbSet<Plan> Plans { get; set; }
        public DbSet<PlanVersion> PlanVersions { get; set; }
        public DbSet<Annotation> Annotations { get; set; }
        public DbSet<AIAnalysis> AIAnalyses { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure RolePermission composite key
            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            // Configure relationships for RolePermission
            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure User-Role relationship
            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);


            // Configure ProjectMember relationships
            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.Project)
                .WithMany(p => p.ProjectMembers)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
                

            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.User)
                .WithMany(u => u.ProjectMembers)
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Location relationships  
            modelBuilder.Entity<Location>()
                .HasOne(p => p.Project)
                .WithMany(l => l.Locations)
                .HasForeignKey(l => l.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);  

            modelBuilder.Entity<Location>()
                .HasOne(l => l.Parent)
                .WithMany(l => l.Children)
                .HasForeignKey(l => l.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Location>()
                .HasOne(l => l.Project)
                .WithMany(p => p.Locations)
                .HasForeignKey(l => l.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);    


            // Configure PlanVersion relationships
            modelBuilder.Entity<PlanVersion>()
                .HasOne(pv => pv.Plan)
                .WithMany(p => p.PlanVersions)
                .HasForeignKey(pv => pv.PlanId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PlanVersion>()
                .HasOne(pv => pv.Creator)
                .WithMany()
                .HasForeignKey(pv => pv.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PlanVersion>()
                .HasOne(pv => pv.Validator)
                .WithMany()
                .HasForeignKey(pv => pv.ValidatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Annotation relationships
            modelBuilder.Entity<Annotation>()
                .HasOne(a => a.PlanVersion)
                .WithMany(pv => pv.Annotations)
                .HasForeignKey(a => a.VersionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Annotation>()
                .HasOne(a => a.User)
                .WithMany(u => u.Annotations)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure AIAnalysis relationship
            modelBuilder.Entity<AIAnalysis>()
                .HasOne(ai => ai.PlanVersion)
                .WithMany(pv => pv.AIAnalyses)
                .HasForeignKey(ai => ai.VersionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Notification relationship
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure AuditLog relationship
            modelBuilder.Entity<AuditLog>()
                .HasOne(al => al.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Add indexes for performance
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Project>()
                .HasIndex(p => p.Status);

            modelBuilder.Entity<Plan>()
                .HasIndex(p => p.Status);

            modelBuilder.Entity<PlanVersion>()
                .HasIndex(pv => pv.IsValidated);

            modelBuilder.Entity<Notification>()
                .HasIndex(n => n.IsRead);

            modelBuilder.Entity<AuditLog>()
                .HasIndex(al => al.CreatedAt);
        }
    }
}