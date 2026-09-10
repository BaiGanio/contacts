using Contacts.Api;
using Contacts.Api.Auth;
using Contacts.Api.Contacts;
using Contacts.Api.Contacts.ClearContacts;
using Contacts.Api.Contacts.GetImportFailures;
using Contacts.Api.Contacts.ImportContacts;
using Contacts.Api.Data;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Contacts")
    ?? throw new InvalidOperationException("Connection string 'Contacts' was not found.");

const string AngularClient = "AngularClient";

ValidatorOptions.Global.LanguageManager.Enabled = false;

builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 200 * 1024 * 1024);
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
    options.MultipartBodyLengthLimit = 200 * 1024 * 1024);

builder.Services.AddDbContext<ContactsDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the token from POST /api/auth/token (no \"Bearer \" prefix needed).",
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", document), [] },
    });
});

builder.Services.AddContactServices();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
// https://baiganio.github.io is GitHub Pages serving the built Angular app
// (web/package.json's build:pages script sets base-href /contacts/ for the org page).
// Configurable so the Playwright e2e suite can allow its own dev-server origin
// without touching this default.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5186", "https://baiganio.github.io"];

builder.Services.AddCors(options =>
{
    options.AddPolicy(AngularClient, policy =>
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var dummyAuth = builder.AddDummyAuth();

var app = builder.Build();

app.UseExceptionHandler();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors(AngularClient);

// Anonymous by intent, not by accident: kubelet's readiness/liveness probes send no
// bearer token, and a probe target must not depend on Auth:Enabled being off.
app.MapGet("/health", () => Results.Ok());

app.MapDummyAuthToken(dummyAuth);

app.MapGet("/", () => Results.Redirect("/swagger/index.html"));

app.MapContactEndpoints(dummyAuth.Enabled);

var importContacts = app.MapPost("/api/contacts/import", async (
    IFormFile file,
    ImportContactsHandler handler,
    CancellationToken cancellationToken) => await handler.HandleAsync(file, cancellationToken))
    .DisableAntiforgery();

var getImportFailures = app.MapGet("/api/imports/failures", async (
    GetImportFailuresHandler handler,
    CancellationToken cancellationToken,
    int limit = 100,
    string? rowHashes = null) => Results.Ok(await handler.HandleAsync(
        limit,
        rowHashes?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        cancellationToken)));

var clearContacts = app.MapDelete("/api/contacts", async (
    ClearContactsHandler handler,
    CancellationToken cancellationToken) =>
{
    await handler.HandleAsync(cancellationToken);
    return Results.NoContent();
});

if (dummyAuth.Enabled)
{
    importContacts.RequireAuthorization();
    getImportFailures.RequireAuthorization();
    clearContacts.RequireAuthorization();
}

using (var seedScope = app.Services.CreateScope())
{
    var dbContext = seedScope.ServiceProvider.GetRequiredService<ContactsDbContext>();
    await ContactsDatabaseInitializer.InitializeAsync(
        dbContext, app.Configuration, AppContext.BaseDirectory, app.Logger);
}

app.Run();
