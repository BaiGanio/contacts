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

The development configuration uses PostgreSQL. Start it with Docker Compose:

```sh
docker compose up -d
```

This starts a local PostgreSQL container (database, user, and password all
`lk_contacts`) with its data kept in a named Docker volume, so it survives
container restarts. The migrations and PostgreSQL configuration remain
checked in, so every developer can create the same database locally. The
migrations are applied automatically when the development API starts. The first time the API
starts against an empty database, it seeds the 300 contacts from
`seed-data/contacts-02-poc-300.csv`, validating each row through the same
domain rules as a normal create (invalid rows are skipped and logged, not
inserted).

`Database:ApplyMigrations` and `Seed:Enabled` are both `false` by default and
`true` in the Development profile. Set `Seed__Enabled=false` to keep an empty
database empty. `Seed:CsvPath` defaults to `seed-data/contacts-02-poc-300.csv`;
use `Seed__CsvPath=seed-data/contacts-01-initial-5.csv` for the smaller fixture.
Relative seed paths are resolved from the API binary directory. Both small
fixtures are copied into build and publish output; the million-row fixture is not.
Seeding skips a nonempty contacts table and never resets existing contacts.

For another PostgreSQL server, supply `ConnectionStrings__Contacts` through
the environment. Enable `Database__ApplyMigrations=true` and, if wanted,
`Seed__Enabled=true` explicitly. PostgreSQL must already be running, and the
configured user needs schema migration permissions (plus database creation
permission if the database does not yet exist). Startup fails if enabled
initialization fails. With automatic migration disabled, apply migrations manually:

```sh
dotnet ef database update --project src/Contacts.Api --connection '<connection string>'
```

Stop the database with `docker compose down` (add `-v` to also delete its
data volume).

### Clear the data to test fresh

To empty the contacts table without dropping it or its migrations, truncate
it directly:

```sh
docker exec -it lk-contacts-postgres-1 psql -U lk_contacts -d lk_contacts \
  -c 'TRUNCATE TABLE "Contacts", "FailedImportRows";'
```

This keeps the schema and migration history, so no `dotnet ef database
update` is needed afterward. Because the API seeds 300 contacts the first
time it starts against an empty `Contacts` table, restarting the API right
after this command re-adds those 300 rows — stop the API first, or import a
different fixture instead, if you want the table to stay empty.

When the EF model intentionally changes, create a migration from the repository
root and then apply it:

```sh
dotnet ef migrations add <MigrationName> \
  --project src/Contacts.Api \
  --output-dir Data/Migrations
dotnet ef database update --project src/Contacts.Api
```

### Name search indexing

`GET /api/contacts?search=` matches the search text anywhere inside the
first name or surname (`ILIKE '%text%'`), so a plain index can't help — a
leading wildcard defeats normal index lookups. `FirstName` and `Surname`
each have a Postgres trigram (`pg_trgm`) GIN index instead, which indexes
overlapping 3-character chunks of every name so a "contains" search can use
an index. Measured against the 1,000,000-row fixture below: the trigram
indexes cut a search from ~240ms (sequential scan) to under 1ms.

### List page ordering index

`GET /api/contacts` orders results by `Surname`, then `FirstName`. Without
an index on those columns, Postgres has to sort the entire table on every
request, spilling to disk once the table is large — a plain btree index on
`(Surname, FirstName, Id)` lets it read rows already in that order instead.

Measured against the 1,000,000-row fixture:

| Request | Before this index | After |
| -------- | ------------------- | ------ |
| First page | ~63ms (full sort) | ~0.2ms |
| A deep, unfiltered page (row 500,000) | ~893ms (sorts to disk) | ~478ms |

This index makes the first page and normal browsing fast, and it is why a
search stays fast too — a search narrows the table down first, so it is
almost never paging deep into the full table. It does **not** fully fix a
deep page over the *entire, unfiltered* table (`OFFSET` still has to walk
past every skipped row one at a time) — that would need keyset
("load more after the last row I saw") pagination instead of page numbers,
which was deferred because it would also change the API shape and remove
the paginator's jump-to-page-number control. Revisit if the table grows
much larger and deep unfiltered browsing turns out to matter in practice.

## Run the API

Start PostgreSQL first, then start the development profile (it applies migrations):

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

## Deploy the web application to GitHub Pages

The `deploy-pages.yml` workflow builds and deploys the Angular application
whenever `master` is pushed. In the repository's GitHub **Settings → Pages**,
set **Source** to **GitHub Actions**. The published site is:

```text
https://baiganio.github.io/contacts/
```

The Pages build uses `/contacts/` as Angular's base URL so its scripts, styles,
fonts, and favicon resolve beneath the repository path. Run the same build
locally with:

```sh
cd web
npm run build:pages
```

GitHub Pages hosts only the static Angular application. Until a public API is
available, the page loads normally and shows its existing API connection error.
When the API is deployed, set its HTTPS origin in
`web/src/environments/environment.prod.ts` and allow
`https://baiganio.github.io` in the API's production CORS policy.

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
`Street, PostalCode City, Country`. Files over 200 MB or 2,000,000 data
rows are rejected outright (nothing is saved).

Otherwise the import is row-by-row: a row that parses and does not repeat
an IBAN is saved right away; a row that fails is skipped, listed in the
response with its row number and error, and recorded in a small review
queue instead of being silently dropped. Accepted rows are written to the
database in batches of 5,000 rather than all at once, so a multi-million-row
file does not hold everything in memory for one giant transaction.
Importing the 1,000,000-row fixture below takes roughly 30–40 seconds on a
typical development machine; this is a synchronous HTTP request end to end,
so a large import means a real wait, not a background job.

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

### Large-scale fixture (1,000,000 rows)

`seed-data/contacts-03-poc-1000000.csv.gz` is a generated, 1,000,000-row
fixture for testing paging, search, and import error handling at real
scale, kept compressed in git (about 40 MB instead of about 97 MB) to keep
the repository small. Names are randomly built from syllables rather than
picked from a list, so the file has close to 1,000,000 distinct first names
and close to 1,000,000 distinct surnames — no single search term matches an
unrealistically large slice of the file.

Four marker surnames are planted at exact, known counts, so a search can be
pointed at a known answer instead of a random one:

| Search for    | Expect exactly |
| -------------- | --------------- |
| `Uniqmarker`   | 1 result         |
| `Smallgroup`   | 10 results        |
| `Midgroup`     | 100 results       |
| `Biggroup`     | 1,000 results     |

Six rows are deliberately broken, one of each kind, so the import
endpoint's error handling can be exercised at scale instead of just on
hand-written test files. Every bad row's surname names its own kind, so it
can be searched for directly:

| Search for           | Kind                                                |
| --------------------- | ---------------------------------------------------- |
| `Badrowdupiban`       | IBAN already used by another row (rejected as a duplicate) |
| `Badrowbadformat`     | IBAN too short to be a valid IBAN                    |
| `Badrowbadchecksum`   | IBAN with the right shape but a wrong check digit    |
| `Badrowbaddate`       | Date of birth that isn't a date at all                |
| `Badrowfuturedob`     | Date of birth in the future                          |
| `Badrowblank`         | Blank first name                                     |

These six rows are expected to show up in the import response's error list
(and in `GET /api/imports/failures`), not as saved contacts — the other
999,994 rows, including all four marker surnames, should still import
cleanly and be searchable afterward.

The generator that built this file is checked in at
`tools/seed-generator/` (not part of the API or web solution) — run
`dotnet run -c Release` from that folder to regenerate or tweak it.

Unzip the fixture, then import it the same way as the smaller fixtures,
through the API or the Angular **Import file** button:

```sh
gunzip -k seed-data/contacts-03-poc-1000000.csv.gz
curl -i http://localhost:5187/api/contacts/import \
  -F 'file=@seed-data/contacts-03-poc-1000000.csv;type=text/csv'
```

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
