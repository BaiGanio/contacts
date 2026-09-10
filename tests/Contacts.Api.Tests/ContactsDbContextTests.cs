using Contacts.Api.Data;
using Contacts.Domain;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Contacts.Api.Tests;

public sealed class ContactsDbContextTests
{
    private const string AdminConnectionString =
        "Host=localhost;Port=5432;Database=postgres;Username=lk_contacts;Password=lk_contacts";

    [Fact]
    public async Task SavesAndReloadsContactWithNormalizedIban()
    {
        var databaseName = $"contacts_test_{Guid.NewGuid():N}";

        await using (var adminConnection = new NpgsqlConnection(AdminConnectionString))
        {
            await adminConnection.OpenAsync();
            await using var createCommand = new NpgsqlCommand($"CREATE DATABASE \"{databaseName}\"", adminConnection);
            await createCommand.ExecuteNonQueryAsync();
        }

        var options = new DbContextOptionsBuilder<ContactsDbContext>()
            .UseNpgsql($"Host=localhost;Port=5432;Database={databaseName};Username=lk_contacts;Password=lk_contacts")
            .Options;

        try
        {
            Guid contactId;

            await using (var writeContext = new ContactsDbContext(options))
            {
                await writeContext.Database.MigrateAsync();
                Assert.Equal(0, await writeContext.Contacts.CountAsync());

                var createdContact = new Contact(
                    "Ada",
                    "Lovelace",
                    new DateOnly(1815, 12, 10),
                    "12 St James's Square, London",
                    "+44 20 7946 0000",
                    new Iban("gb82 west 1234 5698 7654 32"));
                contactId = createdContact.Id;
                writeContext.Contacts.Add(createdContact);
                await writeContext.SaveChangesAsync();
            }

            await using var readContext = new ContactsDbContext(options);
            var reloadedContact = await readContext.Contacts.SingleAsync(value => value.Id == contactId);

            Assert.Equal("Ada", reloadedContact.FirstName);
            Assert.Equal("GB82WEST12345698765432", reloadedContact.Iban.Value);
        }
        finally
        {
            NpgsqlConnection.ClearAllPools();
            await using var adminConnection = new NpgsqlConnection(AdminConnectionString);
            await adminConnection.OpenAsync();
            await using var dropCommand = new NpgsqlCommand(
                $"DROP DATABASE IF EXISTS \"{databaseName}\" WITH (FORCE)", adminConnection);
            await dropCommand.ExecuteNonQueryAsync();
        }
    }
}
