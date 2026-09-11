# Contacts

A contacts manager built with .NET Minimal API, EF Core, PostgreSQL, Angular
Material, and ngrx Store. Create, edit, delete, search, and page through persisted
contacts, or import them from CSV. Each contact has a first name, surname, date
of birth, address, phone number, and a validated, unique IBAN.

## Live demo

This section is optional. You do not need the live demo to run or review the
application locally; skip to the [local quick start](#local-quick-start) if
you prefer.

- [Open the application](https://baiganio.github.io/contacts/)
- [Open the API in Swagger](https://contacts-api.baiganio.io/swagger/index.html)

Use the login icon in the application's top bar with **demo / demo** when
prompted to authenticate. In Swagger, call `POST /api/auth/token` with those
credentials, then click **Authorize** and paste the returned token without a
`Bearer` prefix. The hosted demo uses shared data, so its contact count may vary.

Authentication is an optional dummy-token proof of concept, not real security.
It is **off by default locally**; the local quick start requires no login.
With auth off, the login icon in the local application still shows, but logging
in fails with **Wrong username or password**. Ignore that icon unless you enable
auth as described in the [technical notes](docs/TECHNICAL-NOTES.md#optional-dummy-authentication).

## Local quick start

### Prerequisites

Install .NET SDK 10, Node.js 26, npm 11, and Docker with Docker Compose.
Start Docker before continuing. Check the tools with:

```sh
dotnet --version
node --version
npm --version
docker compose version
```

Expect output starting with `10.` for dotnet, `v26.` for node, `11.` for npm,
and `v2.` for Docker Compose.

Clone or extract the repository and open a terminal in its root folder (the
folder containing `Contacts.slnx` and `compose.yaml`). All command blocks below
start from that folder unless stated otherwise. EF command-line tools are only
needed for [manual migration work](docs/TECHNICAL-NOTES.md#database-configuration).

### Terminal 1: start PostgreSQL and the API

```sh
docker compose up -d
docker compose exec postgres pg_isready -U lk_contacts -d lk_contacts
dotnet run --project src/Contacts.Api --launch-profile http
```

Wait for `pg_isready` to report **accepting connections** before starting the API;
repeat that command if PostgreSQL is still starting. On first use, Docker needs
to download the PostgreSQL image and .NET restores the backend packages.

The API applies migrations automatically. If the contacts table is empty, it
loads the 300-row CSV fixture. Existing contacts are preserved across restarts.

On a brand-new database, the API log starts with a red
`fail: Microsoft.EntityFrameworkCore.Database.Connection` line. This is normal:
the database did not exist yet, and the API creates it. Several hundred SQL log
lines follow. Keep this terminal running and wait for
`Now listening on: http://localhost:5187`.

### Terminal 2: start Angular

Open a second terminal at the repository root:

```sh
cd web
npm ci
npm start
```

`npm ci` may print `npm warn allow-scripts` lines; they are safe to ignore.
`npm start` opens the application in your default browser by itself. Keep this
terminal running too. If no tab opens, open [the application](http://localhost:5186)
yourself. [Local Swagger](http://localhost:5187/swagger) lists the API endpoints.

| Component | Local address |
| --- | --- |
| Angular application | `http://localhost:5186` |
| API | `http://localhost:5187` |
| PostgreSQL | `localhost:5432` |

The local database name, username, and password are all `lk_contacts`.
Angular calls the local API directly, with CORS configured for its origin.

### Try the application

The top bar has three icons on the right. Hover one to see its name:
a file icon (**Import CSV**), a person-with-plus icon (**Add contact**), and an
arrow icon (**Log in**). Each table row has an **Edit** pencil and a **Delete**
bin.

1. On a fresh database, confirm the table shows **300 contacts**. Search for
   `Löwe`, clear the search, and use the paginator to browse another page.
2. Add a contact using all six fields. For a valid example IBAN, use
   `GB82 WEST 1234 5698 7654 32` (provided another contact has not used it).
3. Search for your new contact, edit it, and reload the page to check persistence.
   Delete it using the row action and confirmation dialog.
4. Try saving an empty form or an invalid IBAN to see validation errors.
5. Choose **Import file** and select `seed-data/contacts-01-initial-5.csv`.
   Its five contacts already exist in the default 300-row seed, so expect the
   message **Imported 0 contact(s). 5 row(s) failed to import.** Click
   **View failed rows** to see the duplicate IBAN for each row.

To check successful imports, follow the [empty-database import walkthrough](docs/TECHNICAL-NOTES.md#test-imports-with-an-empty-local-database)
(it deletes all your local contacts first) or run the Playwright suite below,
which verifies both supplied fixtures in a separate test database.

### Stop the application

Press `Ctrl+C` in both application terminals. From the repository root, run
`docker compose down` to stop PostgreSQL. Its named volume retains your data;
adding `-v` deletes that volume and all local database data.

## Build and test

PostgreSQL must be running for backend and browser tests. If needed, start it
and check readiness using the commands in the quick start.

### Backend

From the repository root:

```sh
dotnet restore Contacts.slnx
dotnet build Contacts.slnx
dotnet test Contacts.slnx
```

The xUnit suite checks domain behavior and persistence. The persistence test
creates and removes a temporary database using the local Compose credentials.
It does not require a running API.

### Angular production build

From the repository root:

```sh
npm --prefix web ci
npm --prefix web run build
```

The production build targets the hosted API; `npm start` uses the local API.
There are no Angular unit tests. Frontend behavior is tested with Playwright.

### Playwright browser tests

With PostgreSQL running and the web dependencies installed, start from the
repository root:

```sh
cd tests/Contacts.E2E
npm ci
npx playwright install --with-deps chromium
npm test
```

`npx playwright install` prints nothing when Chromium is already installed. On
Linux, `--with-deps` may ask for `sudo` to install system packages.

Playwright starts its own API on **5197** and Angular server on **5196**. Leave
these ports free; you do not need to start those servers manually. Its API
creates/migrates the separate `contacts_e2e` database with seeding disabled.
The suite clears that test database between scenarios; the normal development
`lk_contacts` database is unaffected with the checked-in configuration.

The three scenarios cover:

- Creating, editing, and deleting a persisted contact, with page reloads.
- Rejecting invalid input and saving after correction.
- Importing the 5-row and 300-row fixtures into an empty test database,
  checking Unicode data, search and paging, and rejecting duplicate re-imports.

To watch the browser, run `npm run test:headed` from `tests/Contacts.E2E`.

## Code overview

| Location | Responsibility |
| --- | --- |
| [`src/Contacts.Domain/`](src/Contacts.Domain/) | `Contact` entity and `Iban` value object |
| [`src/Contacts.Api/Contacts/`](src/Contacts.Api/Contacts/) | Endpoints, command/query handlers, validation, CSV import |
| [`src/Contacts.Api/Data/`](src/Contacts.Api/Data/) | EF Core mappings, PostgreSQL migrations, startup seed |
| [`web/src/app/contacts/`](web/src/app/contacts/) | Material screen, dialogs, HTTP service, ngrx state |
| [`tests/`](tests/) | xUnit tests and Playwright scenarios |
| [`seed-data/`](seed-data/) | Supplied CSV fixtures and optional large fixture |

`Contact` protects its state on construction and update. `Iban` removes
whitespace, normalizes case, and validates format and checksum. FluentValidation
returns field errors for API requests; a database constraint enforces IBAN
uniqueness. The CSV address columns are combined into one address string.

CQRS uses separate command/query records and handlers called directly by Minimal
API endpoints. Handlers use `ContactsDbContext` directly, and read-only queries
use `AsNoTracking`. ngrx Store and Effects manage list loading, search, paging,
and create/edit/delete actions; CSV upload calls the API and refreshes the list.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Docker cannot connect | Start Docker, then retry `docker compose up -d`. |
| Database connection refused | Run the readiness command above; check whether another PostgreSQL instance occupies port 5432. |
| API or Angular port is in use | Stop the other process using 5187 or 5186; browser tests use 5197 and 5196. |
| “Could not load contacts” | Check that the API terminal is still running and local Swagger opens. |
| “Not authenticated” | Use the login icon with `demo` / `demo`; this only appears when dummy auth is enabled. |
| “Wrong username or password” locally | Dummy auth is off by default, so the login icon cannot work. Ignore it, or start the API with `Auth__Enabled=true` (see technical notes). |
| CSV import reports duplicates | IBANs must be unique; the 5-row fixture is already included in the default seed. |

## Further details

[Technical notes](docs/TECHNICAL-NOTES.md) cover API examples, CSV behavior and
reset commands, database configuration, optional authentication, indexing,
the million-row fixture, and hosting.
