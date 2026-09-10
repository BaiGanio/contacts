using Contacts.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.GetContacts;

public sealed class GetContactsHandler(ContactsDbContext dbContext)
{
    public async Task<PagedContactsResult> HandleAsync(GetContactsQuery query, CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var contactsQuery = dbContext.Contacts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = $"%{query.Search.Trim()}%";
            contactsQuery = contactsQuery.Where(contact =>
                EF.Functions.ILike(contact.FirstName, pattern) ||
                EF.Functions.ILike(contact.Surname, pattern));
        }

        var totalCount = await contactsQuery.CountAsync(cancellationToken);

        var items = await contactsQuery
            .OrderBy(contact => contact.Surname)
            .ThenBy(contact => contact.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(contact => new ContactListItemDto(
                contact.Id,
                contact.FirstName,
                contact.Surname,
                contact.DateOfBirth,
                contact.Address,
                contact.PhoneNumber,
                contact.Iban))
            .ToListAsync(cancellationToken);

        return new PagedContactsResult(items, totalCount);
    }
}
