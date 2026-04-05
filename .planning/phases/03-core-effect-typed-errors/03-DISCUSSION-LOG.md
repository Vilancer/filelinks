# Phase 3: Core — Effect & typed errors - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `03-CONTEXT.md` — this log preserves the source of decisions.

**Date:** 2026-04-05  
**Phase:** 3 — Core — Effect & typed errors  
**Areas discussed:** Effect & Schema, typed error hierarchy, centralized error handler, roadmap renumbering (CLI → Phase 4)

---

## Roadmap & scope

| Option                                         | Description                                         | Selected |
| ---------------------------------------------- | --------------------------------------------------- | -------- |
| Keep CLI as Phase 3                            | Original roadmap                                    |          |
| Insert Effect/errors as Phase 3; CLI → Phase 4 | Matches dependency order (core surfaces before CLI) | ✓        |

**User's choice:** New Phase 3 = Effect + errors; former CLI MVP content moves to Phase 4.  
**Notes:** ROADMAP.md, REQUIREMENTS.md (CORE-07–09, CLI traceability), and PROJECT.md updated accordingly.

---

## Effect & Schema (CORE-07)

| Option                                                                 | Description                                            | Selected |
| ---------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| Stay on plain TypeScript interfaces                                    | No Effect                                              |          |
| Adopt Effect Schema as source of truth; export Schema + inferred types | Aligns with effect.website; runtime validation + types | ✓        |

**User's choice:** Use Effect (e.g. `effect/Schema`); replace plain types as the authority; export both Schema and types.

---

## Error hierarchy (CORE-08)

| Option                                                               | Description        | Selected |
| -------------------------------------------------------------------- | ------------------ | -------- |
| Tagged-only / union types                                            | No class hierarchy |          |
| Base error class + subclasses with shared fields and preset defaults | User-specified     | ✓        |

**User's choice:** Base class with relevant shared fields; subclasses per error type with preset defaults.

---

## Centralized handler (CORE-09)

| Option                                                                            | Description    | Selected |
| --------------------------------------------------------------------------------- | -------------- | -------- |
| Scatter handling at call sites                                                    |                |          |
| Single function: `unknown` in, `instanceof` dispatch, fallback, structured output | User-specified | ✓        |

**User's choice:** One central function; type checks; graceful unknown handling; consistent structured output.

---

## Claude's Discretion

- Exact structured payload keys and Effect API surface (sync vs Effect) — left to planning/implementation within CONTEXT constraints.

## Deferred Ideas

- CLI commands and DOC-01 — Phase 4.
