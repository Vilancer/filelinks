# Roadmap: filelinks

**Granularity:** MVP split across core foundation, core metadata + repo hygiene, then CLI + docs.  
**Defined:** 2026-04-02

## Overview

| Phase | Name                      | Goal                                                                              | Requirements            |
| ----- | ------------------------- | --------------------------------------------------------------------------------- | ----------------------- |
| 1     | Core library              | Complete                                                                          | CORE-01 — CORE-05       |
| 2     | Core link types & repo DX | `linkType` on links; architecture/command docs; Husky + lint-staged; Cursor rules | CORE-06, DOC-02         |
| 3     | CLI MVP                   | Commander commands + bin + README for `npx` demo                                  | CLI-01 — CLI-04, DOC-01 |

---

## Phase 1: Core library

**Goal:** `@filelinks/core` follows the product doc build order: **Step 2 — config schema** (ESLint/Prettier-style global + per-link overrides, including `PromptConfig` for future AI) and **Step 3 — core logic** (load config with **jiti**, git staged paths, `minimatch` link matching, `resolvePrompt` merge helper). No CLI binary work, no AI provider calls.

**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04, CORE-05

**Doc steps in this phase:**

| Doc step                                 | Deliverable                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Step 2 — Define the config schema (core) | Types + `defineLinks(links, config?)` → `{ links, config }`; `PromptConfig` / `FileLinkConfig` / per-entry `prompt` (see `01-CONTEXT.md`) |
| Step 3 — Implement core logic            | `configLoader` (**jiti**), `gitReader`, `linkMatcher`, `promptResolver`                                                                   |

**Success criteria:**

1. A test project can import `defineLinks`, author `filelinks.config.ts` with `export default defineLinks([...], { ... })`, and load it from disk via the public loader API.
2. Given a fixed list of staged paths and resolved `links`, the matcher returns the expected missing affected files for glob and exact paths (unit tests).
3. `resolvePrompt(globalConfig, link)` returns merged `PromptConfig` (global spread, then link override) with unit tests for partial overrides.
4. Git reader behavior is documented and testable (mocked git or fixture repo).
5. `nx build core` and `nx test core` pass.

**UI hint:** no

---

## Phase 2: Core link types & repo DX

**Goal:** Each `FileLinkEntry` can declare an optional **`linkType`** (`file-file`, `dir-dir`, `file-dir`, `dir-file`) so tooling and docs express whether relationships are file- or directory-oriented. Extend tests and public exports. Update **architecture / contributor** markdown with repo layout and common **Nx/pnpm** commands. Add **Husky** pre-commit running **lint-staged** (ESLint + Prettier on staged files) and **Vitest** via Nx (`test-ci`). Add **Cursor** rules and **`AGENTS.md`** so agents follow the same architecture and commands.

**Requirements:** CORE-06, DOC-02

**Success criteria:**

1. `LinkType` and optional `linkType` on `FileLinkEntry` are exported from `@filelinks/core`; helpers or descriptions document the four variants; unit tests cover schema and matcher passthrough.
2. `.planning/codebase/ARCHITECTURE.md` (and/or `CONTRIBUTING.md`) describes packages, data flow, link types, and day-to-day commands (`nx build|test|lint`).
3. Husky + lint-staged are configured; pre-commit runs format/lint on staged files and the test suite (`nx run-many -t test-ci` or equivalent).
4. `.cursor/rules/*.mdc` and root `AGENTS.md` point agents at architecture and commands without duplicating the full codebase map.

**UI hint:** no

---

## Phase 3: CLI MVP

**Goal:** `filelinks` CLI exposes `check`, `list`, and `add`; suitable for publishing and demo via `npx filelinks` once published.

**Requirements:** CLI-01, CLI-02, CLI-03, CLI-04, DOC-01

**Success criteria:**

1. Running `filelinks check` in a sample repo prints expected warnings when staged changes trigger links and companions are unstaged.
2. `filelinks list` shows all links from config in a readable table (including **`linkType`** when present).
3. `filelinks add` produces a valid config snippet or updates existing config (manual or smoke test).
4. Package metadata includes `bin` so global/npx invocation is documented and works from built output.
5. README allows a new user to install, add a minimal `filelinks.config.ts` example, and run `check` / `list` / `add`.

**UI hint:** no

---

## Later (post–v1)

Order follows `docs/filelinks-docs.docx`: git-hook → AI suggest → graph → VS Code → Nx plugin. See **v2** in `REQUIREMENTS.md`.

---

_Roadmap created: 2026-04-02_  
_Last updated: 2026-04-03 — Phase 2 = link types + DX; CLI MVP → Phase 3_
