namespace Contacts.Api.Contacts.UpdateContact;

public sealed record UpdateContactRequest(
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Iban);
