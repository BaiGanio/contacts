using Contacts.Api.Data;
using Contacts.Domain;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Contacts.Api.Contacts.CreateContact;

public sealed class CreateContactCommandValidator : AbstractValidator<CreateContactCommand>
{
    public CreateContactCommandValidator(ContactsDbContext dbContext)
    {
        RuleFor(command => command.FirstName).NotEmpty();
        RuleFor(command => command.Surname).NotEmpty();
        RuleFor(command => command.Address).NotEmpty();
        RuleFor(command => command.PhoneNumber).NotEmpty();
        RuleFor(command => command.DateOfBirth)
            .LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.Today))
            .WithMessage("Date of birth cannot be in the future.");
        RuleFor(command => command.Iban)
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
            .MustAsync(async (value, cancellationToken) =>
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

                return !await dbContext.Contacts.AnyAsync(contact => contact.Iban == iban, cancellationToken);
            })
            .WithMessage("A contact with this IBAN already exists.");
    }
}
