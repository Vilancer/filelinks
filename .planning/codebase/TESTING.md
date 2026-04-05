# Testing

## Framework

- **Vitest** `~4.1.0` with globals-style tests (`describe` / `it` / `expect`) — see `packages/core/src/lib/core.spec.ts` and siblings.
- **Nx** `@nx/vitest` plugin infers test targets from the repo; no checked-in `vitest.config.ts` — Vitest runs with CLI defaults in each package directory.

## How to run

From repository root (with dependencies installed):

```bash
pnpm exec nx run-many -t test
```

Per project:

```bash
pnpm exec nx test core
pnpm exec nx test cli
pnpm exec nx test git-hook
```

**CI-oriented:** Nx exposes `test-ci` and per-file targets such as `test-ci--src/lib/core.spec.ts` (atomized CI runs). Inspect with:

```bash
pnpm exec nx show project core --json
```

## Workspace

- **`vitest.workspace.ts`** registers glob patterns so tooling can discover `**/vitest.config.*` when added later.
- **Coverage:** `@vitest/coverage-v8` is available; Nx metadata references output under `coverage/packages/<project>/` for inferred test targets.

## Test layout

| Spec file | Exercises |
|-----------|-----------|
| `packages/core/src/lib/core.spec.ts` | `core()` from `packages/core/src/lib/core.ts` |
| `packages/cli/src/lib/cli.spec.ts` | `cli()` from `packages/cli/src/lib/cli.ts` |
| `packages/git-hook/src/lib/git-hook.spec.ts` | `gitHook()` from `packages/git-hook/src/lib/git-hook.ts` |

Tests are minimal smoke tests (string equality).

## TypeScript for tests

- **`tsconfig.spec.json`** per package includes `vitest/globals`, `vitest/importMeta`, and `vitest` types.

## Gaps

- Root `package.json` `scripts.test` still prints an error — prefer documenting Nx commands in README or fixing the script to delegate to Nx.
- No GitHub Actions (or other CI) config observed under `.github/` in this snapshot — wire `nx run-many -t test-ci` (or equivalent) when CI is added.
