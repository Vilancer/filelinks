# filelinks

## What This Is

**filelinks** is an open-source developer tool for declaring semantic relationships between files in a repo—any language, any file type. When a *trigger* file changes, the tool knows which *affected* files should be reviewed or updated, and can warn in CI or git workflows when those companions were not touched. The vision includes AI-assisted suggestions for updates; the **first shippable milestone** is a **core library plus CLI** you can demo with a single `npx` command (`docs/filelinks-docs.docx`).

## Core Value

When someone changes a file, they get a reliable signal about which related files must stay in sync—without relying on same-language import graphs alone.

## Requirements

### Validated

- ✓ **Nx monorepo with pnpm** — existing (`nx.json`, `pnpm-workspace.yaml`, `package.json`).
- ✓ **Publishable packages scaffolded** — `@filelinks/core`, `filelinks` (CLI), `@filelinks/git-hook` with `tsc` build, Vitest, ESLint (`packages/*/project.json`).
- ✓ **MVP: declarative config (Phase 1)** — `PromptConfig`, `FileLinkConfig`, `FileLinkEntry`, `defineLinks(links, config?)` → `{ links, config }`; **`jiti`** loads `filelinks.config.ts` (walk up tree); `resolvePrompt` for global vs per-link prompt merge.
- ✓ **MVP: git integration (Phase 1)** — staged paths via `git diff -z --name-only --cached`; repo root via `git rev-parse --show-toplevel` (`packages/core/src/lib/gitReader.ts`).
- ✓ **MVP: link matching (Phase 1)** — `matchStagedLinks` with `minimatch` on repo-root-relative patterns (`packages/core/src/lib/linkMatcher.ts`).

### Active

- [ ] **MVP: CLI** — `filelinks check`, `list`, `add` (Commander); non-zero exit when `severity: 'error'` and companions missing.
- [ ] **MVP: demo story** — README with install, minimal `filelinks.config.ts` example, `npx filelinks` usage; packages publishable to npm.

### Out of Scope

- **`@filelinks/git-hook`** — pre-commit wrapper and husky/lint-staged docs; package directory may exist but not part of MVP delivery.
- **VS Code extension** — gutter, webview graph; later milestone.
- **`filelinks suggest` (AI)** — diff + affected file → model suggestions; follow doc roadmap after MVP; requires provider keys and design.
- **`filelinks graph`** — ASCII/HTML/DOT output; later milestone.
- **NX plugin** — “Phase 6” in doc; not before core is solid.

## Context

- Product specification: `docs/filelinks-docs.docx` (config shape, CLI commands, phased roadmap).
- Codebase map: `.planning/codebase/` (stack, structure, conventions).
- **`@filelinks/core`** implements Phase 1 schema, config load, git reader, matcher, and `resolvePrompt` (see `01-VERIFICATION.md`). CLI packages remain scaffold until Phase 2.

## Constraints

- **Tech stack**: TypeScript, Nx, pnpm, Vitest, ESLint — already chosen; keep new deps justified (e.g. `commander`, `minimatch`).
- **MVP slice**: Build **`@filelinks/core` + `filelinks` CLI together** first so the tool is shippable and demoable via `npx` before hooks, AI, or editor features.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MVP = core + CLI only | User direction + doc “Where to start”; single demo surface. | Core library complete (Phase 1); CLI next |
| Defer AI `suggest` until after MVP | Doc places AI in a later phase; MVP proves matching + CLI. | — Pending |
| Cross-file links are declarative, not import-graph | Doc positioning vs linters; intent-driven. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 — Phase 1 core library executed (schema, jiti loader, git reader, matcher)*
