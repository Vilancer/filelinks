# Requirements: filelinks

**Defined:** 2026-04-02  
**Core Value:** When someone changes a file, they get a reliable signal about which related files must stay in sync—without relying on same-language import graphs alone.

## v1 Requirements

MVP = **`@filelinks/core` + `filelinks` CLI** (shippable, demo via `npx`). Aligned with `docs/filelinks-docs.docx` Phase 1 checklist.

### Core library

- [ ] **CORE-01**: Exported schema types (`FileLinkEntry`, `AffectedFile`) and `defineLinks()` helper per doc.
- [ ] **CORE-02**: Config loader finds and loads `filelinks.config.ts` (or documented equivalent) by walking up from cwd; surfaces clear errors.
- [ ] **CORE-03**: Git reader returns staged file paths for `check` (e.g. `git diff --name-only --cached` behavior as specified in implementation plan).
- [ ] **CORE-04**: Link matcher takes staged paths + loaded links; uses glob matching (`minimatch`); returns which trigger fired and which affected files are missing from the staged set.

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
| AI `suggest` in v1 | MVP proves core matching + CLI; AI is separate complexity (keys, prompts, cost). |
| `git-hook` in v1 | Thin wrapper; ship after `check` is solid. |
| VS Code / graph in v1 | Editor and visualization follow CLI MVP per doc ordering. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 — Core library | Pending |
| CORE-02 | Phase 1 — Core library | Pending |
| CORE-03 | Phase 1 — Core library | Pending |
| CORE-04 | Phase 1 — Core library | Pending |
| CLI-01 | Phase 2 — CLI MVP | Pending |
| CLI-02 | Phase 2 — CLI MVP | Pending |
| CLI-03 | Phase 2 — CLI MVP | Pending |
| CLI-04 | Phase 2 — CLI MVP | Pending |
| DOC-01 | Phase 2 — CLI MVP | Pending |

**Coverage:**

- v1 requirements: 9 total  
- Mapped to phases: 9  
- Unmapped: 0 ✓  

---
*Requirements defined: 2026-04-02*  
*Last updated: 2026-04-02 after initial definition*
