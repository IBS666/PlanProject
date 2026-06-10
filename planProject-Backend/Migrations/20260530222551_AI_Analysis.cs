using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace planProject.Migrations
{
    /// <inheritdoc />
    public partial class AI_Analysis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "compared_with_version_id",
                table: "AI_Analysis",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "total_changes",
                table: "AI_Analysis",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "vlm_enabled",
                table: "AI_Analysis",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "compared_with_version_id",
                table: "AI_Analysis");

            migrationBuilder.DropColumn(
                name: "total_changes",
                table: "AI_Analysis");

            migrationBuilder.DropColumn(
                name: "vlm_enabled",
                table: "AI_Analysis");
        }
    }
}
