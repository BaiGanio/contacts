using Contacts.Api.Data;
using FluentValidation;

namespace Contacts.Api.Contacts.UpdateContact;

public sealed class UpdateContactCommandValidator : AbstractValidator<UpdateContactCommand>
{
    public UpdateContactCommandValidator(ContactsDbContext dbContext)
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
            .MustBeValidIban()
            .MustBeUniqueIban(dbContext, command => command.Id);
    }
}
