# Agent instructions — filelinks

Use this file with Cursor / other coding agents. Prefer **`CONTRIBUTING.md`** and **`.planning/codebase/ARCHITECTURE.md`** for full detail.

## What this repo is

**filelinks** is an Nx + pnpm monorepo: **`@filelinks/core`** holds the config schema, **`linkType`** metadata, config loading (**jiti**), git paths, and **`matchStagedLinks`**. The **`filelinks`** CLI package is built in Phase 3 (roadmap).

## Commands (run from repo root)

- **Test (repo root, same as Husky):** `pnpm test`
- **Atomized CI (`test-ci`):** `pnpm run test:ci` (requires Nx Cloud / Agents for the orchestrator targets)
- **Build:** `pnpm exec nx run-many -t build`
- **Lint:** `pnpm exec nx run-many -t lint`
- **Single project:** `pnpm exec nx run core:test` (replace `core` with `cli` / `git-hook`)

## Architecture rules

- **Public API** is exported from each package’s `src/index.ts` (barrel).
- **Specs** live as `*.spec.ts` next to sources under `packages/*/src/lib/`.
- **`FileLinkEntry.linkType`** is optional: `file-file` \| `dir-dir` \| `file-dir` \| `dir-file`. Matching stays **minimatch** on repo-relative paths; do not break backward compatibility for configs without `linkType`.
- Follow **ESLint** (Nx flat config) and **Prettier** (`.prettierrc`). Pre-commit runs **lint-staged** + **`pnpm test`** via Husky; **commit-msg** enforces **Conventional Commits** (`feat`, `fix`, `chore`, …).

## Planning artifacts

Roadmap and requirements: **`.planning/ROADMAP.md`**, **`.planning/REQUIREMENTS.md`**. Phase 1 core context: **`.planning/phases/01-core-library/01-CONTEXT.md`**.
