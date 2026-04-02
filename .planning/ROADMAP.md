# Roadmap: filelinks

**Granularity:** coarse (MVP split into two phases: core foundation, then CLI + docs).  
**Defined:** 2026-04-02

## Overview

| Phase | Name | Goal | Requirements |
|-------|------|------|----------------|
| 1 | Core library | Config schema, load config, read git staged files, match links | CORE-01 — CORE-04 |
| 2 | CLI MVP | Commander commands + bin + README for `npx` demo | CLI-01 — CLI-04, DOC-01 |

---

## Phase 1: Core library

**Goal:** `@filelinks/core` implements declarative link definitions, discovers config from the repo, reads staged paths from git, and computes “trigger fired + missing affected files” for downstream CLI.

**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04

**Success criteria:**

1. A test project can import `defineLinks` and load a `filelinks.config.ts` from disk.
2. Given a fixed list of staged paths and a config, the matcher returns the expected missing affected files for at least glob and exact paths (covered by unit tests).
3. Git reader behavior is documented and testable (unit tests with mocked git or fixture repo as appropriate).
4. `nx build core` and `nx test core` pass.

**UI hint:** no

---

## Phase 2: CLI MVP

**Goal:** `filelinks` CLI exposes `check`, `list`, and `add`; suitable for publishing and demo via `npx filelinks` once published.

**Requirements:** CLI-01, CLI-02, CLI-03, CLI-04, DOC-01

**Success criteria:**

1. Running `filelinks check` in a sample repo prints expected warnings when staged changes trigger links and companions are unstaged.
2. `filelinks list` shows all links from config in a readable table.
3. `filelinks add` produces a valid config snippet or updates existing config (manual or smoke test).
4. Package metadata includes `bin` so global/npx invocation is documented and works from built output.
5. README allows a new user to install, add a minimal config, and run `check` / `list` / `add`.

**UI hint:** no

---

## Later (post–v1)

Order follows `docs/filelinks-docs.docx`: git-hook → AI suggest → graph → VS Code → Nx plugin. See **v2** in `REQUIREMENTS.md`.

---
*Roadmap created: 2026-04-02*
