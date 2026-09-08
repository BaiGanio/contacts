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
            await using (var writeContext = new ContactsDbContext(options))
            {
                await writeContext.Database.MigrateAsync();
                writeContext.Contacts.Add(new Contact(
                    "Ada",
                    "Lovelace",
                    new DateOnly(1815, 12, 10),
                    "12 St James's Square, London",
                    "+44 20 7946 0000",
                    new Iban("gb82 west 1234 5698 7654 32")));
                await writeContext.SaveChangesAsync();
            }

            await using var readContext = new ContactsDbContext(options);
            var contact = await readContext.Contacts.SingleAsync();

            Assert.Equal("Ada", contact.FirstName);
            Assert.Equal("GB82WEST12345698765432", contact.Iban.Value);
        }
        finally
        {
            File.Delete(databasePath);
        }
    }
}
