using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Contacts.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeedInitialContacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Seed data now comes from ContactsSeeder at application startup, which
            // validates each row through the same domain rules as a normal create,
            // instead of writing raw values straight into the database here.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
