using System.Globalization;
using Contacts.Api.Contacts;
using Contacts.Domain;
using CsvHelper;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Data;

public static class ContactsSeeder
{
    public static async Task SeedFromCsvAsync(ContactsDbContext dbContext, string csvFilePath, ILogger logger)
    {
        if (await dbContext.Contacts.AnyAsync())
        {
            return;
        }

        using var reader = new StreamReader(csvFilePath);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        csv.Read();
        csv.ReadHeader();

        var contacts = new List<Contact>();
        var skipped = 0;
        var row = 1;

        while (csv.Read())
        {
            row++;
            try
            {
                contacts.Add(ContactCsvRow.Parse(name => csv.GetField(name)));
            }
            catch (Exception ex) when (ex is ArgumentException or FormatException)
            {
                skipped++;
                logger.LogWarning("Seed row {Row} skipped: {Message}", row, ex.Message);
            }
        }

        dbContext.Contacts.AddRange(contacts);
        await dbContext.SaveChangesAsync();

        logger.LogInformation(
            "Seeded {InsertedCount} contacts from {CsvFilePath} ({SkippedCount} rows skipped).",
            contacts.Count, csvFilePath, skipped);
    }
}
