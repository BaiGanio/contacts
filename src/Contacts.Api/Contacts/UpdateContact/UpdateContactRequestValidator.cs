using Contacts.Domain;
using FluentValidation;

namespace Contacts.Api.Contacts.UpdateContact;

public sealed class UpdateContactRequestValidator : AbstractValidator<UpdateContactRequest>
{
    public UpdateContactRequestValidator()
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
            });
    }
}
