using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Contacts.Api.Data;

public sealed class ContactsDbContextFactory : IDesignTimeDbContextFactory<ContactsDbContext>
{
    public ContactsDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ContactsDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=lk_contacts;Username=lk_contacts;Password=lk_contacts")
            .Options;

        return new ContactsDbContext(options);
    }
}
