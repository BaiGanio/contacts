using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Contacts.Api.Data;

public sealed class ContactsDbContextFactory : IDesignTimeDbContextFactory<ContactsDbContext>
{
    public ContactsDbContext CreateDbContext(string[] args)
    {
        var environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        // Falls back to the same local dev database this factory used to hardcode, so
        // running `dotnet ef` from src/Contacts.Api with no overrides behaves the same as
        // before -- but now respects ConnectionStrings:Contacts when it's configured.
        var connectionString = configuration.GetConnectionString("Contacts")
            ?? "Host=localhost;Port=5432;Database=lk_contacts;Username=lk_contacts;Password=lk_contacts";

        var options = new DbContextOptionsBuilder<ContactsDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new ContactsDbContext(options);
    }
}
