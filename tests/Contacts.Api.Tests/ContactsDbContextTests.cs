using Contacts.Api.Data;
using Contacts.Domain;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Tests;

public sealed class ContactsDbContextTests
{
    [Fact]
    public async Task SavesAndReloadsContactWithNormalizedIban()
    {
        var databasePath = Path.Combine(Path.GetTempPath(), $"contacts-{Guid.NewGuid():N}.db");
        var options = new DbContextOptionsBuilder<ContactsDbContext>()
            .UseSqlite($"Data Source={databasePath}")
            .Options;

        try
        {
            Guid contactId;

            await using (var writeContext = new ContactsDbContext(options))
            {
                await writeContext.Database.MigrateAsync();
                Assert.Equal(5, await writeContext.Contacts.CountAsync());

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
            File.Delete(databasePath);
        }
    }
}
