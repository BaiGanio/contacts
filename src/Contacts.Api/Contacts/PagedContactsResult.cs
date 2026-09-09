namespace Contacts.Api.Contacts;

public sealed record PagedContactsResult(IReadOnlyList<ContactListItemDto> Items, int TotalCount);
