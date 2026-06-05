# Phase 2: Core link types & repo DX - Context

**Gathered:** 2026-04-03  
**Status:** Ready for planning  
**Note:** Discuss-phase was not run; context synthesized from `ROADMAP.md`, `REQUIREMENTS.md`, and implemented repo state.

<domain>
## Phase Boundary

Deliver optional **`linkType`** on each link, repo documentation (architecture + contributor commands), **Husky** + **lint-staged** pre-commit, and **Cursor** agent affordances (`AGENTS.md`, `.cursor/rules`). No CLI feature work (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Schema & core (CORE-06)

- **D-01:** `LinkType` = `'file-file' | 'dir-dir' | 'file-dir' | 'dir-file'`; optional `linkType?: LinkType` on `FileLinkEntry`.
- **D-02:** Export `LINK_TYPES`, `LINK_TYPE_DESCRIPTIONS`, `isLinkType` from `@filelinks/core` (`linkType.ts`); barrel re-exports in `index.ts`.
- **D-03:** `matchStagedLinks` does **not** change minimatch semantics; `linkType` is metadata on `entry` for CLI/list and future validation.

### Docs & DX (DOC-02)

- **D-04:** `.planning/codebase/ARCHITECTURE.md` documents config → matcher flow and `linkType`.
- **D-05:** Root `CONTRIBUTING.md` lists packages, commands, Husky behavior.
- **D-06:** Root `AGENTS.md` + `.cursor/rules/filelinks-architecture.mdc` orient agents.

### Git hooks

- **D-07:** `package.json`: `lint-staged` (ESLint + Prettier on staged TS/JS; Prettier on md/json/yaml); `prepare`: `husky`; `test`: `nx run-many -t test-ci`.
- **D-08:** `.husky/pre-commit`: `pnpm lint-staged` then `pnpm exec nx run-many -t test-ci --parallel=3`.

### Claude's Discretion

- Exact Prettier/eslint CLI flags; minor doc wording; optional `02-VERIFICATION.md` structure.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap

- `.planning/REQUIREMENTS.md` — **CORE-06**, **DOC-02**
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria

### Product / prior phase

- `.planning/phases/01-core-library/01-CONTEXT.md` — schema baseline
- `docs/filelinks-docs.docx` — original narrative (superseded for `linkType` by this phase)

### Code & repo

- `packages/core/src/lib/schema.ts` — `LinkType`, `FileLinkEntry`
- `packages/core/src/lib/linkType.ts` — helpers
- `packages/core/src/lib/linkMatcher.ts` — matcher
- `CONTRIBUTING.md`, `AGENTS.md`, `.cursor/rules/filelinks-architecture.mdc`

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable assets

- `defineLinks`, `matchStagedLinks`, `resolvePrompt`, `loadConfig` — unchanged integration surface except new optional field.

### Established patterns

- Vitest `*.spec.ts` beside sources; Nx `test-ci` for CI runs.

### Integration points

- Phase 3 CLI will read `linkType` for `list` output.

</code_context>

<specifics>
## Specific Ideas

- Implementation already merged in repo; planning should emphasize **verification** and **requirement traceability** (CORE-06, DOC-02) rather than greenfield implementation.

</specifics>

<deferred>
## Deferred Ideas

- CLI `list` / `check` UX — Phase 3.

</deferred>

---

_Phase: 02-core-link-types-repo-dx_  
_Context gathered: 2026-04-03_
