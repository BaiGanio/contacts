using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Contacts.Api.Data;

public sealed class ContactsDbContextFactory : IDesignTimeDbContextFactory<ContactsDbContext>
{
    public ContactsDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ContactsDbContext>()
            .UseSqlite("Data Source=contacts.db")
            .Options;

        return new ContactsDbContext(options);
    }
}
