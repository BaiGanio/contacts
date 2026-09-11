# Contacts web

Angular Material frontend for the Contacts API, with ngrx Store and Effects for
contact browsing and CRUD actions. Contacts are persisted in PostgreSQL through
the API.

Follow the [root README](../README.md#local-quick-start) to start PostgreSQL and
the API first. Then, from this `web/` folder:

```sh
npm ci
npm start
```

Open [the application](http://localhost:5186). Development calls the API at
`http://localhost:5187`; `npm run build` creates a production build targeting the
hosted API.

See [build and test instructions](../README.md#build-and-test) for the Angular
production build and Playwright browser tests. There are no frontend unit tests.
