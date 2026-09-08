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
            migrationBuilder.InsertData(
                table: "Contacts",
                columns: new[] { "Id", "FirstName", "Surname", "DateOfBirth", "Address", "PhoneNumber", "Iban" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000001"), "Ahmed", "Ivanov", new DateOnly(1965, 10, 19), "Kirkkokatu 36, 85532 Espoo, FI", "+358001338908", "FI2816525808631930" },
                    { new Guid("00000000-0000-0000-0000-000000000002"), "Günter", "Fürst", new DateOnly(1969, 3, 14), "Löwenplatz 12, 59615 Hamburg, DE", "+49184959310", "DE59679883481367606524" },
                    { new Guid("00000000-0000-0000-0000-000000000003"), "Renée", "Röder", new DateOnly(1978, 7, 20), "Brühlstraße 84, 14207 München, DE", "+49564139537", "DE73394225258329500167" },
                    { new Guid("00000000-0000-0000-0000-000000000004"), "Marco", "Marchetti", new DateOnly(1959, 1, 12), "Lindenallee 65, 99166 Würzburg, DE", "+49184514627", "DE61077975168513199954" },
                    { new Guid("00000000-0000-0000-0000-000000000005"), "Röschen", "Röder", new DateOnly(1965, 1, 24), "Hauptstraße 62, 21226 Lübeck, DE", "+49718227824", "DE12569976736384200550" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Contacts",
                keyColumn: "Id",
                keyValues: new object[]
                {
                    new Guid("00000000-0000-0000-0000-000000000001"),
                    new Guid("00000000-0000-0000-0000-000000000002"),
                    new Guid("00000000-0000-0000-0000-000000000003"),
                    new Guid("00000000-0000-0000-0000-000000000004"),
                    new Guid("00000000-0000-0000-0000-000000000005")
                });
        }
    }
}
