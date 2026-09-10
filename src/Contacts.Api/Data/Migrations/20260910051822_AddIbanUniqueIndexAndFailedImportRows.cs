using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Contacts.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIbanUniqueIndexAndFailedImportRows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FailedImportRows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RowHash = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    LatestRowNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    RawRow = table.Column<string>(type: "TEXT", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: false),
                    FirstSeenAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastSeenAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Attempts = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FailedImportRows", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_Iban",
                table: "Contacts",
                column: "Iban",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FailedImportRows_RowHash",
                table: "FailedImportRows",
                column: "RowHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FailedImportRows");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_Iban",
                table: "Contacts");
        }
    }
}
