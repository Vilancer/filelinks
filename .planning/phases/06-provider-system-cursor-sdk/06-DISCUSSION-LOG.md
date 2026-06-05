# Phase 6: Provider system & Cursor SDK - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 6 — Provider system & Cursor SDK
**Areas discussed:** Provider interface & registry, Config schema & merge, listModels API, Cursor SDK lifecycle & errors, Package boundaries

---

## Provider interface & registry

| Option                                 | Description                                        | Selected |
| -------------------------------------- | -------------------------------------------------- | -------- |
| Cursor SDK calls directly from CLI     | Fastest v1.1 but blocks PROV-04                    |          |
| **`AgentProvider` + registry in core** | Interface + `register`/`get`; Cursor as first impl | ✓        |
| Separate `@filelinks/agents` package   | Cleaner boundary; more publish overhead            |          |

**User's choice:** Enforce **provider pattern for future providers** (stated in `/gsd-discuss-phase 6` invocation).
**Notes:** Registry must fail loudly on unknown `provider` id.

---

## listModels

| Option                                       | Description                                | Selected |
| -------------------------------------------- | ------------------------------------------ | -------- |
| No model discovery in v1.1                   | Config authors guess model ids             |          |
| **Required `listModels` on `AgentProvider`** | Cursor uses `Cursor.models.list`; core DTO | ✓        |
| CLI-only models command without core API     | Couples discovery to CLI                   |          |

**User's choice:** **list of models func for the providers** (user request).
**Notes:** Phase 6 ships core API; CLI command optional in Phase 7.

---

## Runtime selection (carried from v1.1 milestone)

| Option                                                | Description                          | Selected |
| ----------------------------------------------------- | ------------------------------------ | -------- |
| SDK default (local when omitted)                      | Easy but violates milestone          |          |
| **Explicit `runtime` + `local.cwd` or `cloud.repos`** | Matches STATE.md + SDK skill trap #1 | ✓        |

**User's choice:** Pre-decided in `.planning/STATE.md` / PROJECT.md (2026-05-21).

---

## SDK invocation shape

| Option                                         | Description                          | Selected |
| ---------------------------------------------- | ------------------------------------ | -------- |
| `Agent.prompt` one-shot                        | Simple; no follow-up/stream path     |          |
| **`Agent.create` + `send` + `wait` + dispose** | Aligns with SDK skill; Phase 7-ready | ✓        |

**Notes:** Recommended default from Cursor SDK skill attached to session.

---

## Error mapping

| Option                           | Description                                | Selected |
| -------------------------------- | ------------------------------------------ | -------- |
| Single generic agent error       | Harder CLI exit codes                      |          |
| **Startup vs run failure types** | `CursorAgentError` vs `status === 'error'` | ✓        |

**Notes:** SDK skill exit code guidance (1 vs 2) informs Phase 7; Phase 6 defines error types/codes in core.

---

## Claude's Discretion

- File/module naming under `packages/core/src/lib/providers/`
- Exact Schema field names for `local` / `cloud` nested structs
- Whether `listModels` needs a `cwd` for local-only discovery (likely API-key only)

## Deferred Ideas

- Non-Cursor providers (PROV-04)
- `filelinks agent models` CLI
- MCP / resume / streaming UX in CLI
