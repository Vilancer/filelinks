# Retrospective — filelinks

Living document; append a section per milestone.

## Cross-Milestone Trends

| Milestone | Phases | Plans | Notes                          |
| --------- | ------ | ----- | ------------------------------ |
| v1.0 MVP  | 4      | 7     | Core + CLI first; AI deferred. |

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-06  
**Phases:** 4 | **Plans:** 7

### What Was Built

- **`@filelinks/core`:** Config schema (Effect), jiti load, git staged paths, minimatch matching, optional `linkType`, `resolvePrompt`, typed errors and `normalizeError`.
- **`filelinks` CLI:** `check`, `list`, interactive `add` (Ink), global flags including `--config`, README and `bin` for publish/`npx`.

### What Stayed Out of Scope (by design)

- **No AI** — no `suggest`, no model calls; prompt merge exists for a future command.
- **No “active config” service** — `filelinks.config.ts` is data on disk; it is **used when commands run**, not a long-running process.
- **No shipped `@filelinks/git-hook`** — repo Husky is for development only until a later milestone.

### Key Lessons

- Keep milestone requirements and `REQUIREMENTS.md` checkboxes in sync before archive to avoid stale “Pending” rows.
- Phase SUMMARY frontmatter should use a consistent `one_liner` field so `gsd-tools milestone complete` picks clean accomplishment lines.

---
