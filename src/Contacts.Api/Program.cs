using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Contacts.Api.Data;
using Contacts.Domain;
using CsvHelper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Contacts")
    ?? throw new InvalidOperationException("Connection string 'Contacts' was not found.");

const string AngularDevClient = "AngularDevClient";
const string DummyUsername = "demo";
const string DummyPassword = "demo";

var authEnabled = builder.Configuration.GetValue<bool>("Auth:Enabled");
var signingKey = builder.Configuration["Auth:SigningKey"]
    ?? throw new InvalidOperationException("Configuration value 'Auth:SigningKey' was not found.");
var signingCredentials = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));

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

if (authEnabled)
{
    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = signingCredentials,
            };
        });
    builder.Services.AddAuthorization();
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(AngularDevClient);

if (authEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapPost("/api/auth/token", (LoginRequest request) =>
    {
        if (request.Username != DummyUsername || request.Password != DummyPassword)
        {
            return Results.Unauthorized();
        }

        var token = new JwtSecurityToken(
            claims: [new Claim(ClaimTypes.Name, request.Username)],
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: new SigningCredentials(signingCredentials, SecurityAlgorithms.HmacSha256));

        return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
    });
}

app.MapGet("/", () => "Hello World!");

var getContacts = app.MapGet("/api/contacts", async (
    ContactsDbContext dbContext,
    int page = 1,
    int pageSize = 20,
    string? search = null) =>
{
    page = Math.Max(page, 1);
    pageSize = Math.Clamp(pageSize, 1, 100);

    var query = dbContext.Contacts.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(search))
    {
        var pattern = $"%{search.Trim()}%";
        query = query.Where(contact =>
            EF.Functions.Like(contact.FirstName, pattern) ||
            EF.Functions.Like(contact.Surname, pattern));
    }

    var totalCount = await query.CountAsync();

    var items = await query
        .OrderBy(contact => contact.Surname)
        .ThenBy(contact => contact.FirstName)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return Results.Ok(new PagedContactsResult(items, totalCount));
});

var createContact = app.MapPost("/api/contacts", async (CreateContactRequest request, ContactsDbContext dbContext) =>
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

var importContacts = app.MapPost("/api/contacts/import", async (IFormFile file, ContactsDbContext dbContext) =>
{
    const int MaxFileBytes = 1 * 1024 * 1024;
    const int MaxDataRows = 1000;
    string[] requiredColumns = ["FirstName", "Surname", "DateOfBirth", "Street", "City", "PostalCode", "Country", "Phone", "Iban"];

    if (file.Length == 0)
    {
        return Results.BadRequest(new { error = "The uploaded file is empty." });
    }

    if (file.Length > MaxFileBytes)
    {
        return Results.BadRequest(new { error = "The file exceeds the 1 MB import limit." });
    }

    using var reader = new StreamReader(file.OpenReadStream());
    using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

    if (!csv.Read() || !csv.ReadHeader())
    {
        return Results.BadRequest(new { error = "The file has no header row." });
    }

    var missingColumns = requiredColumns.Where(column => !csv.HeaderRecord!.Contains(column)).ToList();
    if (missingColumns.Count > 0)
    {
        return Results.BadRequest(new { error = $"The file is missing required columns: {string.Join(", ", missingColumns)}." });
    }

    var contacts = new List<Contact>();
    var errors = new List<ImportRowError>();
    var row = 1;

    while (csv.Read())
    {
        row++;

        if (row - 1 > MaxDataRows)
        {
            return Results.BadRequest(new { error = $"The file exceeds the {MaxDataRows}-row import limit." });
        }

        try
        {
            var dateOfBirthRaw = csv.GetField("DateOfBirth") ?? "";
            if (!DateOnly.TryParseExact(dateOfBirthRaw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOfBirth))
            {
                throw new FormatException($"'{dateOfBirthRaw}' is not a valid date of birth. Use yyyy-MM-dd.");
            }

            var address = $"{csv.GetField("Street")}, {csv.GetField("PostalCode")} {csv.GetField("City")}, {csv.GetField("Country")}";

            var contact = new Contact(
                csv.GetField("FirstName") ?? "",
                csv.GetField("Surname") ?? "",
                dateOfBirth,
                address,
                csv.GetField("Phone") ?? "",
                new Iban(csv.GetField("Iban") ?? ""));

            contacts.Add(contact);
        }
        catch (Exception ex) when (ex is ArgumentException or FormatException)
        {
            errors.Add(new ImportRowError(row, ex.Message));
        }
    }

    if (errors.Count > 0)
    {
        return Results.BadRequest(new ImportResult(0, errors));
    }

    dbContext.Contacts.AddRange(contacts);
    await dbContext.SaveChangesAsync();

    return Results.Ok(new ImportResult(contacts.Count, errors));
})
.DisableAntiforgery();

if (authEnabled)
{
    getContacts.RequireAuthorization();
    createContact.RequireAuthorization();
    importContacts.RequireAuthorization();
}

app.Run();

public sealed record LoginRequest(string Username, string Password);

public sealed record CreateContactRequest(
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Iban);

public sealed record PagedContactsResult(IReadOnlyList<Contact> Items, int TotalCount);

public sealed record ImportResult(int ImportedCount, IReadOnlyList<ImportRowError> Errors);

public sealed record ImportRowError(int Row, string Message);
