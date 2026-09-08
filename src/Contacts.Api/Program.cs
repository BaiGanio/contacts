using Contacts.Api.Data;
using Contacts.Domain;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Contacts")
    ?? throw new InvalidOperationException("Connection string 'Contacts' was not found.");

builder.Services.AddDbContext<ContactsDbContext>(options => options.UseSqlite(connectionString));

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapPost("/api/contacts", async (CreateContactRequest request, ContactsDbContext dbContext) =>
{
    Contact contact;

    try
    {
        contact = new Contact(
            request.FirstName,
            request.Surname,
            request.DateOfBirth,
            request.Address,
            request.PhoneNumber,
            new Iban(request.Iban));
    }
    catch (ArgumentException exception)
    {
        return Results.BadRequest(new { error = exception.Message });
    }

    dbContext.Contacts.Add(contact);
    await dbContext.SaveChangesAsync();

    return Results.Created($"/api/contacts/{contact.Id}", ContactResponse.From(contact));
});

app.MapGet("/api/contacts", async (ContactsDbContext dbContext) =>
{
    var contacts = await dbContext.Contacts
        .AsNoTracking()
        .ToListAsync();

    return contacts.Select(ContactResponse.From);
});

app.Run();

public sealed record CreateContactRequest(
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Iban);

public sealed record ContactResponse(
    Guid Id,
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Iban)
{
    public static ContactResponse From(Contact contact) => new(
        contact.Id,
        contact.FirstName,
        contact.Surname,
        contact.DateOfBirth,
        contact.Address,
        contact.PhoneNumber,
        contact.Iban.Value);
}
