# Agent instructions — filelinks

Use this file with Cursor / other coding agents. Prefer **`CONTRIBUTING.md`** (includes a **documentation map**), **`.planning/codebase/ARCHITECTURE.md`**, and **`.planning/codebase/TESTING.md`** for full detail.

## What this repo is

**filelinks** is an Nx + pnpm monorepo: **`@filelinks/core`** holds config loading (**jiti**), git paths, **`matchStagedLinks`**, and **`normalizeError`**. Domain and config shapes are modeled with **Effect** (**`effect/Schema`**) as the primary typing and validation layer—define new structs/literals with `Schema.*`, decode at boundaries, and reuse exported schema-derived types. The **`filelinks`** CLI lives in **`packages/cli`** and consumes core.

## Commands (run from repo root)

- **Test (repo root, same as Husky):** `pnpm test`
- **Atomized CI (`test-ci`):** `pnpm run test:ci` (requires Nx Cloud / Agents for the orchestrator targets)
- **Build:** `pnpm exec nx run-many -t build`
- **Lint:** `pnpm exec nx run-many -t lint`
- **Single project:** `pnpm exec nx run core:test` (replace `core` with `cli` / `git-hook`)

## Linked CLI workflow (required after CLI edits)

- If you changed anything under `packages/cli`, always run verification in this order:
  1. `pnpm exec nx run cli:test --skip-nx-cache`
  2. `pnpm run cli:test:e2e`
  3. `pnpm exec nx run cli:build --skip-nx-cache`
  4. In the linked consumer project, run `pnpm run cli:link` to refresh the local symlinked CLI.
- Do not skip step 4 when validating changes against a linked external test project.

## CLI E2E testing convention

- Keep CLI end-to-end contract tests in `packages/cli/src/lib/cli.e2e.spec.ts`.
- Scope E2E to command-boundary behavior (`runCli`) and global option wiring (`--cwd`, `--config`, `--json`) before command execution internals.
- Use `[e2e]` in `describe(...)` names so E2E intent is obvious during triage and reviews.
- Run E2E locally with `pnpm run cli:test:e2e`.
- Husky pre-commit enforces this via `pnpm run cli:test:e2e` after `lint-staged` and `pnpm test`.

## Architecture rules

- **Effect Schema** (`effect/Schema`) is the default for **config and domain models** in core: add or change fields in `packages/core/src/lib/schema.ts` (and related modules), decode with `Schema.decodeUnknownSync` / `Schema.decodeUnknown` at load boundaries, and surface parse failures through **`normalizeError`** where appropriate. Do not introduce parallel validation stacks (e.g. Zod) for the same shapes without an explicit decision.
- **Public API** is exported from each package’s `src/index.ts` (barrel).
- **Specs** live as `*.spec.ts` next to sources under `packages/*/src/lib/`.
- **No duplicated domain literals in consumers:** when CLI/UI needs domain enums or labels (for example `linkType` options), import the canonical constants/helpers from `@filelinks/core` (for example `LINK_TYPES`, `LINK_TYPE_DESCRIPTIONS`) instead of hardcoding string unions in `packages/cli`.
- **`FileLinkEntry.linkType`** is optional: `file-file` \| `dir-dir` \| `file-dir` \| `dir-file`. Matching stays **minimatch** on repo-relative paths; do not break backward compatibility for configs without `linkType`.
- Follow **ESLint** (Nx flat config) and **Prettier** (`.prettierrc`). Pre-commit runs **lint-staged** + **`pnpm test`** + **`pnpm run cli:test:e2e`** via Husky; **commit-msg** enforces **Conventional Commits** (`feat`, `fix`, `chore`, …).

## Planning artifacts

Roadmap and requirements: **`.planning/ROADMAP.md`**, **`.planning/REQUIREMENTS.md`**. Phase 1 core context: **`.planning/phases/01-core-library/01-CONTEXT.md`**.
