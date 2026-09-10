using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Contacts.Api.Auth;

public sealed record DummyAuthOptions(bool Enabled, string? Username, string? Password, SymmetricSecurityKey? SigningKey);

public static class DummyAuthExtensions
{
    public static DummyAuthOptions AddDummyAuth(this WebApplicationBuilder builder)
    {
        var enabled = builder.Configuration.GetValue<bool>("Auth:Enabled");
        if (!enabled)
        {
            return new DummyAuthOptions(false, null, null, null);
        }

        var signingKeyValue = builder.Configuration["Auth:SigningKey"]
            ?? throw new InvalidOperationException("Configuration value 'Auth:SigningKey' was not found.");
        var username = builder.Configuration["Auth:Username"]
            ?? throw new InvalidOperationException("Configuration value 'Auth:Username' was not found.");
        var password = builder.Configuration["Auth:Password"]
            ?? throw new InvalidOperationException("Configuration value 'Auth:Password' was not found.");
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKeyValue));

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
                    IssuerSigningKey = signingKey,
                };
            });
        builder.Services.AddAuthorization();

        return new DummyAuthOptions(true, username, password, signingKey);
    }

    public static void MapDummyAuthToken(this WebApplication app, DummyAuthOptions options)
    {
        if (!options.Enabled)
        {
            return;
        }

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapPost("/api/auth/token", (LoginRequest request) =>
        {
            if (request.Username != options.Username || request.Password != options.Password)
            {
                return Results.Unauthorized();
            }

            var token = new JwtSecurityToken(
                claims: [new Claim(ClaimTypes.Name, request.Username)],
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: new SigningCredentials(options.SigningKey!, SecurityAlgorithms.HmacSha256));

            return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
        });
    }
}
