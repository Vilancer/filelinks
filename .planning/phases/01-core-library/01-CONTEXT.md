# Phase 1: Core library - Context

**Gathered:** 2026-04-02  
**Status:** Ready for planning

<domain>
## Phase Boundary

`@filelinks/core` implements declarative link definitions (`defineLinks`), discovers and loads `filelinks.config.ts`, reads staged file paths from git, and matches triggers/affected paths (glob semantics) to produce a structured result: which link entries fired and which affected files are missing from the staged set. No CLI UX, no git-hook package work, no AI—those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Config shape and authoring

- **D-01:** Use the schema from the product doc: `FileLinkEntry` with `trigger`, `affects[]` (`file`, `reason`), optional `severity` (`'warn' | 'error'`). Export `defineLinks()` as a pass-through helper for ergonomics (`docs/filelinks-docs.docx`, Step 2).
- **D-02:** Config file name is **`filelinks.config.ts`** at a project root; consumer uses `import { defineLinks } from '@filelinks/core'` and `export default defineLinks([...])` as in the doc.

### Config loading (runtime)

- **D-03:** Resolve config by walking **upward from `process.cwd()`** (or an explicit `cwd` parameter on the public API) until a file named `filelinks.config.ts` is found. If none is found, return a clear error naming the search start directory.
- **D-04:** Load the TypeScript config at runtime using **`jiti`** (or equivalent small TS/ESM loader) as a dependency of `@filelinks/core`, so users keep authoring `filelinks.config.ts` without a separate compile step. If `jiti` proves problematic for ESM/CJS interop in this repo, the fallback is document-only: ship `filelinks.config.mjs` support in addition—**planner should validate** `jiti` choice against Nx/`tsc` output for `core`.

### Git integration

- **D-05:** Staged paths come from **`git diff --name-only --cached`** (staged-only for Phase 1; `--all`/unstaged is CLI Phase 2). Implement via **`child_process.execFile('git', [...], { cwd })`** (no new abstraction unless tests need it).
- **D-06:** Discover repo root with **`git rev-parse --show-toplevel`** from the same starting `cwd` used for config search (or from the directory where config was found—planner should pick one rule and apply consistently). Normalize git output paths to repo-relative POSIX-style paths for matching.

### Matching

- **D-07:** Use **`minimatch`** (as in the doc’s `linkMatcher` example) for both `trigger` and `affects[].file` patterns. Document default options (e.g. match behavior for dotfiles) in implementation; start with library defaults unless tests require otherwise.
- **D-08:** Matching semantics align with the doc sample: for each `FileLinkEntry`, if **any** staged path matches `trigger`, compute **affected files that are not** matched by any staged path (each `affects[].file` pattern checked against staged set). Return a structure that preserves which entry triggered and which affected rows are “missing” for downstream CLI exit codes in Phase 2.

### Module layout (targets doc filenames)

- **D-09:** Organize source roughly as: `schema.ts` (types + `defineLinks`), `configLoader.ts`, `gitReader.ts`, `linkMatcher.ts`, and `index.ts` barrel—consistent with `docs/filelinks-docs.docx` “Step 2–4” structure.

### Claude's Discretion

- Exact error message strings and whether `loadConfig` is sync vs async.
- Internal types for `match` results (Map vs plain objects) as long as the public contract is stable for Phase 2 CLI.
- Vitest fixtures vs mocked `child_process` for git tests.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and requirements

- `docs/filelinks-docs.docx` — Config example (`defineLinks`, triggers, affects, severity), core module names (`schema`, `linkMatcher` with `minimatch`), git flow description, Phase 1 build order.
- `.planning/REQUIREMENTS.md` — **CORE-01** through **CORE-04** acceptance IDs.
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, requirement IDs.

### Repo conventions

- `.planning/codebase/STACK.md` — Nx, `tsc`, Vitest, pnpm.
- `.planning/codebase/CONVENTIONS.md` — ESLint, barrel exports, `*.spec.ts` next to sources.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- `packages/core/src/index.ts` — barrel; replace stub export with real public API when implementing.
- `packages/core/src/lib/core.ts` — placeholder only; safe to replace with re-exports from new modules (`schema`, loaders, matcher).

### Established patterns

- TypeScript **CommonJS** packages with `tslib`; tests use **Vitest** beside implementation (`packages/core/src/lib/*.spec.ts`).
- Path alias `@filelinks/core` → `packages/core/src/index.ts` in `tsconfig.base.json`.

### Integration points

- Phase 2 CLI will depend on `@filelinks/core` and call the same load + git + match pipeline with `cwd` set for end users.

</code_context>

<specifics>
## Specific Ideas

- Product doc positions **minimatch** and a **declarative** `filelinks.config.ts`—keep examples copy-pasteable with the doc’s Step 2–3 snippets where possible.

</specifics>

<deferred>
## Deferred Ideas

- **`filelinks check --all`**, non-staged diffs, and exit-code policy — CLI phase (Phase 2).
- **AI `suggest`**, **git-hook**, **graph**, **VS Code** — later roadmap phases per `PROJECT.md`.

### Reviewed Todos (not folded)

None — `todo match-phase` returned no pending todos.

</deferred>

---

*Phase: 01-core-library*  
*Context gathered: 2026-04-02*
