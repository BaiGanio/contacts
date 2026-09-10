using System.Globalization;
using Contacts.Domain;

namespace Contacts.Api.Contacts;

public static class ContactCsvRow
{
    public static Contact Parse(Func<string, string?> getField)
    {
        var dateOfBirthRaw = getField("DateOfBirth") ?? "";
        if (!DateOnly.TryParseExact(dateOfBirthRaw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOfBirth))
        {
            throw new FormatException($"'{dateOfBirthRaw}' is not a valid date of birth. Use yyyy-MM-dd.");
        }

        var street = getField("Street") ?? "";
        var city = getField("City") ?? "";
        var postalCode = getField("PostalCode") ?? "";
        var country = getField("Country") ?? "";

        if (string.IsNullOrWhiteSpace(street) || string.IsNullOrWhiteSpace(city)
            || string.IsNullOrWhiteSpace(postalCode) || string.IsNullOrWhiteSpace(country))
        {
            throw new FormatException("Street, City, PostalCode, and Country are all required.");
        }

        var address = $"{street}, {postalCode} {city}, {country}";

        return new Contact(
            getField("FirstName") ?? "",
            getField("Surname") ?? "",
            dateOfBirth,
            address,
            getField("Phone") ?? "",
            new Iban(getField("Iban") ?? ""));
    }
}
