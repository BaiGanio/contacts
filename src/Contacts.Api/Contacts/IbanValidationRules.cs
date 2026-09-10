using Contacts.Api.Data;
using Contacts.Domain;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts;

public static class IbanValidationRules
{
    public static IRuleBuilderOptionsConditions<T, string> MustBeValidIban<T>(this IRuleBuilder<T, string> ruleBuilder) =>
        ruleBuilder.Custom((value, context) =>
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return;
            }

            try
            {
                _ = new Iban(value);
            }
            catch (ArgumentException ex)
            {
                context.AddFailure(ex.Message);
            }
        });

    public static IRuleBuilderOptions<T, string> MustBeUniqueIban<T>(
        this IRuleBuilder<T, string> ruleBuilder,
        ContactsDbContext dbContext,
        Func<T, Guid> excludeContactId) =>
        ruleBuilder.MustAsync(async (instance, value, _, cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return true;
            }

            Iban iban;
            try
            {
                iban = new Iban(value);
            }
            catch (ArgumentException)
            {
                return true;
            }

            var excludeId = excludeContactId(instance);
            return !await dbContext.Contacts.AnyAsync(
                contact => contact.Iban == iban && contact.Id != excludeId,
                cancellationToken);
        })
        .WithMessage("A contact with this IBAN already exists.");
}
