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

        var address = $"{getField("Street")}, {getField("PostalCode")} {getField("City")}, {getField("Country")}";

        return new Contact(
            getField("FirstName") ?? "",
            getField("Surname") ?? "",
            dateOfBirth,
            address,
            getField("Phone") ?? "",
            new Iban(getField("Iban") ?? ""));
    }
}
