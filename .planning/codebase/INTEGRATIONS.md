# External integrations

## Package registry and publishing

- **npm (public registry)** — default upstream for dependencies via pnpm; lockfile at `pnpm-lock.yaml`.
- **Verdaccio** — local registry for development/publish testing. Configuration: `.verdaccio/config.yml` (storage under `tmp/local-registry/storage`, uplink to `https://registry.npmjs.org`, open `access`/`publish` for local use). Started via Nx: root `project.json` target `local-registry` (`@nx/js:verdaccio`, port `4873`).

## Nx Cloud

- **`nx.json`** includes `nxCloudId` and `analytics: false` — workspace may connect to Nx Cloud for distributed caching; no application runtime dependency on external APIs from source code.

## Application-level services

The packages under `packages/` are thin stubs (`core()`, `cli()`, `gitHook()` returning fixed strings). There are **no** embedded SDKs, HTTP clients, databases, OAuth providers, or webhook handlers in the current source tree.

## Future integration points

When the product grows, typical touchpoints will be:

- **`packages/cli/`** — CLI entry and any future network or filesystem integrations.
- **`packages/git-hook/`** — Git hooks and SCM-related behavior.
- **`packages/core/`** — shared domain logic and types used by CLI and hooks.

Document new third-party services here as they are added (with env var names and config file paths, not secrets).
