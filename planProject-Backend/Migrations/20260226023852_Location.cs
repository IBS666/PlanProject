using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace planProject.Migrations
{
    /// <inheritdoc />
    public partial class Location : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Plans_Projects_project_id",
                table: "Plans");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Users_owner_id",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Projects_owner_id",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "owner_id",
                table: "Projects");

            migrationBuilder.RenameColumn(
                name: "password",
                table: "Users",
                newName: "password_hash");

            migrationBuilder.RenameColumn(
                name: "project_id",
                table: "Plans",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_Plans_project_id",
                table: "Plans",
                newName: "IX_Plans_LocationId");

            migrationBuilder.AddColumn<string>(
                name: "role_in_project",
                table: "ProjectMembers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    parent_id = table.Column<int>(type: "integer", nullable: false),
                    project_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.id);
                    table.ForeignKey(
                        name: "FK_Locations_Locations_parent_id",
                        column: x => x.parent_id,
                        principalTable: "Locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Locations_Projects_project_id",
                        column: x => x.project_id,
                        principalTable: "Projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Locations_parent_id",
                table: "Locations",
                column: "parent_id");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_project_id",
                table: "Locations",
                column: "project_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Plans_Locations_LocationId",
                table: "Plans",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Plans_Locations_LocationId",
                table: "Plans");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropColumn(
                name: "role_in_project",
                table: "ProjectMembers");

            migrationBuilder.RenameColumn(
                name: "password_hash",
                table: "Users",
                newName: "password");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "Plans",
                newName: "project_id");

            migrationBuilder.RenameIndex(
                name: "IX_Plans_LocationId",
                table: "Plans",
                newName: "IX_Plans_project_id");

            migrationBuilder.AddColumn<int>(
                name: "owner_id",
                table: "Projects",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Projects_owner_id",
                table: "Projects",
                column: "owner_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Plans_Projects_project_id",
                table: "Plans",
                column: "project_id",
                principalTable: "Projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Users_owner_id",
                table: "Projects",
                column: "owner_id",
                principalTable: "Users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
