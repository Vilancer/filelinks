# Coding conventions

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

No established pattern yet — current functions return strings with no `try/catch` or `Result` types. Introduce consistent error handling when adding I/O or external calls.

## Comments and TODOs

No `TODO`/`FIXME` markers in application source at present (only unrelated strings in lockfile metadata).
