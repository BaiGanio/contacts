# Contacts

## Prerequisites

- .NET SDK 10
- EF Core command-line tools 10.0.8

Check the installed tools:

```sh
dotnet --version
dotnet ef --version
```

If `dotnet ef` is not installed:

```sh
dotnet tool install --global dotnet-ef --version 10.0.8
```

## Build and test

From the repository root:

```sh
dotnet restore Contacts.slnx
dotnet build Contacts.slnx
dotnet test Contacts.slnx
```

## Create or update the development database

The development configuration uses SQLite. Apply all checked-in migrations:

```sh
dotnet ef database update --project src/Contacts.Api
```

This creates `src/Contacts.Api/contacts.db`. The database file and its SQLite
sidecar files are local development output and are intentionally ignored by
Git. The migrations and SQLite configuration remain checked in, so every
developer can create the same database locally.

When the EF model intentionally changes, create a migration from the repository
root and then apply it:

```sh
dotnet ef migrations add <MigrationName> \
  --project src/Contacts.Api \
  --output-dir Data/Migrations
dotnet ef database update --project src/Contacts.Api
```

## Run the API

Apply the migrations first, then start the development profile:

```sh
dotnet run --project src/Contacts.Api --launch-profile http
```

The assigned local URL is printed in the terminal. Open `/swagger` below that
URL to use Swagger UI, or request the seeded contacts directly. For example, if
the terminal prints `http://localhost:5123`:

```sh
curl http://localhost:5123/api/contacts
```

The endpoint reads all persisted contacts, including normalized IBAN values.
