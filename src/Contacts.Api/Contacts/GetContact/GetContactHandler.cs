using Contacts.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.GetContact;

public sealed class GetContactHandler(ContactsDbContext dbContext)
{
    public Task<ContactResponse?> HandleAsync(GetContactQuery query, CancellationToken cancellationToken)
    {
        return dbContext.Contacts
            .AsNoTracking()
            .Where(contact => contact.Id == query.Id)
            .Select(contact => new ContactResponse(
                contact.Id,
                contact.FirstName,
                contact.Surname,
                contact.DateOfBirth,
                contact.Address,
                contact.PhoneNumber,
                contact.Iban))
            .SingleOrDefaultAsync(cancellationToken);
    }
}
