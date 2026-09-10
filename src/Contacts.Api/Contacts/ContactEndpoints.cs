using Contacts.Api.Contacts.CreateContact;
using Contacts.Api.Contacts.DeleteContact;
using Contacts.Api.Contacts.GetContact;
using Contacts.Api.Contacts.GetContacts;
using Contacts.Api.Contacts.UpdateContact;
using FluentValidation;
using FluentValidation.Results;

namespace Contacts.Api.Contacts;

public static class ContactEndpoints
{
    public static void MapContactEndpoints(this WebApplication app, bool authEnabled)
    {
        var group = app.MapGroup("/api/contacts");
        if (authEnabled)
        {
            group.RequireAuthorization();
        }

        group.MapGet("", GetContactsAsync);
        group.MapGet("/{id:guid}", GetContactAsync);
        group.MapPost("", CreateContactAsync);
        group.MapPut("/{id:guid}", UpdateContactAsync);
        group.MapDelete("/{id:guid}", DeleteContactAsync);
    }

    private static async Task<IResult> GetContactsAsync(
        GetContactsHandler handler,
        int page = 1,
        int pageSize = 20,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var result = await handler.HandleAsync(new GetContactsQuery(page, pageSize, search), cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetContactAsync(
        Guid id,
        GetContactHandler handler,
        CancellationToken cancellationToken)
    {
        var contact = await handler.HandleAsync(new GetContactQuery(id), cancellationToken);
        return contact is null ? Results.NotFound() : Results.Ok(contact);
    }

    private static async Task<IResult> CreateContactAsync(
        CreateContactCommand command,
        CreateContactHandler handler,
        IValidator<CreateContactCommand> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            return validation.ToValidationProblem();
        }

        try
        {
            var response = await handler.HandleAsync(command, cancellationToken);
            return Results.Created($"/api/contacts/{response.Id}", response);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> UpdateContactAsync(
        Guid id,
        UpdateContactRequest request,
        UpdateContactHandler handler,
        IValidator<UpdateContactCommand> validator,
        CancellationToken cancellationToken)
    {
        var command = new UpdateContactCommand(
            id,
            request.FirstName,
            request.Surname,
            request.DateOfBirth,
            request.Address,
            request.PhoneNumber,
            request.Iban);

        var validation = await validator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            return validation.ToValidationProblem();
        }

        try
        {
            var response = await handler.HandleAsync(command, cancellationToken);
            return response is null ? Results.NotFound() : Results.Ok(response);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> DeleteContactAsync(
        Guid id,
        DeleteContactHandler handler,
        CancellationToken cancellationToken)
    {
        var deleted = await handler.HandleAsync(new DeleteContactCommand(id), cancellationToken);
        return deleted ? Results.NoContent() : Results.NotFound();
    }

    private static IResult ToValidationProblem(this ValidationResult result) =>
        Results.ValidationProblem(result.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(group => group.Key, group => group.Select(error => error.ErrorMessage).ToArray()));
}
