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
developer can create the same database locally. A fresh database contains the
five contacts from `seed-data/contacts-01-initial-5.csv`.

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

The HTTP development profile listens on port 5187. Open the Swagger UI at:

```text
http://localhost:5187/swagger
```

Read the five seeded contacts directly with:

```sh
curl http://localhost:5187/api/contacts
```

The endpoint reads all persisted contacts, including normalized IBAN values.

The create endpoint is not implemented yet. Keep this request as a reference
for the create-contact work in the next checkpoint:

```sh
curl -i http://localhost:5187/api/contacts \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Ada",
    "surname": "Lovelace",
    "dateOfBirth": "1815-12-10",
    "address": "12 St James Square, London",
    "phoneNumber": "+44 20 7946 0000",
    "iban": "gb82 west 1234 5698 7654 32"
  }'
```
