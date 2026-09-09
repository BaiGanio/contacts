using Contacts.Api.Data;
using Contacts.Domain;

namespace Contacts.Api.Contacts.CreateContact;

public sealed class CreateContactHandler(ContactsDbContext dbContext)
{
    public async Task<ContactResponse> HandleAsync(CreateContactCommand command, CancellationToken cancellationToken)
    {
        var contact = new Contact(
            command.FirstName,
            command.Surname,
            command.DateOfBirth,
            command.Address,
            command.PhoneNumber,
            new Iban(command.Iban));

        dbContext.Contacts.Add(contact);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ContactResponse.FromContact(contact);
    }
}
