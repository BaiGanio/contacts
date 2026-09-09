namespace Contacts.Api.Contacts.GetContacts;

public sealed record GetContactsQuery(int Page, int PageSize, string? Search);
