using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Contacts.Api.Contacts;
using Contacts.Api.Contacts.CreateContact;
using Contacts.Api.Contacts.DeleteContact;
using Contacts.Api.Contacts.GetContact;
using Contacts.Api.Contacts.GetContacts;
using Contacts.Api.Contacts.UpdateContact;
using Contacts.Api.Data;
using Contacts.Domain;
using CsvHelper;
using FluentValidation;
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

ValidatorOptions.Global.LanguageManager.Enabled = false;

builder.Services.AddDbContext<ContactsDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<IValidator<CreateContactCommand>, CreateContactCommandValidator>();
builder.Services.AddScoped<IValidator<UpdateContactRequest>, UpdateContactRequestValidator>();
builder.Services.AddScoped<CreateContactHandler>();
builder.Services.AddScoped<GetContactsHandler>();
builder.Services.AddScoped<GetContactHandler>();
builder.Services.AddScoped<UpdateContactHandler>();
builder.Services.AddScoped<DeleteContactHandler>();
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

app.MapContactEndpoints(authEnabled);

var importContacts = app.MapPost("/api/contacts/import", async (IFormFile file, ContactsDbContext dbContext, CancellationToken cancellationToken) =>
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

    // Good rows are saved even when other rows in the same file fail; failing rows are
    // recorded in FailedImportRows instead of being dropped, so they can be reviewed later.
    var existingIbans = (await dbContext.Contacts.AsNoTracking().Select(contact => contact.Iban).ToListAsync(cancellationToken))
        .Select(iban => iban.Value)
        .ToHashSet();

    var contactsToSave = new List<Contact>();
    var errors = new List<ImportRowError>();
    var failedRows = new List<(string Hash, int Row, string Raw, string Message)>();
    var row = 1;

    while (csv.Read())
    {
        row++;

        if (row - 1 > MaxDataRows)
        {
            return Results.BadRequest(new { error = $"The file exceeds the {MaxDataRows}-row import limit." });
        }

        var rawRow = string.Join("|", requiredColumns.Select(column => csv.GetField(column) ?? ""));

        Contact? contact = null;
        string? errorMessage = null;

        try
        {
            contact = ContactCsvRow.Parse(name => csv.GetField(name));
        }
        catch (Exception ex) when (ex is ArgumentException or FormatException)
        {
            errorMessage = ex.Message;
        }

        // Catches an IBAN already used by a saved contact as well as two rows in this
        // same file sharing an IBAN, since accepted rows are added to existingIbans below.
        if (contact is not null && !existingIbans.Add(contact.Iban.Value))
        {
            errorMessage = $"A contact with IBAN {contact.Iban.Value} already exists.";
            contact = null;
        }

        if (contact is not null)
        {
            contactsToSave.Add(contact);
        }
        else
        {
            errors.Add(new ImportRowError(row, errorMessage!));
            var rowHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawRow)));
            failedRows.Add((rowHash, row, rawRow, errorMessage!));
        }
    }

    if (failedRows.Count > 0)
    {
        var hashes = failedRows.Select(failedRow => failedRow.Hash).Distinct().ToList();
        var existingFailedRows = await dbContext.FailedImportRows
            .Where(failedRow => hashes.Contains(failedRow.RowHash))
            .ToDictionaryAsync(failedRow => failedRow.RowHash, cancellationToken);

        // Grouped by content hash so importing the same bad row (e.g. the same file)
        // many times updates one record instead of creating a new one each time.
        foreach (var group in failedRows.GroupBy(failedRow => failedRow.Hash))
        {
            var latest = group.OrderBy(failedRow => failedRow.Row).Last();
            if (existingFailedRows.TryGetValue(group.Key, out var existingFailedRow))
            {
                existingFailedRow.RecordOccurrence(latest.Row, latest.Message, group.Count());
            }
            else
            {
                dbContext.FailedImportRows.Add(
                    FailedImportRow.Create(group.Key, latest.Row, latest.Raw, latest.Message, group.Count()));
            }
        }
    }

    dbContext.Contacts.AddRange(contactsToSave);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new ImportResult(contactsToSave.Count, errors));
})
.DisableAntiforgery();

var getImportFailures = app.MapGet("/api/imports/failures", async (ContactsDbContext dbContext, CancellationToken cancellationToken, int limit = 100) =>
{
    const int MaxLimit = 500;
    var boundedLimit = Math.Clamp(limit, 1, MaxLimit);

    var totalCount = await dbContext.FailedImportRows.CountAsync(cancellationToken);
    var failures = await dbContext.FailedImportRows
        .AsNoTracking()
        .OrderByDescending(failedRow => failedRow.LastSeenAtUtc)
        .Take(boundedLimit)
        .Select(failedRow => new FailedImportRowResponse(
            failedRow.RowHash,
            failedRow.LatestRowNumber,
            failedRow.RawRow,
            failedRow.ErrorMessage,
            failedRow.FirstSeenAtUtc,
            failedRow.LastSeenAtUtc,
            failedRow.Attempts))
        .ToListAsync(cancellationToken);

    return Results.Ok(new FailedImportRowsResponse(failures, totalCount));
});

if (authEnabled)
{
    importContacts.RequireAuthorization();
    getImportFailures.RequireAuthorization();
}

using (var seedScope = app.Services.CreateScope())
{
    var dbContext = seedScope.ServiceProvider.GetRequiredService<ContactsDbContext>();
    var seedCsvPath = Path.Combine(app.Environment.ContentRootPath, "..", "..", "seed-data", "contacts-02-poc-300.csv");
    await ContactsSeeder.SeedFromCsvAsync(dbContext, seedCsvPath, app.Logger);
}

app.Run();

public sealed record LoginRequest(string Username, string Password);

public sealed record ImportResult(int ImportedCount, IReadOnlyList<ImportRowError> Errors);

public sealed record ImportRowError(int Row, string Message);

public sealed record FailedImportRowResponse(
    string RowHash,
    int RowNumber,
    string RawRow,
    string ErrorMessage,
    DateTime FirstSeenAtUtc,
    DateTime LastSeenAtUtc,
    int Attempts);

public sealed record FailedImportRowsResponse(IReadOnlyList<FailedImportRowResponse> Items, int TotalCount);
