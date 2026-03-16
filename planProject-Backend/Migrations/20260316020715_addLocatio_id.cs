using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace planProject.Migrations
{
    /// <inheritdoc />
    public partial class addLocatio_id : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Plans_Locations_LocationId",
                table: "Plans");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "Plans",
                newName: "location_id");

            migrationBuilder.RenameIndex(
                name: "IX_Plans_LocationId",
                table: "Plans",
                newName: "IX_Plans_location_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Plans_Locations_location_id",
                table: "Plans",
                column: "location_id",
                principalTable: "Locations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Plans_Locations_location_id",
                table: "Plans");

            migrationBuilder.RenameColumn(
                name: "location_id",
                table: "Plans",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_Plans_location_id",
                table: "Plans",
                newName: "IX_Plans_LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Plans_Locations_LocationId",
                table: "Plans",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
