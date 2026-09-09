namespace Contacts.Domain;

public sealed record Iban
{
    public string Value { get; }

    public Iban(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("The IBAN is required.");
        }

        var normalizedValue = string.Concat(value.Where(character => !char.IsWhiteSpace(character)))
            .ToUpperInvariant();

        if (!HasValidFormat(normalizedValue) || !HasValidChecksum(normalizedValue))
        {
            throw new ArgumentException("The IBAN is invalid.");
        }

        Value = normalizedValue;
    }

    public override string ToString() => Value;

    private static bool HasValidFormat(string value)
    {
        if (value.Length is < 15 or > 34
            || !char.IsAsciiLetter(value[0])
            || !char.IsAsciiLetter(value[1])
            || !char.IsAsciiDigit(value[2])
            || !char.IsAsciiDigit(value[3]))
        {
            return false;
        }

        return value[4..].All(char.IsAsciiLetterOrDigit);
    }

    private static bool HasValidChecksum(string value)
    {
        var remainder = 0;

        foreach (var character in value[4..].Concat(value[..4]))
        {
            if (char.IsAsciiDigit(character))
            {
                remainder = (remainder * 10 + character - '0') % 97;
                continue;
            }

            var letterValue = character - 'A' + 10;
            remainder = (remainder * 100 + letterValue) % 97;
        }

        return remainder == 1;
    }
}
