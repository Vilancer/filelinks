# Phase 1: Core library - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `01-CONTEXT.md`.

**Date:** 2026-04-02  
**Phase:** 01 — Core library  
**Mode:** discuss (single-pass consolidation — see notes)

**Areas covered:** Config schema & TS config loading, git staged listing, minimatch semantics, module layout, repo integration

---

## Session note

ROADMAP headings originally used `## Phase 1 — …` (em dash). GSD’s parser requires `## Phase 1: …` (colon). `.planning/ROADMAP.md` was updated so `init phase-op 1` resolves the phase.

---

## Config schema

| Option | Description | Selected |
|--------|-------------|----------|
| Doc-aligned `FileLinkEntry` / `AffectedFile` / `defineLinks` | Matches `docs/filelinks-docs.docx` | ✓ |
| Alternate JSON-only config | Simpler but diverges from doc | |

**User's choice:** Doc-aligned TypeScript config (implicit: product spec is source of truth).

**Notes:** Severity `warn` | `error` preserved for Phase 2 CLI exit behavior.

---

## Runtime loading of `filelinks.config.ts`

| Option | Description | Selected |
|--------|-------------|----------|
| `jiti` (or similar) inside `@filelinks/core` | Load `.ts` without user compile step | ✓ |
| JS-only `filelinks.config.cjs` for v1 | No extra dep | |

**User's choice:** Prefer `jiti` with fallback note if ESM/CJS interop blocks (planner to validate).

---

## Git reader

| Option | Description | Selected |
|--------|-------------|----------|
| `git diff --name-only --cached` via `execFile` | Matches MVP “staged” story | ✓ |
| libgit2 / simple-git | Heavier dependency | |

**User's choice:** Spawn `git`; discover repo root via `git rev-parse --show-toplevel`.

---

## Glob matching

| Option | Description | Selected |
|--------|-------------|----------|
| `minimatch` per doc sample | Explicit in doc | ✓ |
| `micromatch` | Alternative | |

**User's choice:** `minimatch` aligned with doc’s `linkMatcher` example.

---

## Claude's Discretion

- Sync vs async config API, exact error strings, internal Map shape for match results.

## Deferred Ideas

- `--all` / unstaged scanning, AI providers, hooks — out of phase scope per `ROADMAP.md`.
