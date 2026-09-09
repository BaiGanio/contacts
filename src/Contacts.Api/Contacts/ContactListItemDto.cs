using Contacts.Domain;

namespace Contacts.Api.Contacts;

public sealed record ContactListItemDto(
    Guid Id,
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    Iban Iban);
