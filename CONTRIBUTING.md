# Contributing to filelinks

## Repository layout

- **`packages/core`** — `@filelinks/core`: schema (`defineLinks`), `linkType` helpers, config loader (**jiti**), git reader, `matchStagedLinks`, `resolvePrompt`.
- **`packages/cli`** — `filelinks` npm package (CLI; Phase 4 MVP).
- **`packages/git-hook`** — `@filelinks/git-hook` (post-v1 hook helpers).

Planning and deep maps live under **`.planning/`** (roadmap, requirements, `codebase/*.md`).

## Where architecture, stack, and conventions live

| Topic                                                                                                                   | Location                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Agents / AI** — Effect Schema as default for core models, barrels, `*.spec.ts` layout, lint/format, planning pointers | **`AGENTS.md`** (repo root)                                                                                                           |
| **Packages & data flow** — Nx layout, `jiti` config, matcher, tool boundaries                                           | **`.planning/codebase/ARCHITECTURE.md`**                                                                                              |
| **Tests** — Vitest, Nx `test` / `test-ci`, spec placement, `tsconfig.spec.json`                                         | **`.planning/codebase/TESTING.md`**                                                                                                   |
| **Product / phases** — roadmap, requirements, per-phase context                                                         | **`.planning/ROADMAP.md`**, **`.planning/REQUIREMENTS.md`**, and **`.planning/phases/<name>/`** (e.g. **`04-cli-mvp/04-CONTEXT.md`**) |
| **Path aliases**                                                                                                        | **`tsconfig.base.json`** (`@filelinks/core`, etc.)                                                                                    |
| **ESLint**                                                                                                              | Root **`eslint.config.mjs`** + **`packages/*/eslint.config.mjs`**                                                                     |
| **Prettier**                                                                                                            | **`.prettierrc`**                                                                                                                     |
| **Commits**                                                                                                             | **`commitlint.config.mjs`** (Conventional Commits; see Git hooks below)                                                               |

**Quick conventions:** Public API from each package’s **`src/index.ts`**. Library code under **`packages/<name>/src/lib/`** with specs as **`*.spec.ts`** beside sources. Build output paths are per-package **`project.json`** → **`targets.build.options.outputPath`** (CLI: **`packages/cli/dist/`**, core: **`packages/core/dist/`**). If **`ARCHITECTURE.md`** or **`TESTING.md`** disagree with **`project.json`** or this file, treat the repo config and **`AGENTS.md`** as current.

## Common commands (Nx + pnpm)

From the repo root:

| Task              | Command                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Install           | `pnpm install`                                                                                              |
| Build all libs    | `pnpm exec nx run-many -t build`                                                                            |
| Test all packages | `pnpm test` (single run, matches Husky) or `pnpm run test:ci` (atomized `test-ci`; needs Nx Cloud / Agents) |
| Lint all          | `pnpm exec nx run-many -t lint`                                                                             |
| Core only         | `pnpm exec nx run core:test` / `core:build` / `core:lint`                                                   |
| CLI only          | `pnpm exec nx run cli:test` / `cli:build` / `cli:lint`                                                      |

Path aliases: `@filelinks/core` → `packages/core/src/index.ts` (`tsconfig.base.json`).

## Local development: this repo + another project

Use a **second checkout or app** when you want to run **`filelinks`** and your own tests **without publishing**. You always wire **two** packages from this monorepo into the other project: **`@filelinks/core`** and **`filelinks`** (the CLI). Hand-written configs do `import { defineLinks } from '@filelinks/core'`; **jiti** loads that file from the **other** project’s tree, so **`@filelinks/core`** must resolve from **that** project’s **`node_modules`**. The CLI entry comes from the linked **`filelinks`** package.

### 1. Build (in the **filelinks** repo root)

After changes under **`packages/core`** or **`packages/cli`**:

```bash
pnpm exec nx run core:build
pnpm exec nx run cli:build
```

One shot: `pnpm exec nx run-many -t build --projects=core,cli`.

### 2. Link (in the **other** project)

Paths below assume your clone is a **sibling** named **`filelinks`** (so `../filelinks/packages/...` is correct). Rename or add `..` segments if your layout differs.

**Direct commands** (equivalent to the two scripts many people keep in the consumer’s `package.json`):

```bash
pnpm link ../filelinks/packages/core
pnpm link ../filelinks/packages/cli
```

**Or** add the same thing as scripts in the **other** project’s `package.json` and run them after each rebuild:

```json
{
  "scripts": {
    "core:link": "pnpm link ../filelinks/packages/core && pnpm install",
    "cli:link": "pnpm link ../filelinks/packages/cli && pnpm install"
  }
}
```

Then `pnpm run core:link` and `pnpm run cli:link`. Order does not matter; run **both** so core and CLI match the tree you just built.

The root **filelinks** `package.json` also defines **`core:link`** / **`cli:link`** as a **copy-paste template** for that other project — they are not meant to be run from **inside** this monorepo’s root (the relative path assumes you are in a sibling app).

### 3. Work in the other project

Run your tests, add **`filelinks.config.ts`**, use **`filelinks list`** (no git staging needed for a quick check), **`filelinks check`** (uses **staged** paths only), etc.

### Fallback: no `pnpm link`

From the other machine or CI, call the built CLI by path (no install in the other project):

```bash
node /path/to/filelinks/packages/cli/dist/src/index.js list --cwd /path/to/other/project
```

Use **`--cwd`** for repo root; **`--config ./path/to/filelinks.config.ts`** if discovery is non-standard.

### Undo links (in the **other** project)

```bash
pnpm unlink @filelinks/core
pnpm unlink filelinks
pnpm install
```

Avoid **`pnpm link filelinks`** by bare package name in ways that pull a **global** or registry link instead of your path — that can replace a good path symlink and break local dev.

### Without a local clone

From npm after publish: `pnpm add -D @filelinks/core filelinks` in the other project (or equivalent).

## Git hooks

**Husky** runs **lint-staged** on commit (ESLint + Prettier on staged files), then **`pnpm test`** (`nx run-many -t test`, no Nx Agents required). A **`commit-msg`** hook runs [**commitlint**](https://commitlint.js.org/) with the [Conventional Commits](https://www.conventionalcommits.org/) preset — e.g. `feat(cli): add check command`, `chore: bump deps`, `fix(core): handle empty paths` (type + optional scope + description). Subjects may mention **PascalCase** types or components when needed (see `commitlint.config.mjs`).

To skip hooks in an emergency: `git commit --no-verify` (use sparingly).

## Config authoring

- Default export from **`filelinks.config.ts`**: `export default defineLinks([...], { ... })`.
- Optional **`linkType`** on each link: `file-file`, `dir-dir`, `file-dir`, or `dir-file` (see `packages/core/src/lib/linkType.ts`).
