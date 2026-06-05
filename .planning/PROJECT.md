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

### Validated (v1.1 — Phase 5, 2026-05-31)

- ✓ **Agent run policy** — `AgentRunPolicySchema`, global/per-link `agent` settings, `resolveAgentRunPolicy`, `classifyStagedLinks`, `shouldRunAgentForLink` (`packages/core`).

### Validated (v1.1 — Phase 6, 2026-05-31)

- ✓ **Provider system** — `AgentProvider` + registry, `resolveAgentConfig`, typed agent errors (`AgentMissingApiKeyError`, startup vs run failures).
- ✓ **Cursor SDK provider** — `@cursor/sdk` in `cursorProvider.ts`; `listModels`; explicit **local** (`cwd`) vs **cloud** (`repos`); agent dispose after run.

### Validated (v1.1 — Phase 7, 2026-05-31)

- ✓ **`filelinks check --run-agents`** — opt-in flag; violations first; agents via `classifyStagedLinks` + policy (including missing affects); prompt with diff + affect contents; JSON `agentRuns`; README/CONTRIBUTING (DOC-03).

### Active (future milestones)

- _(none committed yet — see v2 candidates below)_

### Out of Scope (still)

- **`@filelinks/git-hook`** as a shipped product — wrapper package deferred; repo uses root Husky for quality only.
- **VS Code extension** — later milestone.
- **Standalone `filelinks suggest` command** — v1.1 ships AI via **`check --run-agents`** only; separate command deferred.
- **`filelinks graph`** — later milestone.
- **NX plugin** — after core is solid.

## Latest Milestone: v1.1 AI agent integration (Cursor SDK) — shipped (2026-05-31)

**Goal:** When staged changes match a link under the configured run policy, filelinks invokes a Cursor agent (local or cloud) with merged prompt + provider config to edit the repo—via **`check --run-agents`**, with a provider-ready pattern and typed missing-key errors.

**Delivered (phases 5–7):**

- ✓ Agent run policy (`trigger-or-affects`, `shouldRunAgentForLink`)
- ✓ Cursor provider + `resolveAgentConfig` (local/cloud explicit)
- ✓ **`filelinks check --run-agents`** + documentation
- ✓ Add wizard agent/model/prompt setup, model-variant labeling, and debounced model search

## Context

- **Shipped v1.0:** `@filelinks/core` + `filelinks` CLI; config is plain TypeScript on disk and is **read when you run a command** (or when a future hook runs the CLI) — there is **no background daemon** and **no AI** in v1.0.
- Product spec: `docs/filelinks-docs.docx`.
- Codebase map: `.planning/codebase/`.
- Milestone record: `.planning/MILESTONES.md`, archives under `.planning/milestones/` (v1.1 roadmap + requirements archived).

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

_Last updated: 2026-05-31 — v1.1 milestone complete (phases 5–7 shipped)_
