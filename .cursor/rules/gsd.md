<!-- gsd-project-start source:PROJECT.md -->
## Project

**filelinks**

**filelinks** is an open-source developer tool for declaring semantic relationships between files in a repo—any language, any file type. When a *trigger* file changes, the tool knows which *affected* files should be reviewed or updated, and can warn in CI or git workflows when those companions were not touched. The vision includes AI-assisted suggestions for updates; the **first shippable milestone** is a **core library plus CLI** you can demo with a single `npx` command (`docs/filelinks-docs.docx`).

**Core Value:** When someone changes a file, they get a reliable signal about which related files must stay in sync—without relying on same-language import graphs alone.

### Constraints

- **Tech stack**: TypeScript, Nx, pnpm, Vitest, ESLint — already chosen; keep new deps justified (e.g. `commander`, `minimatch`).
- **MVP slice**: Build **`@filelinks/core` + `filelinks` CLI together** first so the tool is shippable and demoable via `npx` before hooks, AI, or editor features.
<!-- gsd-project-end -->

<!-- gsd-stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages and runtime
- **TypeScript** (~5.9) with `moduleResolution: "node"`, `target: "es2015"`, `module: "esnext"` — see `tsconfig.base.json`.
- **Node.js** assumed for builds and tests (Vitest, Nx); `@types/node` at `20.19.9` in the root `package.json`.
- **JavaScript tooling** where needed: flat ESLint configs as `eslint.config.mjs` (root and per-package).
## Monorepo and build
- **pnpm** `10.32.1` as the package manager (`packageManager` in root `package.json`).
- **Nx** `22.6.4` orchestrates projects (`nx.json`, `project.json` files under `packages/*/project.json` and root `project.json`).
- **Compilation:** `@nx/js:tsc` builds libraries to `dist/packages/<name>/` (see targets in `packages/core/project.json`, `packages/cli/project.json`, `packages/git-hook/project.json`).
- **Bundling:** `@nx/esbuild` and `esbuild` are present for potential bundling; current libs use `tsc` only.
- **Transpilation helpers:** `tslib` for import helpers; **SWC** (`@swc/core`, `@swc-node/register`) in devDependencies for Nx/JS toolchain.
## Testing and quality
- **Vitest** `~4.1.0` with **`@nx/vitest`** plugin inferring `test` / `test-ci` targets from workspace layout (`nx.json`).
- **`@vitest/coverage-v8`** for coverage output under `coverage/packages/<project>/` (per Nx project metadata).
- **ESLint** `^9.8` with **`typescript-eslint`**, **`@nx/eslint`**, **`@nx/eslint-plugin`**, **`eslint-config-prettier`**, **`jsonc-eslint-parser`** (for JSONC if used).
- **Prettier** `~3.6.2` in devDependencies (formatting not wired in root `scripts`).
## Workspace layout
- **`pnpm-workspace.yaml`** — uses `allowBuilds` for selective native builds (`@swc/core`, `esbuild`, `nx`, `unrs-resolver`).
- **`vitest.workspace.ts`** — glob patterns for Vite/Vitest config discovery (`**/vite.config.*`, `**/vitest.config.*`); no committed `vite.config` / `vitest.config` files in-repo yet (Vitest runs with defaults via Nx-inferred commands).
## Path aliases (TypeScript)
- `@filelinks/core` → `packages/core/src/index.ts`
- `@filelinks/git-hook` → `packages/git-hook/src/index.ts`
- `filelinks` → `packages/cli/src/index.ts`
## Registry and release tooling
- **Verdaccio** `^6.3.2` for local npm registry; config at `.verdaccio/config.yml`, Nx target `local-registry` on root `project.json`.
- **Nx release** — `release.version.preVersionCommand` runs builds before version bumps (`nx.json`).
## Root scripts
<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:CONVENTIONS.md -->
## Conventions

## TypeScript
- **Module style:** CommonJS packages (`"type": "commonjs"` in `packages/*/package.json`); `main`/`types` point to emitted `./src/index.js` / `./src/index.d.ts` under `dist/` after build.
- **Imports:** `importHelpers` enabled via `tsconfig.base.json`; `tslib` is a runtime dependency in each package.
- **Spec files:** Co-located as `*.spec.ts` next to sources under `packages/*/src/lib/` (excluded from lib build in `tsconfig.lib.json`).
## ESLint
- **Flat config** at repo root: `eslint.config.mjs` uses `@nx/eslint-plugin` presets (`flat/base`, `flat/typescript`, `flat/javascript`).
- **Module boundaries:** `@nx/enforce-module-boundaries` is enabled for `**/*.{ts,tsx,js,jsx}` with `enforceBuildableLibDependency: true` — follow Nx dependency graph when adding imports between projects.
- **Ignores:** `dist`, `out-tsc`, Vitest timestamp configs (`**/vitest.config.*.timestamp*`).
- **Per-package:** `packages/core/eslint.config.mjs`, `packages/cli/eslint.config.mjs`, `packages/git-hook/eslint.config.mjs` extend/configure package lint.
## Formatting
- **Prettier** is listed at the root; no root `format` script in `package.json`. Align with team choice (e.g. add `format` script or editor format-on-save).
## Naming and exports
- **Public API:** Each package exposes symbols through `packages/<name>/src/index.ts` (barrel pattern).
- **Library modules:** `lib/<feature>.ts` with matching `lib/<feature>.spec.ts`.
## Error handling
## Comments and TODOs
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern
## Packages and roles
| Package | Name (npm) | Role |
|---------|------------|------|
| `packages/core` | `@filelinks/core` | Shared core library — intended for shared logic. |
| `packages/cli` | `filelinks` | CLI-facing package (name `filelinks` in `packages/cli/package.json`). |
| `packages/git-hook` | `@filelinks/git-hook` | Git hook–related library. |
- `packages/core/src/index.ts` → `./lib/core`
- `packages/cli/src/index.ts` → `./lib/cli`
- `packages/git-hook/src/index.ts` → `./lib/git-hook`
## Build and output
- **Build:** `@nx/js:tsc` compiles each package from `src/` to `dist/packages/<project>/` using `tsconfig.lib.json` per package.
- **Release:** `nx-release-publish` targets point at `dist/{projectRoot}` with version resolution from git tags (`currentVersionResolver: "git-tag"` in `project.json` files).
## Data flow
## Tooling boundaries
- **Lint:** ESLint via Nx-inferred `lint` targets (`eslint .` in each package `cwd`), using root `eslint.config.mjs` plus package-level `packages/*/eslint.config.mjs`.
- **Test:** Vitest via Nx-inferred `test` / `test-ci` (see `TESTING.md`).
## Entry points (future)
- A future **CLI binary** would typically be wired through `packages/cli` (bin field / Nx executor not present yet).
- **Git hooks** would consume `@filelinks/git-hook` from install or hook scripts (not configured in-repo yet).
<!-- gsd-architecture-end -->

<!-- gsd-workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->



<!-- gsd-profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- gsd-profile-end -->
