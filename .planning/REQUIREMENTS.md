# Requirements: filelinks

**Defined:** 2026-05-21  
**Milestone:** v1.1 — AI agent integration (Cursor SDK)  
**Core Value:** When someone changes a file, they get a reliable signal about which related files must stay in sync—without relying on same-language import graphs alone.

## v1.1 Requirements

### Agent run policy

- [x] **AGENT-01**: Config schema includes **agent run policy** with at least **`trigger-or-affects`**, plus global default on `FileLinkConfig` and optional per-link override on `FileLinkEntry` (Effect Schema + `defineLinks` validation).
- [x] **AGENT-02**: Core classifies staged paths per link into **trigger-side** vs **affect-side** matches (reuses `linkType` directory-prefix rules for affects).
- [x] **AGENT-03**: **`shouldRunAgentForLink`** (or equivalent) returns true when policy is satisfied for a matched link (e.g. `trigger-or-affects` → run if either side has staged coverage).

### Provider system

- [x] **PROV-01**: **Provider interface** in core (or dedicated package) with a **Cursor** implementation registered for `provider: 'cursor'`.
- [x] **PROV-02**: **`resolveAgentConfig`** merges global `config.agent` with per-link `entry.agent` (same override pattern as `resolvePrompt`).
- [x] **PROV-03**: Missing required provider env keys (e.g. **`CURSOR_API_KEY`**) surface as **typed `FilelinksError`** at run time via **`normalizeError`**-compatible messages.

### Cursor SDK integration

- [x] **SDK-01**: Cursor provider supports **local** runtime with explicit `cwd` (create → send → wait → dispose).
- [x] **SDK-02**: Cursor provider supports **cloud** runtime with explicit `repos` configuration (no silent fallback to local).
- [x] **SDK-03**: Provider distinguishes **startup failures** (`CursorAgentError`) from **run failures** (`result.status === 'error'`) with distinct error codes/messages for CLI exit handling.

### CLI

- [x] **CLI-05**: **`filelinks check --run-agents`** flag wired through Commander and `runCheck` (or dedicated runner invoked from check).
- [x] **CLI-06**: After existing violation reporting, **eligible links** invoke the agent per policy; **agents still run when affects are missing** from the staged set.
- [x] **CLI-07**: Agent prompt includes **resolved `PromptConfig`**, **trigger diff context**, and **affected file contents** (read from disk where paths exist).

### Documentation

- [x] **DOC-03**: README / CONTRIBUTING document **`--run-agents`**, agent config shape, **`CURSOR_API_KEY`**, and local vs cloud runtime selection.

## Future Requirements (post–v1.1)

### Git workflow

- **HOOK-01**: `@filelinks/git-hook` executable and husky / lint-staged documentation.

### CLI extras

- **GRAPH-01**: `filelinks graph` (terminal / HTML / DOT).
- **SUGGEST-02**: Standalone **`filelinks suggest`** command (if distinct from `check --run-agents`).

### Editor & tooling

- **VSCODE-01**: VS Code extension — gutter, context menus, link graph webview.
- **NX-01**: Nx plugin / `affected:links`-style integration.

### Providers

- **PROV-04**: Additional agent providers beyond Cursor (OpenAI, etc.) behind the same interface.

## Out of Scope

| Feature                        | Reason                                                      |
| ------------------------------ | ----------------------------------------------------------- |
| `@filelinks/git-hook` package  | Deferred; v1.1 focuses on agent execution from CLI          |
| VS Code / graph / Nx plugin    | Later milestones per product doc ordering                   |
| Non-Cursor providers in v1.1   | Interface + Cursor only; expand in PROV-04                  |
| Standalone `suggest` command   | Shipped as **`check --run-agents`** for v1.1                |
| Auto-run without explicit flag | User must pass **`--run-agents`** to invoke agents (safety) |

## Traceability

| Requirement | Phase                                  | Status   |
| ----------- | -------------------------------------- | -------- |
| AGENT-01    | Phase 5 — Agent policy & schema        | Complete |
| AGENT-02    | Phase 5 — Agent policy & schema        | Complete |
| AGENT-03    | Phase 5 — Agent policy & schema        | Complete |
| PROV-01     | Phase 6 — Provider system & Cursor SDK | Complete |
| PROV-02     | Phase 6 — Provider system & Cursor SDK | Complete |
| PROV-03     | Phase 6 — Provider system & Cursor SDK | Complete |
| SDK-01      | Phase 6 — Provider system & Cursor SDK | Complete |
| SDK-02      | Phase 6 — Provider system & Cursor SDK | Complete |
| SDK-03      | Phase 6 — Provider system & Cursor SDK | Complete |
| CLI-05      | Phase 7 — CLI `check --run-agents`     | Complete |
| CLI-06      | Phase 7 — CLI `check --run-agents`     | Complete |
| CLI-07      | Phase 7 — CLI `check --run-agents`     | Complete |
| DOC-03      | Phase 7 — CLI `check --run-agents`     | Complete |

**Coverage:**

- v1.1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---

_Requirements defined: 2026-05-21_
