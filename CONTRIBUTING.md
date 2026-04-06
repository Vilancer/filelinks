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

## Trying the CLI in another directory

Use this when you want a **fresh project** (`git init`, your own tree) and to run **`filelinks` without publishing** to npm.

1. **Build** in this repo (from the root):

   ```bash
   pnpm exec nx run cli:build
   ```

   The runnable entry is **`packages/cli/dist/src/index.js`** (after `tsc`).

2. **Run by absolute path** (no install in the other project). Replace `<filelinks-repo>` with the path to this monorepo clone:

   ```bash
   node <filelinks-repo>/packages/cli/dist/src/index.js --version
   node <filelinks-repo>/packages/cli/dist/src/index.js list --cwd /path/to/other/project
   ```

   Use **`--cwd`** so the CLI resolves config and git from that project’s root. Use **`--config ./path/to/filelinks.config.ts`** if the config is not in the usual discovery location.

3. **Optional:** Install the CLI into the other project without publishing (pick one):

   | Approach                | What it does                                                                                               | Where to run what                                                                                                                                                                                                                                                |
   | ----------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **Tarball**             | Behaves like a normal dependency                                                                           | In **`packages/cli`**: **`pnpm pack`**. In the **other** project: **`pnpm add /absolute/path/to/filelinks-*.tgz`**.                                                                                                                                              |
   | **Link by path**        | Symlink this repo’s **`packages/cli`** into the other app’s **`node_modules`** only — **no** “global” step | In the **other** project only: **`pnpm link /absolute/path/to/filelinks/packages/cli`**.                                                                                                                                                                         |
   | **Global registration** | Registers **`filelinks`** in pnpm’s **global** store once; then each consumer links **by package name**    | **①** In **`packages/cli`**: **`pnpm link`** (registers globally; some pnpm versions use **`pnpm link --global`** for the same idea). **②** In the **other** project: **`pnpm link filelinks`** — that is the step that actually installs the symlink **there**. |

   **Why “global”?** Step **①** only publishes the local package to pnpm’s global store so **②** can resolve the name **`filelinks`**. The **path** approach skips **①** and ties the consumer directly to a folder.

   **Undo / unlink:** In the **other** project: **`pnpm unlink filelinks`** (restores a registry install if **`filelinks`** is in **`package.json`**, or remove the dep). If you used **global registration**, also run **`pnpm unlink`** with **no arguments** in **`packages/cli`** to clear the global registration. Path-only links usually only need the consumer **`pnpm unlink`**. Details: **[pnpm link](https://pnpm.io/cli/link)**.

   If linking fails on your machine, use step 2 (**`node …/dist/src/index.js`**) — no **`pnpm link`** required.

4. **`@filelinks/core` in the consumer project** (required for **`list`**, **`check`**, and **`add`** once a config exists):

   Generated and hand-written configs use **`import { defineLinks } from '@filelinks/core'`**. The CLI loads that file with **jiti** from the **other** project’s tree, so Node resolves **`@filelinks/core`** from the **other** project’s **`node_modules`**, not from inside the linked **`filelinks`** package. Linking or installing **`filelinks` alone is not enough** — you still need **`@filelinks/core`** beside it.
   - **Published workflow:** `pnpm add -D @filelinks/core` (or npm) in the other project.
   - **Local monorepo workflow:** build core first (`pnpm exec nx run core:build` from this repo), then either **`pnpm link @filelinks/core`** in the other project (after **`pnpm link`** / **`pnpm link --global`** in **`packages/core`**), or add a **`file:`** dependency on **`packages/core`**. A relative path often works well, e.g. **`pnpm add -D @filelinks/core@file:../filelinks/packages/core`** when the other project sits next to this monorepo (adjust **`..`** segments so they reach the **`filelinks`** repo root). You can use an absolute path instead if you prefer.

5. **In the other project**, add a **`filelinks.config.ts`** (by hand or with **`filelinks add`**). **`filelinks list`** is the easiest first check (no git staging). **`filelinks check`** looks at **staged** paths only: stage a file that matches a **trigger**, and adjust **affects** / missing files to test warnings vs errors.

## Git hooks

**Husky** runs **lint-staged** on commit (ESLint + Prettier on staged files), then **`pnpm test`** (`nx run-many -t test`, no Nx Agents required). A **`commit-msg`** hook runs [**commitlint**](https://commitlint.js.org/) with the [Conventional Commits](https://www.conventionalcommits.org/) preset — e.g. `feat(cli): add check command`, `chore: bump deps`, `fix(core): handle empty paths` (type + optional scope + description). Subjects may mention **PascalCase** types or components when needed (see `commitlint.config.mjs`).

To skip hooks in an emergency: `git commit --no-verify` (use sparingly).

## Config authoring

- Default export from **`filelinks.config.ts`**: `export default defineLinks([...], { ... })`.
- Optional **`linkType`** on each link: `file-file`, `dir-dir`, `file-dir`, or `dir-file` (see `packages/core/src/lib/linkType.ts`).
