#!/usr/bin/env bash
set -euo pipefail

namespace=contacts

postgres_password=$(openssl rand -base64 32)
signing_key=$(openssl rand -base64 48)
auth_username=$(openssl rand -hex 6)
auth_password=$(openssl rand -base64 24)

sudo k3s kubectl create namespace "$namespace" --dry-run=client -o yaml | sudo k3s kubectl apply -f -
sudo k3s kubectl -n "$namespace" create secret generic contacts-runtime \
  --from-literal=postgres-password="$postgres_password" \
  --from-literal=contacts-dbconn="Host=postgres;Port=5432;Database=contacts;Username=contacts;Password=$postgres_password;" \
  --from-literal=auth-signing-key="$signing_key" \
  --from-literal=auth-username="$auth_username" \
  --from-literal=auth-password="$auth_password" \
  --dry-run=client -o yaml | sudo k3s kubectl apply -f -

echo "Login for the contacts app (save these somewhere safe, they are not shown again):"
echo "  username: $auth_username"
echo "  password: $auth_password"
