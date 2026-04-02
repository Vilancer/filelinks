# Requirements: filelinks

**Defined:** 2026-04-02  
**Core Value:** When someone changes a file, they get a reliable signal about which related files must stay in sync—without relying on same-language import graphs alone.

## v1 Requirements

MVP = **`@filelinks/core` + `filelinks` CLI** (shippable, demo via `npx`). Aligned with `docs/filelinks-docs.docx` Phase 1 checklist.

### Core library

Aligned with the doc **Step 2 — Define the config schema (core)** and **Step 3 — Implement core logic**, with Step 2 using the **same override pattern as ESLint / Prettier**: global options object + per-entry overrides (here: global `FileLinkConfig` + per-link `prompt`).

- [ ] **CORE-01**: Exported schema: `PromptConfig`, `FileLinkConfig`, `FileLinkEntry`, `AffectedFile`; `defineLinks(links, config?)` returns `{ links, config }` (see Phase 1 context for the canonical TypeScript contract).
- [ ] **CORE-02**: Config loader finds and loads `filelinks.config.ts` with **`jiti`** (walk up from cwd); default export is `{ links, config }`; surfaces clear errors.
- [ ] **CORE-03**: Git reader returns staged file paths for `check` (e.g. `git diff --name-only --cached` behavior as specified in implementation plan).
- [ ] **CORE-04**: Link matcher takes staged paths + loaded `links`; uses glob matching (`minimatch`); returns which trigger fired and which affected files are missing from the staged set.
- [ ] **CORE-05**: `packages/core/src/promptResolver.ts` exports `resolvePrompt(globalConfig, link)` merging `PromptConfig` with **object spread** (global first, link overrides) for any key defined on either side—used by future `suggest`; no AI calls in Phase 1.

### CLI

- [ ] **CLI-01**: `filelinks check` runs matcher on staged files; prints warnings; exits non-zero when policy requires (e.g. `severity: 'error'` and missing affected files).
- [ ] **CLI-02**: `filelinks list` prints all declared links in a readable table.
- [ ] **CLI-03**: `filelinks add` interactively collects trigger / affected files / reason / severity and appends or writes `filelinks.config.ts`.
- [ ] **CLI-04**: Package `filelinks` exposes a `bin` so `npx filelinks <cmd>` works after publish (local path documented for dev).

### Documentation

- [ ] **DOC-01**: Root (or package) `README.md` covers install, minimal config example, and `check` / `list` / `add` usage for MVP.

## v2 Requirements

Deferred; tracked for roadmap after MVP.

### AI

- **SUGGEST-01**: `filelinks suggest` — read trigger diff + affected file contents; call AI provider; print actionable suggestions (env for API keys per doc).

### Git workflow

- **HOOK-01**: `@filelinks/git-hook` executable and husky / lint-staged documentation.

### CLI extras

- **GRAPH-01**: `filelinks graph` (terminal / HTML / DOT as in doc).

### Editor

- **VSCODE-01**: VS Code extension — gutter, context menus, link graph webview.

### Tooling

- **NX-01**: Nx plugin / `affected:links`-style integration (doc Phase 6).

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI `suggest` in v1 | MVP proves core matching + CLI; **prompt fields and `resolvePrompt` ship in core** for when `suggest` lands—no provider calls in v1. |
| `git-hook` in v1 | Thin wrapper; ship after `check` is solid. |
| VS Code / graph in v1 | Editor and visualization follow CLI MVP per doc ordering. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 — Core library | Pending |
| CORE-02 | Phase 1 — Core library | Pending |
| CORE-03 | Phase 1 — Core library | Pending |
| CORE-04 | Phase 1 — Core library | Pending |
| CORE-05 | Phase 1 — Core library | Pending |
| CLI-01 | Phase 2 — CLI MVP | Pending |
| CLI-02 | Phase 2 — CLI MVP | Pending |
| CLI-03 | Phase 2 — CLI MVP | Pending |
| CLI-04 | Phase 2 — CLI MVP | Pending |
| DOC-01 | Phase 2 — CLI MVP | Pending |

**Coverage:**

- v1 requirements: 10 total  
- Mapped to phases: 10  
- Unmapped: 0 ✓  

---
*Requirements defined: 2026-04-02*  
*Last updated: 2026-04-02 after Phase 1 schema / prompt override amendment*
