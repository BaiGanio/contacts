namespace Contacts.Domain;

public sealed class Contact
{
    public Guid Id { get; private set; }
    public string FirstName { get; private set; }
    public string Surname { get; private set; }
    public DateOnly DateOfBirth { get; private set; }
    public string Address { get; private set; }
    public string PhoneNumber { get; private set; }
    public Iban Iban { get; private set; }

    public Contact(
        string firstName,
        string surname,
        DateOnly dateOfBirth,
        string address,
        string phoneNumber,
        Iban iban)
    {
        var values = Validate(firstName, surname, dateOfBirth, address, phoneNumber, iban);

        Id = Guid.NewGuid();
        FirstName = values.FirstName;
        Surname = values.Surname;
        DateOfBirth = dateOfBirth;
        Address = values.Address;
        PhoneNumber = values.PhoneNumber;
        Iban = iban;
    }

    public void Update(
        string firstName,
        string surname,
        DateOnly dateOfBirth,
        string address,
        string phoneNumber,
        Iban iban)
    {
        var values = Validate(firstName, surname, dateOfBirth, address, phoneNumber, iban);

        FirstName = values.FirstName;
        Surname = values.Surname;
        DateOfBirth = dateOfBirth;
        Address = values.Address;
        PhoneNumber = values.PhoneNumber;
        Iban = iban;
    }

    private static (string FirstName, string Surname, string Address, string PhoneNumber) Validate(
        string firstName,
        string surname,
        DateOnly dateOfBirth,
        string address,
        string phoneNumber,
        Iban iban)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(firstName);
        ArgumentException.ThrowIfNullOrWhiteSpace(surname);
        ArgumentException.ThrowIfNullOrWhiteSpace(address);
        ArgumentException.ThrowIfNullOrWhiteSpace(phoneNumber);
        ArgumentNullException.ThrowIfNull(iban);

        if (dateOfBirth > DateOnly.FromDateTime(DateTime.Today))
        {
            throw new ArgumentOutOfRangeException(nameof(dateOfBirth), "Date of birth cannot be in the future.");
        }

        return (firstName.Trim(), surname.Trim(), address.Trim(), phoneNumber.Trim());
    }
}
