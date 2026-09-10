using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Contacts.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContactListOrderingIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Contacts_Surname_FirstName_Id",
                table: "Contacts",
                columns: new[] { "Surname", "FirstName", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Contacts_Surname_FirstName_Id",
                table: "Contacts");
        }
    }
}
