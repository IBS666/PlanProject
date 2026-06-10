using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace planProject.Migrations
{
    /// <inheritdoc />
    public partial class AddAIAnalysisUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AI_Analysis_version_id",
                table: "AI_Analysis");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Analysis_version_id_compared_with_version_id",
                table: "AI_Analysis",
                columns: new[] { "version_id", "compared_with_version_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AI_Analysis_version_id_compared_with_version_id",
                table: "AI_Analysis");

            migrationBuilder.CreateIndex(
                name: "IX_AI_Analysis_version_id",
                table: "AI_Analysis",
                column: "version_id");
        }
    }
}
