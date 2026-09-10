# Contacts

## Prerequisites

- .NET SDK 10
- EF Core command-line tools 10.0.8
- Node.js 26
- npm 11
- Docker (to run PostgreSQL locally)

Check the installed tools:

```sh
dotnet --version
dotnet ef --version
docker --version
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

The development configuration uses PostgreSQL. Start it with Docker Compose,
then apply all checked-in migrations:

```sh
docker compose up -d
dotnet ef database update --project src/Contacts.Api
```

This starts a local PostgreSQL container (database, user, and password all
`lk_contacts`) with its data kept in a named Docker volume, so it survives
container restarts. The migrations and PostgreSQL configuration remain
checked in, so every developer can create the same database locally. The
migrations themselves create only an empty table. The first time the API
starts against an empty database, it seeds the 300 contacts from
`seed-data/contacts-02-poc-300.csv`, validating each row through the same
domain rules as a normal create (invalid rows are skipped and logged, not
inserted).

Stop the database with `docker compose down` (add `-v` to also delete its
data volume).

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

Read the seeded contacts directly with:

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

Invalid fields return a `400` with a readable per-field error list instead of
saving anything.

Read, edit, and delete one contact by ID:

```sh
curl http://localhost:5187/api/contacts/<id>

curl -i -X PUT http://localhost:5187/api/contacts/<id> \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Augusta",
    "surname": "King",
    "dateOfBirth": "1815-12-10",
    "address": "13 St James Square, London",
    "phoneNumber": "+44 20 7946 0001",
    "iban": "de89 3704 0044 0532 0130 00"
  }'

curl -i -X DELETE http://localhost:5187/api/contacts/<id>
```

A missing ID returns `404` for get, edit, and delete.

## Import contacts from a CSV file

`POST /api/contacts/import` accepts a multipart file upload (field name
`file`) with these required columns: `FirstName`, `Surname`, `DateOfBirth`
(`yyyy-MM-dd`), `Street`, `City`, `PostalCode`, `Country`, `Phone`, and
`Iban`. The address columns are combined into one string:
`Street, PostalCode City, Country`. Files over 1 MB or 1,000 data rows are
rejected outright (nothing is saved).

Otherwise the import is row-by-row: a row that parses and does not repeat
an IBAN is saved right away; a row that fails is skipped, listed in the
response with its row number and error, and recorded in a small review
queue instead of being silently dropped.

### IBAN is unique

A contact's IBAN must be unique. Creating or editing a contact with an
IBAN already used by another contact returns a `400` field error on
`Iban`. During import this same rule applies per row, including two rows
in the same file sharing an IBAN — the first is saved, the rest are
skipped as duplicates. This means re-importing the same file a second
time saves nothing (every row is now a duplicate of what the first import
already saved) instead of creating duplicate contacts.

### Reviewing failed import rows (PoC)

`GET /api/imports/failures` lists rows that have failed to import: their
original values, their error message, when they were first and last seen,
and how many times each has been seen. Rows are deduplicated by their
exact content, so importing the same bad file ten times updates one
entry's "seen" count instead of creating ten entries. The response is
capped (default 100, up to 500, via `?limit=`) and reports `totalCount`
alongside the returned `items`, so a large backlog of distinct failures
does not force one huge response or an unreadable page.

After an import with failing rows, the Angular page shows a short summary
("Imported N, M row(s) failed") with a **View failed rows** button that
opens a small dialog listing the most recent failures via this endpoint.
This is a minimal proof of concept — there is no paging control in that
dialog and no way to clear an entry.

Import one of the fixtures under `seed-data/`:

```sh
curl -i http://localhost:5187/api/contacts/import \
  -F 'file=@seed-data/contacts-01-initial-5.csv;type=text/csv'
```

The Angular page has an **Import file** button that opens a file picker,
sends the chosen CSV to this endpoint, and reloads the table on success.

## Dummy token auth proof of concept

This is a proof of concept for reviewers, not real security. It is off by
default and does not add real user management, password hashing, or roles.

Turn it on by setting `Auth:Enabled` to `true` (for example in
`appsettings.Development.json` or with `Auth__Enabled=true`). While it is
`false` (the default), every route behaves exactly as documented above and
no login is required.

While the flag is on, every `/api/contacts*` route (list, get, create, edit,
delete, import) requires a bearer token. Get one from the one hardcoded
dummy credential
(`demo` / `demo`):

```sh
curl -s -X POST http://localhost:5187/api/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"username": "demo", "password": "demo"}'
```

This returns a short-lived signed JWT: `{"token": "..."}`. Requests without
a valid token get `401 Unauthorized`. Paste the token into the **Auth
token** field at the top of the Angular page and click **Log in**; the app
holds it in `localStorage` and sends it as an `Authorization: Bearer`
header on every API call. If the flag is on and no token is stored yet,
the page shows a "Not authenticated" message.

### Frontend write gating

The Angular page does not gate anything on its own. Add, edit, delete,
search, and CSV import are always available from the page, whether or not
a token is logged in — the frontend has no way to read the API's
`Auth:Enabled` value, so it does not guess. While the flag is off (the
default), every action just works, same as before this PoC existed. While
the flag is on, an action without a valid token gets a `401` from the
API, and the page shows "Not authenticated. Use the login icon in the top
bar, then try again." Logging in through the existing token dialog fixes
this immediately, no reload needed.
