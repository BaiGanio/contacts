using Contacts.Api.Data;
using Contacts.Domain;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Contacts")
    ?? throw new InvalidOperationException("Connection string 'Contacts' was not found.");

const string AngularDevClient = "AngularDevClient";

builder.Services.AddDbContext<ContactsDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy(AngularDevClient, policy =>
        policy.WithOrigins("http://localhost:5186")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(AngularDevClient);

app.MapGet("/", () => "Hello World!");

app.MapGet("/api/contacts", async (ContactsDbContext dbContext) =>
    await dbContext.Contacts
        .AsNoTracking()
        .ToListAsync());

app.MapPost("/api/contacts", async (CreateContactRequest request, ContactsDbContext dbContext) =>
{
    var contact = new Contact(
        request.FirstName,
        request.Surname,
        request.DateOfBirth,
        request.Address,
        request.PhoneNumber,
        new Iban(request.Iban));

    dbContext.Contacts.Add(contact);
    await dbContext.SaveChangesAsync();

    return Results.Created($"/api/contacts/{contact.Id}", contact);
});

app.Run();

public sealed record CreateContactRequest(
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Iban);
