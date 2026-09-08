using Contacts.Domain;

namespace Contacts.Domain.Tests;

public sealed class ContactTests
{
    [Fact]
    public void Constructor_CreatesContactWithTrimmedValuesAndNonemptyId()
    {
        var contact = CreateContact();

        Assert.NotEqual(Guid.Empty, contact.Id);
        Assert.Equal("Ahmed", contact.FirstName);
        Assert.Equal("Ivanov", contact.Surname);
        Assert.Equal(new DateOnly(1965, 10, 19), contact.DateOfBirth);
        Assert.Equal("Kirkkokatu 36, 85532 Espoo, FI", contact.Address);
        Assert.Equal("+358001338908", contact.PhoneNumber);
        Assert.Equal(new Iban("FI2816525808631930"), contact.Iban);
    }

    [Fact]
    public void Update_ChangesValuesAndPreservesId()
    {
        var contact = CreateContact();
        var originalId = contact.Id;
        var replacementIban = new Iban("DE59 6798 8348 1367 6065 24");

        contact.Update(
            " Günter ",
            " Fürst ",
            new DateOnly(1969, 3, 14),
            " Löwenplatz 12, 59615 Hamburg, DE ",
            " +49184959310 ",
            replacementIban);

        Assert.Equal(originalId, contact.Id);
        Assert.Equal("Günter", contact.FirstName);
        Assert.Equal("Fürst", contact.Surname);
        Assert.Equal(new DateOnly(1969, 3, 14), contact.DateOfBirth);
        Assert.Equal("Löwenplatz 12, 59615 Hamburg, DE", contact.Address);
        Assert.Equal("+49184959310", contact.PhoneNumber);
        Assert.Same(replacementIban, contact.Iban);
    }

    [Fact]
    public void Update_WhenValidationFails_PreservesAllValues()
    {
        var contact = CreateContact();
        var originalId = contact.Id;
        var originalFirstName = contact.FirstName;
        var originalSurname = contact.Surname;
        var originalDateOfBirth = contact.DateOfBirth;
        var originalAddress = contact.Address;
        var originalPhoneNumber = contact.PhoneNumber;
        var originalIban = contact.Iban;

        Assert.Throws<ArgumentException>(() => contact.Update(
            "Renée",
            " ",
            new DateOnly(1978, 7, 20),
            "Brühlstraße 84, 14207 München, DE",
            "+49564139537",
            new Iban("DE73 3942 2525 8329 5001 67")));

        Assert.Equal(originalId, contact.Id);
        Assert.Equal(originalFirstName, contact.FirstName);
        Assert.Equal(originalSurname, contact.Surname);
        Assert.Equal(originalDateOfBirth, contact.DateOfBirth);
        Assert.Equal(originalAddress, contact.Address);
        Assert.Equal(originalPhoneNumber, contact.PhoneNumber);
        Assert.Same(originalIban, contact.Iban);
    }

    private static Contact CreateContact() => new(
        " Ahmed ",
        " Ivanov ",
        new DateOnly(1965, 10, 19),
        " Kirkkokatu 36, 85532 Espoo, FI ",
        " +358001338908 ",
        new Iban("FI2816525808631930"));
}
