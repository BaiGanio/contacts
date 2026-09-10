# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 5000

# Build image
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish "src/Contacts.Api/Contacts.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
# app (uid/gid 1654) is the non-root user baked into Microsoft's aspnet image.
RUN chown -R app:app /app
USER app
ENTRYPOINT ["dotnet", "Contacts.Api.dll"]
