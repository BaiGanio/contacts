using Contacts.Domain;

namespace Contacts.Api.Contacts;

public sealed record ContactResponse(
    Guid Id,
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    Iban Iban)
{
    public static ContactResponse FromContact(Contact contact) => new(
        contact.Id,
        contact.FirstName,
        contact.Surname,
        contact.DateOfBirth,
        contact.Address,
        contact.PhoneNumber,
        contact.Iban);
}
