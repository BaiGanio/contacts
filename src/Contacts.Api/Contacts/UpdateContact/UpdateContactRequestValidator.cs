using Contacts.Api.Data;
using Contacts.Domain;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.UpdateContact;

public sealed class UpdateContactRequestValidator : AbstractValidator<UpdateContactRequest>
{
    public const string ContactIdContextKey = "ContactId";

    public UpdateContactRequestValidator(ContactsDbContext dbContext)
    {
        RuleFor(request => request.FirstName).NotEmpty();
        RuleFor(request => request.Surname).NotEmpty();
        RuleFor(request => request.Address).NotEmpty();
        RuleFor(request => request.PhoneNumber).NotEmpty();
        RuleFor(request => request.DateOfBirth)
            .LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.Today))
            .WithMessage("Date of birth cannot be in the future.");
        RuleFor(request => request.Iban)
            .NotEmpty()
            .Custom((value, context) =>
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
            })
            .MustAsync(async (_, value, context, cancellationToken) =>
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

                var currentContactId = context.RootContextData.TryGetValue(ContactIdContextKey, out var idValue) && idValue is Guid id
                    ? id
                    : Guid.Empty;

                return !await dbContext.Contacts.AnyAsync(
                    contact => contact.Iban == iban && contact.Id != currentContactId,
                    cancellationToken);
            })
            .WithMessage("A contact with this IBAN already exists.");
    }
}
