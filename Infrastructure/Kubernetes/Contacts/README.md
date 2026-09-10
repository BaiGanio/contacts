# Contacts API production k3s deployment

Reuses the pattern already running for BGAPI on the same Pi5 cluster (see
`TeamKepler/BGAPI/Infrastructure/Kubernetes/BGAPI/README.md`) but simplified: one
app, one database, a public GitHub repo, and a public GHCR image, so there is no
Docker Hub pull secret and no Git push secret shared with anything else.

## The pipeline

1. Tagging a commit `vX.Y.Z` and pushing the tag triggers
   `.github/workflows/deploy-api.yml`, which builds the API's Docker image for
   `linux/arm64` and pushes it to `ghcr.io/baiganio/contacts-api:X.Y.Z`. This workflow
   never touches the cluster — no SSH key or kubeconfig lives in GitHub.
2. Flux's `ImageRepository/contacts-api` (already-installed `image-reflector-controller`,
   shared with BGAPI) scans that package every 5 minutes. `ImagePolicy/contacts-api`
   picks the highest semver tag and resolves its digest.
3. `ImageUpdateAutomation/contacts-api` rewrites the `# {"$imagepolicy": ...}`-marked
   image line in `contacts.yaml` to `tag@digest` and pushes straight to `master`
   (`[skip ci]` so that commit doesn't also retrigger `deploy-pages.yml`).
4. `GitRepository/contacts` + `Kustomization/contacts` (flux-system) then apply the
   updated manifest into the `contacts` namespace.

`contacts.yaml`'s image line is a **live mirror of what's deployed, written by Flux** —
don't hand-edit it.

## First-time bootstrap

Three secrets need to exist before any of this works. None of them reuse a value from
local dev or from BGAPI's `bgapi-runtime` secret — see [[feedback-no-ai-trace-in-commits]]-
style hygiene, but for credentials instead of commits.

1. **Runtime secret** (Postgres password, DB connection string, JWT signing key, and a
   real username/password replacing the dummy `demo`/`demo` PoC login) — generated fresh
   by a script, run once on the Pi:
   ```bash
   ssh lk@jupiter.local 'bash -s' < Infrastructure/Kubernetes/Contacts/create-runtime-secret.sh
   ```
   Save the printed username/password; they are not shown again. Re-run any time a
   value needs rotating (it's idempotent — `kubectl apply`, not `create`).

2. **Git push credentials for Flux** (`contacts-git-credentials`, in `flux-system`) — a
   fine-grained GitHub PAT scoped to just this repo with `Contents: Read and write`,
   since `ImageUpdateAutomation` needs to push commits to `master` even though cloning
   the public repo needs no auth:
   ```bash
   ssh lk@jupiter.local \
     'sudo k3s kubectl create secret generic contacts-git-credentials \
        --namespace flux-system \
        --from-literal=username=git \
        --from-literal=password=<PAT> \
        --dry-run=client -o yaml | sudo k3s kubectl apply -f -'
   ```

3. **DNS + ingress**: point `contacts-api.baiganio.io` at the cluster's existing ingress
   IP, same as `api.baiganio.io`.

Then apply the one-time Flux bootstrap files by hand (like BGAPI's):
```bash
ssh lk@jupiter.local 'sudo k3s kubectl apply -f -' < Infrastructure/Kubernetes/Contacts/flux/git-source.yaml
ssh lk@jupiter.local 'sudo k3s kubectl apply -f -' < Infrastructure/Kubernetes/Contacts/flux/image-automation.yaml
```

First deploy has no image tag to pull yet — push a `v0.1.0` tag first so GitHub Actions
publishes something for Flux to find, then apply `contacts.yaml` by hand once to bootstrap
the namespace/Postgres/Deployment (Flux takes over reconciling it from here):
```bash
ssh lk@jupiter.local 'sudo k3s kubectl apply --dry-run=server -f -' < Infrastructure/Kubernetes/Contacts/contacts.yaml
ssh lk@jupiter.local 'sudo k3s kubectl apply -f -' < Infrastructure/Kubernetes/Contacts/contacts.yaml
```

## Reading live state

The `cluster-viewer` read-only ServiceAccount already set up for BGAPI
(`~/.kube/bgapi-readonly.yaml`, bound to the built-in `view` ClusterRole via a
`ClusterRoleBinding`) can already read the `contacts` namespace too — a
`ClusterRoleBinding` isn't namespace-scoped, so nothing new is needed here:
```bash
ssh lk@jupiter.local 'KUBECONFIG=~/.kube/bgapi-readonly.yaml kubectl -n contacts get deploy contacts-api \
  -o jsonpath="{.spec.template.spec.containers[0].image}{\"\n\"}"'
```

## Health probe

Readiness and liveness target `/health`, an explicitly anonymous endpoint added in
`Program.cs` specifically for this deployment — kubelet sends no bearer token, so a
probe target must be anonymous by design (BGAPI's release 0.1.2 restart-looped in
production for pointing probes at a route whose anonymity was incidental).

## Rollback

```bash
ssh lk@jupiter.local 'sudo k3s kubectl -n contacts rollout undo deployment/contacts-api'
```
