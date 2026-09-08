// TEMPORARY development proxy (checkpoint 3.6).
//
// The Angular dev server (http://localhost:5186) and the API
// (http://localhost:5187) run on different origins, so the browser
// blocks direct calls to the API with CORS. Forwarding "/api" through
// this dev-server proxy avoids needing a CORS policy on the untouched
// API while it still runs locally over plain HTTP.
//
// Remove this file and its "proxyConfig" entry in angular.json once the
// real hosting/CORS flow is introduced (checkpoint 7 or later).
module.exports = {
  '/api': {
    target: 'http://localhost:5187',
    secure: false,
  },
};
