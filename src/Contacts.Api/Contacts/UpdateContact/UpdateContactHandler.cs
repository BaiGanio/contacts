using Contacts.Api.Data;
using Contacts.Domain;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.UpdateContact;

public sealed class UpdateContactHandler(ContactsDbContext dbContext)
{
    public async Task<ContactResponse?> HandleAsync(UpdateContactCommand command, CancellationToken cancellationToken)
    {
        var contact = await dbContext.Contacts
            .SingleOrDefaultAsync(contact => contact.Id == command.Id, cancellationToken);

        if (contact is null)
        {
            return null;
        }

        contact.Update(
            command.FirstName,
            command.Surname,
            command.DateOfBirth,
            command.Address,
            command.PhoneNumber,
            new Iban(command.Iban));

        await dbContext.SaveChangesAsync(cancellationToken);

        return ContactResponse.FromContact(contact);
    }
}
