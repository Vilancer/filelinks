# Contributing to filelinks

## Repository layout

- **`packages/core`** — `@vilancer/filelinks-core`: schema (`defineLinks`), `linkType` helpers, config loader (**jiti**), git reader, `matchStagedLinks`, `resolvePrompt`.
- **`packages/cli`** — `@vilancer/filelinks` (CLI; bin name `filelinks`).
- **`packages/git-hook`** — `@vilancer/filelinks-git-hook` (post-v1 hook helpers).

Planning and deep maps live under **`.planning/`** (roadmap, requirements, `codebase/*.md`).

## Where architecture, stack, and conventions live

| Topic                                                                                                                   | Location                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Agents / AI** — Effect Schema as default for core models, barrels, `*.spec.ts` layout, lint/format, planning pointers | **`AGENTS.md`** (repo root)                                                                                                           |
| **Packages & data flow** — Nx layout, `jiti` config, matcher, tool boundaries                                           | **`.planning/codebase/ARCHITECTURE.md`**                                                                                              |
| **Tests** — Vitest, Nx `test` / `test-ci`, spec placement, `tsconfig.spec.json`                                         | **`.planning/codebase/TESTING.md`**                                                                                                   |
| **Product / phases** — roadmap, requirements, per-phase context                                                         | **`.planning/ROADMAP.md`**, **`.planning/REQUIREMENTS.md`**, and **`.planning/phases/<name>/`** (e.g. **`04-cli-mvp/04-CONTEXT.md`**) |
| **Path aliases**                                                                                                        | **`tsconfig.base.json`** (`@vilancer/filelinks-core`, etc.)                                                                           |
| **ESLint**                                                                                                              | Root **`eslint.config.mjs`** + **`packages/*/eslint.config.mjs`**                                                                     |
| **Prettier**                                                                                                            | **`.prettierrc`**                                                                                                                     |
| **Commits**                                                                                                             | **`commitlint.config.mjs`** (Conventional Commits; see Git hooks below)                                                               |
| **AI agents (v1.1 shipped)** — `check --run-agents`, config, smoke                                                      | **README.md** → _Running agents (v1.1)_; this file → _AI agents (v1.1)_ below                                                         |

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

Path aliases: `@vilancer/filelinks-core` → `packages/core/src/index.ts` (`tsconfig.base.json`).

## Local development: this repo + another project

Use a **second checkout or app** when you want to run **`filelinks`** and your own tests **without publishing**. You always wire **two** packages from this monorepo into the other project: **`@vilancer/filelinks-core`** and **`@vilancer/filelinks`** (the CLI). Hand-written configs do `import { defineLinks } from '@vilancer/filelinks-core'`; **jiti** loads that file from the **other** project’s tree, so **`@vilancer/filelinks-core`** must resolve from **that** project’s **`node_modules`**. The CLI entry comes from the linked **`@vilancer/filelinks`** package.

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
pnpm unlink @vilancer/filelinks-core
pnpm unlink @vilancer/filelinks
pnpm install
```

Avoid **`pnpm link @vilancer/filelinks`** by bare package name in ways that pull a **global** or registry link instead of your path — that can replace a good path symlink and break local dev.

### Without a local clone

From npm after publish: `pnpm add -D @vilancer/filelinks-core @vilancer/filelinks` in the other project (or equivalent).

## Git hooks

**Husky** runs **lint-staged** on commit (ESLint + Prettier on staged files), then **`pnpm test`** (`nx run-many -t test`, no Nx Agents required). A **`commit-msg`** hook runs [**commitlint**](https://commitlint.js.org/) with the [Conventional Commits](https://www.conventionalcommits.org/) preset — e.g. `feat(cli): add check command`, `chore: bump deps`, `fix(core): handle empty paths` (type + optional scope + description). Subjects may mention **PascalCase** types or components when needed (see `commitlint.config.mjs`).

To skip hooks in an emergency: `git commit --no-verify` (use sparingly).

## Config authoring

- Default export from **`filelinks.config.ts`**: `export default defineLinks([...], { ... })`.
- Optional **`linkType`** on each link: `file-file`, `dir-dir`, `file-dir`, or `dir-file` (see `packages/core/src/lib/linkType.ts`).
- `filelinks add` can now capture optional agent config interactively:
  - global defaults (`config.agent`) and
  - per-link overrides (`entry.agent`)
    with explicit runtime selection (`local` + `cwd`, or `cloud` + `repos`).
- `filelinks add` can also capture model and prompt settings:
  - model picker (provider `listModels` + fallback),
  - global/per-link `prompt` (`systemPrompt`, optional `temperature`, optional `maxTokens`).
- **`prompt.temperature` / `prompt.maxTokens` (v1.1):** Stored in config and included in the assembled agent prompt as text metadata only; they are **not** sent as Cursor SDK `Agent.create` generation options in v1.1.
- **`agent.cloud.repos` (v1.1):** Full `https://` / `http://` URLs pass through; bare `org/repo` is GitHub shorthand (`https://github.com/org/repo`). Use full URLs for non-GitHub hosts.

## AI agents (v1.1)

User-facing flag, config shape, and **`CURSOR_API_KEY`** are documented in **README.md** → _Running agents (v1.1)_.

### API key resolution (CLI)

For `filelinks check --run-agents`, Cursor credentials resolve in this order:

1. `--cursor-api-key`
2. `CURSOR_API_KEY` from environment
3. `.env.local` in the effective `--cwd`
4. `.env` in the effective `--cwd`

### Manual smoke (real Cursor)

1. Export **`CURSOR_API_KEY`** (Cursor dashboard → API keys).
2. In a repo with **`filelinks.config.ts`**, set global or per-link **`agent`** with **`provider: 'cursor'`**, **`runtime: 'local'`**, and **`local.cwd`** pointing at the repo you want the agent to use.
3. Stage paths that satisfy **`trigger-or-affects`** for at least one link, then run:

   ```bash
   filelinks check --run-agents
   ```

   Use **`--json --run-agents`** to inspect the optional **`agentRuns`** array (one row per policy-eligible link, including **`status: 'error'`** when the API key is missing).

4. If using `filelinks add`, verify generated config includes the expected `agent` blocks (global and/or per-link) before smoke runs.
5. If testing model/prompt wizard paths, verify generated `agent.model`, optional `agent.modelParams`, and `prompt` fields in both global and per-link scopes.
6. For large model catalogs, use the add wizard's search field (debounced filtering) to quickly locate variants.

### CI and unit tests

CI and pre-commit **do not** call the live Cursor API. Agent behavior is covered with **mocks**:

- **`packages/cli/src/lib/cli.e2e.spec.ts`** — `[e2e] check --run-agents` wires the flag through Commander.
- **`packages/cli/src/lib/runCheck.spec.ts`** — orchestration and JSON **`agentRuns`**.
- **`packages/core/src/lib/providers/cursorProvider.spec.ts`** — provider errors and SDK boundary (mocked).

Run **`pnpm test`** and **`pnpm run cli:test:e2e`** from the repo root after CLI/core changes.

## Releasing a milestone (main + tag + GitHub release)

Use this flow after milestone work is merged to `main`.

1. Ensure `main` is up to date and clean:

   ```bash
   git checkout main
   git pull --ff-only
   git status
   ```

2. Create annotated tag:

   ```bash
   git tag -a v1.1.0 -m "filelinks v1.1.0"
   ```

3. Create GitHub release from prepared notes:

   ```bash
   gh release create v1.1.0 \
     --title "filelinks v1.1.0" \
     --notes-file docs/releases/v1.1.0.md
   ```

4. Push tag (if not already pushed by `gh release create` in your setup):

   ```bash
   git push origin v1.1.0
   ```

Keep release notes in [`docs/releases/v1.1.0.md`](docs/releases/v1.1.0.md) updated before running the release commands.

## Publishing to npm

Published packages (under the **`vilancer`** npm org):

| Package         | npm name                   | Bin         |
| --------------- | -------------------------- | ----------- |
| `packages/cli`  | `@vilancer/filelinks`      | `filelinks` |
| `packages/core` | `@vilancer/filelinks-core` | —           |

Do **not** publish `packages/git-hook` yet (`private: true`).

Prerequisites: `npm whoami` is an owner/member of the **`vilancer`** org; 2FA OTP ready.

```bash
# 1. Build
pnpm exec nx run-many -t build --projects=core,cli

# 2. Bump versions (example: first public 1.0.0)
pnpm exec nx release version --specifier=1.0.0 --projects=core,cli

# 3. Publish (will prompt for OTP with auth-and-writes 2FA)
pnpm exec nx release publish --projects=core,cli

# 4. Smoke
mkdir -p /tmp/fl-smoke && cd /tmp/fl-smoke
pnpm init
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
pnpm exec filelinks --version
```

Dry-run against Verdaccio: `pnpm exec nx run filelinks:local-registry`, then publish with `--registry=http://localhost:4873`.

### Testing the CLI in another project

When validating **`--run-agents`** against an external app, use the **linked-consumer workflow** above (build **core** + **cli** in this repo, then **`pnpm link`** both packages in the other project). Rebuild and re-link after changes; do not rely on a stale global **`filelinks`** install.
