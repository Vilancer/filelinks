# Concerns and technical debt

## Product maturity

- **Placeholder implementations:** `packages/core/src/lib/core.ts`, `packages/cli/src/lib/cli.ts`, and `packages/git-hook/src/lib/git-hook.ts` only return fixed strings. There is no real file-linking, CLI UX, or git integration yet — risk of shipping scaffolding if version tags/releases run before features exist.

## Workspace ergonomics

- **Root `package.json` test script:** Still `echo "Error: no test specified" && exit 1` — misleading for newcomers; should invoke Nx tests or be removed.
- **Name overlap:** Root workspace name `filelinks` matches the CLI package name in `packages/cli/package.json`. Documentation and imports should disambiguate “monorepo root” vs “the `filelinks` npm package.”

## CI and coverage

- **No `.github/workflows`** (or similar) in tree — automated test/lint on PRs may be missing unless configured elsewhere.
- **Coverage:** Tooling is present (`@vitest/coverage-v8`, Nx outputs) but no documented threshold or enforcement in-repo.

## Security and supply chain

- **Dependencies:** Standard npm ecosystem; keep lockfile updated and audit for production-boundaries when CLI touches user repos or network.
- **Verdaccio:** `.verdaccio/config.yml` allows open publish for local dev — appropriate for localhost only; do not expose that config on public networks without auth.

## Performance

- Not applicable at current scale (trivial synchronous functions). Revisit if the CLI scans large trees or hooks run on every keystroke.

## Observability

- No logging, metrics, or tracing libraries in use yet — acceptable for scaffold; plan before adding networked features.
