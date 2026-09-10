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
            // % and _ are ILike wildcards; escaped so a search for a name that happens to
            // contain them is matched literally instead of as a pattern.
            var escapedSearch = query.Search.Trim()
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");
            var pattern = $"%{escapedSearch}%";
            contactsQuery = contactsQuery.Where(contact =>
                EF.Functions.ILike(contact.FirstName, pattern, "\\") ||
                EF.Functions.ILike(contact.Surname, pattern, "\\"));
        }

        var totalCount = await contactsQuery.CountAsync(cancellationToken);

        // Surname/FirstName alone are not unique, so a page boundary can otherwise land
        // mid-tie; Id is the tiebreaker (the composite index already covers this order).
        // The offset is computed in long arithmetic and clamped so a huge page number can't
        // overflow int -- it just requests an offset past every row, which returns empty.
        var skip = (int)Math.Min((long)(page - 1) * pageSize, int.MaxValue);

        var items = await contactsQuery
            .OrderBy(contact => contact.Surname)
            .ThenBy(contact => contact.FirstName)
            .ThenBy(contact => contact.Id)
            .Skip(skip)
            .Take(pageSize)
            .Select(contact => new ContactResponse(
                contact.Id,
                contact.FirstName,
                contact.Surname,
                contact.DateOfBirth,
                contact.Address,
                contact.PhoneNumber,
                contact.Iban.Value))
            .ToListAsync(cancellationToken);

        return new PagedContactsResult(items, totalCount);
    }
}
