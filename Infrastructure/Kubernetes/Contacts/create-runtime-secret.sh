#!/usr/bin/env bash
set -euo pipefail

# Run this once on the Pi (ssh lk@jupiter.local) before the first deploy, and again any
# time a value needs rotating. Every value below is generated fresh here — none of them
# are the local-dev dummy values (appsettings.Development.json's lk_contacts password,
# or Auth:SigningKey/Username/Password's dev-only demo/demo). GitHub Actions never sees
# or sets any of this: it only builds and pushes the image (see .github/workflows/
# deploy-api.yml); Flux only ever reads the image tag, never secret data.

namespace=contacts

postgres_password=$(openssl rand -base64 32)
signing_key=$(openssl rand -base64 48)
auth_username=$(openssl rand -hex 6)
auth_password=$(openssl rand -base64 24)

kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "$namespace" create secret generic contacts-runtime \
  --from-literal=postgres-password="$postgres_password" \
  --from-literal=contacts-dbconn="Host=postgres;Port=5432;Database=contacts;Username=contacts;Password=$postgres_password;" \
  --from-literal=auth-signing-key="$signing_key" \
  --from-literal=auth-username="$auth_username" \
  --from-literal=auth-password="$auth_password" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Login for the contacts app (save these somewhere safe, they are not shown again):"
echo "  username: $auth_username"
echo "  password: $auth_password"
