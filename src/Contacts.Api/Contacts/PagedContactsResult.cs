namespace Contacts.Api.Contacts;

public sealed record PagedContactsResult(IReadOnlyList<ContactResponse> Items, int TotalCount);
