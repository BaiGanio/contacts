using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Data;

public static class ContactsDatabaseInitializer
{
    public static async Task InitializeAsync(
        ContactsDbContext dbContext, IConfiguration configuration, string baseDirectory, ILogger logger)
    {
        if (configuration.GetValue<bool>("Database:ApplyMigrations"))
        {
            await dbContext.Database.MigrateAsync();
        }

        if (!configuration.GetValue<bool>("Seed:Enabled"))
        {
            return;
        }

        var csvPath = configuration["Seed:CsvPath"];
        if (string.IsNullOrWhiteSpace(csvPath))
        {
            throw new InvalidOperationException("Seed:CsvPath is required when Seed:Enabled is true.");
        }

        await ContactsSeeder.SeedFromCsvAsync(
            dbContext, Path.GetFullPath(csvPath, baseDirectory), logger);
    }
}
