# Repository structure

## Top level

| Path | Purpose |
|------|---------|
| `package.json` | Root workspace metadata; devDependencies for Nx, TS, ESLint, Vitest, Verdaccio. |
| `pnpm-workspace.yaml` | pnpm workspace and `allowBuilds` allowlist. |
| `pnpm-lock.yaml` | Lockfile. |
| `nx.json` | Nx workspace config, plugins (`@nx/eslint`, `@nx/vitest`), release `preVersionCommand`. |
| `project.json` | Root Nx project: `local-registry` (Verdaccio). |
| `tsconfig.base.json` | Shared TS options and path aliases. |
| `eslint.config.mjs` | Root flat ESLint config (Nx presets, module boundaries). |
| `vitest.workspace.ts` | Vitest workspace glob patterns. |

## Packages (`packages/`)

Each package follows a similar layout:

```
packages/<name>/
  package.json          # npm package name and version
  project.json          # Nx targets: build, nx-release-publish
  tsconfig.json         # extends base
  tsconfig.lib.json     # library build
  tsconfig.spec.json    # tests
  eslint.config.mjs     # package ESLint
  src/
    index.ts            # public API re-exports
    lib/
      <name>.ts         # implementation
      <name>.spec.ts    # Vitest specs
```

Concrete paths:

- **Core:** `packages/core/src/lib/core.ts`, `packages/core/src/lib/core.spec.ts`
- **CLI:** `packages/cli/src/lib/cli.ts`, `packages/cli/src/lib/cli.spec.ts`
- **Git hook:** `packages/git-hook/src/lib/git-hook.ts`, `packages/git-hook/src/lib/git-hook.spec.ts`

## Build artifacts (gitignored typical)

- `dist/` — `tsc` output per `project.json` `outputPath` (e.g. `dist/packages/core`).
- `coverage/` — Vitest coverage per Nx outputs.
- `tmp/local-registry/` — Verdaccio storage (see `.verdaccio/config.yml`).

## Planning docs

- `.planning/codebase/` — this codebase map (GSD / maintenance).

## Naming

- **Scoped packages:** `@filelinks/core`, `@filelinks/git-hook`.
- **CLI package:** unscoped name `filelinks` in `packages/cli/package.json` (same as root workspace name `"filelinks"` in root `package.json` — be explicit when referring to “the CLI package” vs the repo).
