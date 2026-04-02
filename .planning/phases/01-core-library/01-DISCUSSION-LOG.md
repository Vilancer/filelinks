# Phase 1: Core library - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `01-CONTEXT.md`.

**Date:** 2026-04-02  
**Phase:** 01 — Core library  
**Amendment:** 2026-04-02 — Schema override model + `PromptConfig` + `jiti` + `resolvePrompt`

---

## Amendment: Step 2 / Step 3 + ESLint-style config

**User direction:** Phase 1 tracks the doc **Step 2 — Define the config schema (core)** and **Step 3 — Implement core logic**, with Step 2 updated to:

- Global `FileLinkConfig` + per-link overrides on `FileLinkEntry` (same *pattern* as ESLint / Prettier).
- `PromptConfig` on global and per-link for future `suggest`.
- `defineLinks(links, config?)` returns `{ links, config }`.
- `resolvePrompt(globalConfig, link)` via object spread (global first, link wins per key).
- Runtime load: **`jiti`** for `filelinks.config.ts`.

Prior log entries below remain valid where not superseded by `01-CONTEXT.md`.

---

## Session note (original)

ROADMAP headings must use `## Phase 1: …` (colon) for GSD `init phase-op`.

---

## Config schema (superseded by amendment)

Earlier draft used a simpler `defineLinks` array-only helper. **Superseded** by the canonical TypeScript in `01-CONTEXT.md`.

---

## Runtime loading of `filelinks.config.ts`

| Option | Description | Selected |
|--------|-------------|----------|
| `jiti` inside `@filelinks/core` | Load `.ts` without user compile step | ✓ |

---

## Git reader

| Option | Description | Selected |
|--------|-------------|----------|
| `git diff --name-only --cached` via `execFile` | Staged paths for check | ✓ |

---

## Glob matching

| Option | Description | Selected |
|--------|-------------|----------|
| `minimatch` | Per doc / original sample | ✓ |

---

## Prompt merge

| Option | Description | Selected |
|--------|-------------|----------|
| `resolvePrompt` shallow spread | `...global.prompt`, `...link.prompt` | ✓ |

---

## Deferred Ideas

- AI provider calls — not Phase 1.
