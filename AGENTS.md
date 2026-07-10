# Agent instructions — filelinks

Use this file with Cursor / other coding agents. Prefer **`CONTRIBUTING.md`** (includes a **documentation map**), **`.planning/codebase/ARCHITECTURE.md`**, and **`.planning/codebase/TESTING.md`** for full detail.

## What this repo is

**filelinks** is an Nx + pnpm monorepo: **`@vilancer/filelinks-core`** holds config loading (**jiti**), git paths, **`matchStagedLinks`**, and **`normalizeError`**. Domain and config shapes are modeled with **Effect** (**`effect/Schema`**) as the primary typing and validation layer—define new structs/literals with `Schema.*`, decode at boundaries, and reuse exported schema-derived types. The **`@vilancer/filelinks`** CLI (bin **`filelinks`**) lives in **`packages/cli`** and consumes core.

## Commands (run from repo root)

- **Test (repo root, same as Husky):** `pnpm test`
- **Atomized CI (`test-ci`):** `pnpm run test:ci` (requires Nx Cloud / Agents for the orchestrator targets)
- **Build:** `pnpm exec nx run-many -t build`
- **Lint:** `pnpm exec nx run-many -t lint`
- **Single project:** `pnpm exec nx run core:test` (replace `core` with `cli` / `git-hook`)

## Linked consumer workflow (CLI + core)

- Full detail: **`CONTRIBUTING.md`** → _Local development: this repo + another project_.
- Typical loop against a **second project**: in this repo **`pnpm exec nx run core:build`** and **`pnpm exec nx run cli:build`** (or **`nx run-many -t build --projects=core,cli`**); in the other project refresh **both** links — **`pnpm link ../filelinks/packages/core`** and **`pnpm link ../filelinks/packages/cli`** (or **`pnpm run core:link`** / **`pnpm run cli:link`** if those scripts exist there with the same paths).
- **CLI-only verification in this repo** (before linking out): `pnpm exec nx run cli:test --skip-nx-cache`, then **`pnpm run cli:test:e2e`**, then **`pnpm exec nx run cli:build --skip-nx-cache`**. Do not skip the consumer refresh when you are validating against a linked external project.

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
- **No duplicated domain literals in consumers:** when CLI/UI needs domain enums or labels (for example `linkType` options), import the canonical constants/helpers from `@vilancer/filelinks-core` (for example `LINK_TYPES`, `LINK_TYPE_DESCRIPTIONS`) instead of hardcoding string unions in `packages/cli`.
- **`FileLinkEntry.linkType`** is optional: `file-file` \| `dir-dir` \| `file-dir` \| `dir-file`. Triggers always use **minimatch** on repo-relative paths. Affects use minimatch; for **`file-dir`** / **`dir-dir`**, a directory affect is also satisfied by any staged path under that directory (prefix rule). Configs **without** `linkType` keep minimatch-only affect matching—stay backward compatible.
- Follow **ESLint** (Nx flat config) and **Prettier** (`.prettierrc`). Pre-commit runs **lint-staged** + **`pnpm test`** + **`pnpm run cli:test:e2e`** via Husky; **commit-msg** enforces **Conventional Commits** (`feat`, `fix`, `chore`, …).

## Planning artifacts

Roadmap and requirements: **`.planning/ROADMAP.md`**, **`.planning/REQUIREMENTS.md`**. Phase 1 core context: **`.planning/phases/01-core-library/01-CONTEXT.md`**.

## Cursor Cloud specific instructions

### What runs here

**filelinks** is a CLI/library monorepo — no HTTP server or database. Automated verification is **`pnpm test`**, **`pnpm run cli:test:e2e`**, and building **`core`** + **`cli`**. Manual smoke: **`filelinks list`** / **`filelinks check`** against a git repo with staged files.

### Toolchain

- **pnpm** `10.32.1` via **`corepack prepare pnpm@10.32.1 --activate`** (pinned in root **`package.json`**).
- **Node** 20+ (VM uses 22.x). No **`.nvmrc`** in repo.
- **`git`** is required only for real **`filelinks check`** (staged paths); unit/E2E tests mock git.

### Native dependency: `sqlite3`

The Cursor SDK pulls in **`sqlite3`** (native bindings). pnpm 10 blocks its install script unless listed in **`pnpm-workspace.yaml`** → **`allowBuilds`**. Without it, **`pnpm run cli:test:e2e`** fails loading **`@vilancer/filelinks-core`**. After **`pnpm install`**, run **`pnpm exec nx run-many -t build --projects=core,cli`** before using the **`filelinks`** bin (root **`node_modules/.bin/filelinks`** warns until **`packages/cli/dist/`** exists).

### Optional services

| Service                           | When needed                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| **Cursor API** (`CURSOR_API_KEY`) | Manual **`filelinks check --run-agents`** only; CI mocks the provider                       |
| **Verdaccio**                     | **`pnpm exec nx run filelinks:local-registry`** → `http://localhost:4873` (publish testing) |
| **Nx Cloud**                      | **`pnpm run test:ci`** atomization only                                                     |

### Hello-world smoke (from repo root)

```bash
pnpm exec nx run-many -t build --projects=core,cli
node packages/cli/dist/src/index.js --version
node packages/cli/dist/src/index.js list --cwd packages/core/src/lib/__fixtures__/sample-filelinks-config
```

### Manual linked consumer (`examples/test-consumer`)

**VM / Desktop path:** **`/workspace/examples/test-consumer`**. **Not in git** — **`examples/test-consumer/`** and **`examples/test-consumer.template/`** are both in root **`.gitignore`**. Create locally when needed (or reuse an existing folder on the VM).

Mirrors a sibling **`test`** project with **`link:../filelinks/packages/{core,cli}`** on a dev machine. Monorepo copy uses **`link:../../packages/{core,cli}`**.

**One-time local scaffold** (from repo root; do not commit this tree):

```bash
mkdir -p examples/test-consumer/apps/api/src/routes examples/test-consumer/apps/api/docs
# package.json: name "test", link:../../packages/{core,cli}, scripts list/check/check:agents
# filelinks.config.ts: trigger apps/api/src/routes/user.ts → apps/api/docs/openapi.yaml
# .gitignore: node_modules/ .env .env.local
cd examples/test-consumer && pnpm install --ignore-workspace && git init
echo 'CURSOR_API_KEY=' > .env.local   # set key locally only
```

**Agent rule:** After **any** change to **`packages/core`** or **`packages/cli`**, always re-verify through **`examples/test-consumer`** (not only unit/E2E in the monorepo):

1. **`pnpm exec nx run-many -t build --projects=core,cli`** (repo root)
2. **`cd examples/test-consumer && pnpm install --ignore-workspace`**
3. **`pnpm run list`** → **`git add apps/api/src/routes/user.ts`** → **`pnpm run check`**
4. For agent work: **`pnpm run check:agents`** (reads **`.env.local`**)

**Show the user** terminal output from steps 3–4 (or a Desktop demo) when validating CLI/core behavior or closing a feature.

**Secrets:** **`CURSOR_API_KEY`** only in **`examples/test-consumer/.env.local`**. Never add, commit, or track anything under **`examples/test-consumer*`**.

### Lint caveat

**`pnpm exec nx run-many -t lint`** may report **`@nx/dependency-checks`** errors on **`core`** / **`git-hook`** (`vitest` / `@nx/vite` not in package **`dependencies`**). **`cli:lint`** passes; this is a known repo lint config issue, not an install problem.
