namespace Contacts.Api.Contacts.CreateContact;

public sealed record CreateContactCommand(
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Iban);
