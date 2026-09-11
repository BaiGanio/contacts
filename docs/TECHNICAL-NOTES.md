# Technical notes

Return to the [README](../README.md) for the local quick start and test commands.
Commands here run from the repository root and use a POSIX shell (such as bash
or zsh); on Windows, use Git Bash/WSL or adapt environment assignments for PowerShell.

## API examples

Local development requires no token by default. Swagger at
[localhost:5187/swagger](http://localhost:5187/swagger) lists the endpoints.

```sh
curl --get http://localhost:5187/api/contacts \
  --data-urlencode 'search=Löwe' --data 'page=1' --data 'pageSize=20'
```

The list response is `{ "items": [...], "totalCount": N }`. Pages are one-based;
`pageSize` defaults to 20 and is bounded to 1–100. Search matches text anywhere
in the first name or surname, case-insensitively. Results are ordered by surname,
first name, then ID for stable page boundaries.

Create a contact (the example IBAN must not already be in use):

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

A successful create returns `201` with the saved contact and normalized IBAN.
Copy its `id` into the variable below to read, update, and delete it:

```sh
contact_id='replace-with-the-returned-id'
curl "http://localhost:5187/api/contacts/$contact_id"
curl -i -X PUT "http://localhost:5187/api/contacts/$contact_id" \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Augusta",
    "surname": "King",
    "dateOfBirth": "1815-12-10",
    "address": "13 St James Square, London",
    "phoneNumber": "+44 20 7946 0001",
    "iban": "gb82 west 1234 5698 7654 32"
  }'
curl -i -X DELETE "http://localhost:5187/api/contacts/$contact_id"
```

Invalid request fields return `400` with field errors. Reading or deleting a
missing contact returns `404`; updating a missing contact with valid input also
returns `404`.

## CSV import behavior

`POST /api/contacts/import` accepts a multipart upload with field name `file`.
Required columns are `FirstName`, `Surname`, `DateOfBirth` (`yyyy-MM-dd`),
`Street`, `City`, `PostalCode`, `Country`, `Phone`, and `Iban`. The address becomes
`Street, PostalCode City, Country`. UTF-8 names, quoted fields, and a byte-order
mark are supported.

The import has a 200 MB upload limit and a 2,000,000-data-row limit. It checks
CSV structure and row count before saving. Valid contacts are then saved in
batches of 5,000; rows with invalid values or duplicate IBANs are skipped and
recorded for review. Re-importing a previously accepted row produces a duplicate
error. The response includes `importedCount`, `totalErrorCount`, and an `errors`
sample of up to 100 rows, each with a row number, message, and content hash.

The import is a synchronous HTTP request. Keep the page open until it completes.
It is not one transaction for the entire file: a database failure or interruption
after a batch commits can leave earlier batches saved.

**View failed rows** shows the current import's sampled failures, using their
hashes to fetch the stored details. It has no pagination or individual dismissal.
`GET /api/imports/failures` returns recent failures (default 100, maximum 500 via
`limit`) and the total number of stored distinct failures. The `rowHashes`
parameter instead selects specific failures. Repeated failures with the same
content update an occurrence count.

## Test imports with an empty local database

These commands delete **all local contacts and failed import rows**. They keep
the schema and migrations. Use them only when you want to reset your local data.

With the local API running, clear the data and import the small fixture:

```sh
curl -i -X DELETE http://localhost:5187/api/contacts
curl -i http://localhost:5187/api/contacts/import \
  -F 'file=@seed-data/contacts-01-initial-5.csv;type=text/csv'
curl 'http://localhost:5187/api/contacts?pageSize=100'
```

Expect `importedCount: 5`, `totalErrorCount: 0`, and a list `totalCount` of 5.
To verify the other fixture independently, clear the table again:

```sh
curl -i -X DELETE http://localhost:5187/api/contacts
curl -i http://localhost:5187/api/contacts/import \
  -F 'file=@seed-data/contacts-02-poc-300.csv;type=text/csv'
curl 'http://localhost:5187/api/contacts?pageSize=100'
```

Expect `importedCount: 300`, `totalErrorCount: 0`, and a list `totalCount` of 300
(the response contains only the requested page). Reload the Angular page after
changing data with curl. Re-importing the same file now yields 300 duplicates.

Keep the API running between clearing and importing. Restarting it with an empty
contacts table seeds 300 contacts again unless `Seed:Enabled` is false. The clear
endpoint has no confirmation or undo and requires a token when auth is enabled.

If the API is stopped, the equivalent direct database reset is:

```sh
docker compose exec postgres psql -U lk_contacts -d lk_contacts \
  -c 'TRUNCATE TABLE "Contacts", "FailedImportRows";'
```

## Database configuration

| Setting | Default | Development profile |
| --- | --- | --- |
| `Database:ApplyMigrations` | `false` | `true` |
| `Seed:Enabled` | `false` | `true` |
| `Seed:CsvPath` | `seed-data/contacts-02-poc-300.csv` | Same |

Relative seed paths resolve from the API binary directory. The 5-row and 300-row
fixtures are copied to build/publish output; the million-row fixture is not.
Seeding skips nonempty contacts tables. Invalid domain values are skipped and
logged during seeding.

Environment variables use double underscores for nested settings. For example,
start local development without seeding:

```sh
Seed__Enabled=false dotnet run --project src/Contacts.Api --launch-profile http
```

Set `Seed__CsvPath=seed-data/contacts-01-initial-5.csv` to seed the smaller fixture
when the contacts table is empty. For a different server, supply
`ConnectionStrings__Contacts` and explicitly enable `Database__ApplyMigrations`
and `Seed__Enabled` as needed outside Development. PostgreSQL must be running;
the user needs migration permissions and database creation permission if the
database does not yet exist. Enabled initialization failures stop API startup.
The tests use their own local database configuration, not these development overrides.

For manual migrations, install the matching EF tool if needed:

```sh
dotnet tool install --global dotnet-ef --version 10.0.8
dotnet ef --version
```

Apply existing migrations manually when automatic migration is disabled:

```sh
dotnet ef database update --project src/Contacts.Api --connection 'replace-with-your-connection-string'
```

Only when intentionally changing the EF model, replace `DescribeModelChange`
with a descriptive migration name and run:

```sh
dotnet ef migrations add DescribeModelChange --project src/Contacts.Api --output-dir Data/Migrations
dotnet ef database update --project src/Contacts.Api
```

## Optional dummy authentication

Enable the proof of concept locally with:

```sh
Auth__Enabled=true dotnet run --project src/Contacts.Api --launch-profile http
```

All contact routes and the import-failure endpoint then require a bearer token.
The health endpoint and Swagger remain accessible. With auth disabled, the token
endpoint is not mapped and no login is needed.

```sh
curl -s -X POST http://localhost:5187/api/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo"}'
```

The response is `{ "token": "..." }`. The JWT has a one-hour lifetime. Use it as
`Authorization: Bearer <token>` for curl, or paste just the token into Swagger's
**Authorize** dialog. The Angular login dialog obtains and stores it in
`localStorage`; logging in reloads the contacts list. When it expires, log in again.

This demonstrates token handling only: there is no real user management,
password hashing, refresh-token flow, or role model.

## Search and ordering indexes

PostgreSQL `pg_trgm` GIN indexes on first name and surname support contains
searches (`ILIKE '%text%'`). A btree index on `(Surname, FirstName, Id)` supports
the list ordering. Migrations create these indexes and the extension.

Deep unfiltered pages still use `OFFSET` and must walk skipped entries.
Keyset pagination would require a different navigation/API design and is not
implemented. No portable latency guarantee is claimed; results depend on data,
query selectivity, hardware, and cache state.

## Large-scale fixture (1,000,000 rows)

Start from an empty local database using the reset instructions above to get
the expected counts. This optional experiment is not needed to review the core
application or run its tests.

`seed-data/contacts-03-poc-1000000.csv.gz` contains 1,000,000 generated rows
for testing paging, search, and import error handling. It is compressed in git.
Names are built from random syllables to provide varied search data.

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

The generator that produced this fixture is not included in the repository;
the compressed fixture is the supplied artifact.

Unzip the fixture, then import it the same way as the smaller fixtures,
through the API or the Angular **Import file** button:

```sh
gunzip -k seed-data/contacts-03-poc-1000000.csv.gz
curl -i http://localhost:5187/api/contacts/import \
  -F 'file=@seed-data/contacts-03-poc-1000000.csv;type=text/csv'
```

## Hosting and CI

GitHub Pages serves the static Angular build at
[baiganio.github.io/contacts](https://baiganio.github.io/contacts/). The production
environment points to the separately hosted API at
[contacts-api.baiganio.io](https://contacts-api.baiganio.io/swagger/index.html);
the API CORS configuration permits the Pages origin.

`npm --prefix web run build:pages` builds with `/contacts/` as the base URL.
GitHub Pages must use **GitHub Actions** as its publishing source.

The shared `verify.yml` workflow builds/tests the backend and runs the three
Playwright scenarios. PRs to `master` run it, and pushes to `master` use it as a
gate before deployments. Changes under `web/` trigger Pages deployment after
verification; API changes trigger an ARM64 image build for the Pi cluster.
The deployment workflows also have manual dispatch entry points.
See [workflows](../.github/workflows/) and
[cluster manifests](../Infrastructure/Kubernetes/Contacts/) for implementation.
Hosting is not required for local evaluation.
