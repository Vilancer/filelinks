# Contributing to filelinks

## Repository layout

- **`packages/core`** — `@filelinks/core`: schema (`defineLinks`), `linkType` helpers, config loader (**jiti**), git reader, `matchStagedLinks`, `resolvePrompt`.
- **`packages/cli`** — `filelinks` npm package (CLI; Phase 3 MVP).
- **`packages/git-hook`** — `@filelinks/git-hook` (post-v1 hook helpers).

Planning and deep maps live under **`.planning/`** (roadmap, requirements, `codebase/*.md`).

## Common commands (Nx + pnpm)

From the repo root:

| Task              | Command                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Install           | `pnpm install`                                                                                              |
| Build all libs    | `pnpm exec nx run-many -t build`                                                                            |
| Test all packages | `pnpm test` (single run, matches Husky) or `pnpm run test:ci` (atomized `test-ci`; needs Nx Cloud / Agents) |
| Lint all          | `pnpm exec nx run-many -t lint`                                                                             |
| Core only         | `pnpm exec nx run core:test` / `core:build` / `core:lint`                                                   |

Path aliases: `@filelinks/core` → `packages/core/src/index.ts` (`tsconfig.base.json`).

## Git hooks

**Husky** runs **lint-staged** on commit (ESLint + Prettier on staged files), then **`pnpm test`** (`nx run-many -t test`, no Nx Agents required). A **`commit-msg`** hook runs [**commitlint**](https://commitlint.js.org/) with the [Conventional Commits](https://www.conventionalcommits.org/) preset — e.g. `feat(cli): add check command`, `chore: bump deps`, `fix(core): handle empty paths` (type + optional scope + description).

To skip hooks in an emergency: `git commit --no-verify` (use sparingly).

## Config authoring

- Default export from **`filelinks.config.ts`**: `export default defineLinks([...], { ... })`.
- Optional **`linkType`** on each link: `file-file`, `dir-dir`, `file-dir`, or `dir-file` (see `packages/core/src/lib/linkType.ts`).
