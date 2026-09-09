using Contacts.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.DeleteContact;

public sealed class DeleteContactHandler(ContactsDbContext dbContext)
{
    public async Task<bool> HandleAsync(DeleteContactCommand command, CancellationToken cancellationToken)
    {
        var contact = await dbContext.Contacts
            .SingleOrDefaultAsync(contact => contact.Id == command.Id, cancellationToken);

        if (contact is null)
        {
            return false;
        }

        dbContext.Contacts.Remove(contact);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }
}
