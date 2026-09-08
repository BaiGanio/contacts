# Contacts

## Prerequisites

- .NET SDK 10
- EF Core command-line tools 10.0.8
- Node.js 26
- npm 11

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

## Run the web application

The web application loads contacts from the API's `GET /api/contacts` and
creates them through `POST /api/contacts`. Start the API first (see above),
then in a separate terminal from the repository root:

```sh
cd web
npm install
npm start
```

Open `http://localhost:5186`. Changes under `web/src/` reload automatically.

The web application calls the API directly at `http://localhost:5187`. The
API allows this with a CORS policy (in `src/Contacts.Api/Program.cs`) that
permits requests from `http://localhost:5186`.

Build and test the web application with:

```sh
cd web
npm run build
npm test -- --no-watch
```

Read the five seeded contacts directly with:

```sh
curl http://localhost:5187/api/contacts
```

The endpoint reads all persisted contacts, including normalized IBAN values.

Create and persist a contact with:

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

## Import contacts from a CSV file

`POST /api/contacts/import` accepts a multipart file upload (field name
`file`) with these required columns: `FirstName`, `Surname`, `DateOfBirth`
(`yyyy-MM-dd`), `Street`, `City`, `PostalCode`, `Country`, `Phone`, and
`Iban`. The address columns are combined into one string:
`Street, PostalCode City, Country`. Files over 1 MB or 1,000 data rows are
rejected. If any row fails validation, the whole file is rejected and no
rows are saved; the response lists every failing row number and its error.

Importing the same file twice creates duplicate contacts — the IBAN is not
treated as a unique person identifier.

Import one of the fixtures under `seed-data/`:

```sh
curl -i http://localhost:5187/api/contacts/import \
  -F 'file=@seed-data/contacts-01-initial-5.csv;type=text/csv'
```

The Angular page has an **Import file** button that opens a file picker,
sends the chosen CSV to this endpoint, and reloads the table on success.
