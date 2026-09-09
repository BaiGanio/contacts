namespace Contacts.Api.Contacts.UpdateContact;

public sealed record UpdateContactCommand(
    Guid Id,
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Iban);
