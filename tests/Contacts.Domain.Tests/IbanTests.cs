using Contacts.Domain;

namespace Contacts.Domain.Tests;

public sealed class IbanTests
{
    [Fact]
    public void Constructor_NormalizesValidIban()
    {
        var iban = new Iban(" fi28 1652 5808 6319 30 ");

        Assert.Equal("FI2816525808631930", iban.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("FI2816525808631931")]
    [InlineData("FI28-1652-5808-6319-30")]
    public void Constructor_RejectsBlankOrInvalidIban(string value)
    {
        Assert.Throws<ArgumentException>(() => new Iban(value));
    }
}
