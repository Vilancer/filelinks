# filelinks

## What This Is

**filelinks** is an open-source developer tool for declaring semantic relationships between files in a repo—any language, any file type. When a _trigger_ file changes, the tool knows which _affected_ files should be reviewed or updated, and can warn in CI or git workflows when those companions were not touched. The vision includes AI-assisted suggestions for updates; **v1.0** shipped a **core library plus CLI** you can demo with **`npx filelinks`** after publish (`docs/filelinks-docs.docx`).

## Core Value

When someone changes a file, they get a reliable signal about which related files must stay in sync—without relying on same-language import graphs alone.

## Requirements

### Validated (v1.0 MVP — 2026-04-06)

- ✓ **Nx monorepo with pnpm** — `nx.json`, `pnpm-workspace.yaml`, `package.json`.
- ✓ **Publishable packages** — `@filelinks/core`, `filelinks` (CLI), `@filelinks/git-hook` scaffold (`packages/*/project.json`).
- ✓ **Declarative config** — `defineLinks`, `filelinks.config.ts` loaded with **jiti** (walk-up), Effect Schema validation, `matchStagedLinks`, `resolvePrompt`.
- ✓ **Optional `linkType`** — `packages/core` schema + docs (`linkType.ts`).
- ✓ **Contributor + agent DX** — `CONTRIBUTING.md`, `AGENTS.md`, `.cursor/rules/`, Husky + lint-staged.
- ✓ **Typed errors** — `FilelinksError` hierarchy, `normalizeError` (`packages/core`).
- ✓ **CLI** — `filelinks check`, `list`, `add` (Ink + React for `add`); global `--cwd`, `--config`, `--json` (where applicable); README + `bin` for npm/`npx`.

### Active

- [ ] **Next milestone** — define via `/gsd-new-milestone` (see **v2** candidates in `.planning/milestones/v1.0-REQUIREMENTS.md`).

### Out of Scope (still)

- **`@filelinks/git-hook`** as a shipped product — wrapper package deferred; repo uses root Husky for quality only.
- **VS Code extension** — later milestone.
- **`filelinks suggest` (AI)** — v1 delivers core + CLI only; `resolvePrompt` / prompt fields exist for a future `suggest` command.
- **`filelinks graph`** — later milestone.
- **NX plugin** — after core is solid.

## Context

- **Shipped v1.0:** `@filelinks/core` + `filelinks` CLI; config is plain TypeScript on disk and is **read when you run a command** (or when a future hook runs the CLI) — there is **no background daemon** and **no AI** in v1.0.
- Product spec: `docs/filelinks-docs.docx`.
- Codebase map: `.planning/codebase/`.
- Milestone record: `.planning/MILESTONES.md`, archives under `.planning/milestones/`.

## Constraints

- **Tech stack:** TypeScript, Nx, pnpm, Vitest, ESLint — keep new dependencies justified.

## Key Decisions

| Decision                                           | Rationale                                             | Outcome (v1.0)            |
| -------------------------------------------------- | ----------------------------------------------------- | ------------------------- |
| MVP = core + CLI only                              | Single demo surface; doc ordering.                    | ✓ Shipped                 |
| Defer AI `suggest` until after MVP                 | MVP proves matching + CLI; no provider calls in v1.   | ✓ Out of scope for v1.0   |
| Cross-file links are declarative, not import-graph | Product positioning vs linters.                       | ✓ `defineLinks` + matcher |
| Effect Schema + `normalizeError` at boundaries     | One validation story; CLI consumes structured errors. | ✓ Phase 3 + CLI           |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---

_Last updated: 2026-04-06 — v1.0 MVP milestone completed and archived_
