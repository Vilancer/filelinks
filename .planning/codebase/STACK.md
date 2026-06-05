# Technology stack

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

Defined in `tsconfig.base.json`:

- `@filelinks/core` → `packages/core/src/index.ts`
- `@filelinks/git-hook` → `packages/git-hook/src/index.ts`
- `filelinks` → `packages/cli/src/index.ts`

## Registry and release tooling

- **Verdaccio** `^6.3.2` for local npm registry; config at `.verdaccio/config.yml`, Nx target `local-registry` on root `project.json`.
- **Nx release** — `release.version.preVersionCommand` runs builds before version bumps (`nx.json`).

## Root scripts

Root `package.json` `scripts.test` is a placeholder (`echo "Error: no test specified"`); use **`pnpm exec nx run-many -t test`** (or per-project `nx test <project>`) instead.
