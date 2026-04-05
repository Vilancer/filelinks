# Architecture

## Pattern

**Nx monorepo** with multiple **publishable TypeScript libraries** (`projectType: "library"` in each package `project.json`). The repo is in an early scaffold phase: each library exports a single placeholder function and a minimal spec.

## Packages and roles

| Package             | Name (npm)            | Role                                                                  |
| ------------------- | --------------------- | --------------------------------------------------------------------- |
| `packages/core`     | `@filelinks/core`     | Shared core library — intended for shared logic.                      |
| `packages/cli`      | `filelinks`           | CLI-facing package (name `filelinks` in `packages/cli/package.json`). |
| `packages/git-hook` | `@filelinks/git-hook` | Git hook–related library.                                             |

Source entry points re-export lib modules:

- `packages/core/src/index.ts` → `./lib/core`
- `packages/cli/src/index.ts` → `./lib/cli`
- `packages/git-hook/src/index.ts` → `./lib/git-hook`

## Build and output

- **Build:** `@nx/js:tsc` compiles each package from `src/` to `dist/packages/<project>/` using `tsconfig.lib.json` per package.
- **Release:** `nx-release-publish` targets point at `dist/{projectRoot}` with version resolution from git tags (`currentVersionResolver: "git-tag"` in `project.json` files).

## Data flow

**Config → matcher:** Consumers load `filelinks.config.ts` (via **`jiti`** in `configLoader`) to obtain `{ links, config }`. Each `FileLinkEntry` may include optional **`linkType`** (`file-file` \| `dir-dir` \| `file-dir` \| `dir-file`) describing whether the relationship is file- vs directory-oriented; **matching still uses `minimatch`** on repo-root-relative paths from git—`linkType` is declarative metadata for CLI/list and future validation. `matchStagedLinks(stagedPaths, links)` returns fired entries and missing affected paths.

Cross-package: `tsconfig.base.json` path aliases wire `@filelinks/core` (and future `filelinks` CLI) together.

## Tooling boundaries

- **Lint:** ESLint via Nx-inferred `lint` targets (`eslint .` in each package `cwd`), using root `eslint.config.mjs` plus package-level `packages/*/eslint.config.mjs`.
- **Test:** Vitest via Nx-inferred `test` / `test-ci` (see `TESTING.md`).

## Entry points (future)

- A future **CLI binary** would typically be wired through `packages/cli` (bin field / Nx executor not present yet).
- **Git hooks** would consume `@filelinks/git-hook` from install or hook scripts (not configured in-repo yet).
