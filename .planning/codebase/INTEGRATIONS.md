# External integrations

**Snapshot:** No application code or configuration files reference external services, databases, or APIs. This document records the **current** state; update when manifests or integration code appear.

## APIs and HTTP clients

- **None.** No `fetch` wrappers, OpenAPI specs, or HTTP client configuration in the repository.

## Databases and persistence

- **None.** No ORM config, migration folders, connection strings, or schema files (e.g. no `prisma/`, `migrations/`, `docker-compose.yml` for databases).

## Authentication and identity

- **None.** No OAuth, JWT, or session middleware; no auth provider SDKs.

## Webhooks and callbacks

- **None.** No webhook registration or signature verification code.

## CI/CD and hosting

- **None observed in-repo.** No `.github/workflows/`, GitLab CI, or platform-specific deploy configs at the repository root.

## Package registries and tooling

- **Not applicable yet.** No `package.json`, so no npm registry scope or private feed configuration.

## Secrets and environment

- `.gitignore` excludes `.env` and `.env.*` (with `!.env.example` allowed). No `.env.example` is present yet; when added, document required variables here.

## Summary

| Integration type | Status |
|------------------|--------|
| Third-party APIs | Not integrated |
| Databases | Not integrated |
| Auth providers | Not integrated |
| Webhooks | Not integrated |

Revisit this file when the first dependency or integration is introduced (e.g. after adding `package.json` or equivalent and any service clients).
