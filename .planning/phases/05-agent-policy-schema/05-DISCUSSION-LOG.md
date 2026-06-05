# Phase 5: Agent policy & schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 05-agent-policy-schema
**Areas discussed:** Exported match result shape

---

## Exported match result shape

### Q1: Primary API surface

| Option                           | Description                         | Selected |
| -------------------------------- | ----------------------------------- | -------- |
| New type + `classifyStagedLinks` | Separate from `matchStagedLinks`    | ✓        |
| Extend `StagedLinkMatch`         | Change existing matcher return type |          |
| Thin wrapper                     | Only export `shouldRunAgentForLink` |          |

**User's choice:** New type + function; keep `matchStagedLinks` for check.

### Q2: Trigger vs affect detail

| Option                       | Description                       | Selected |
| ---------------------------- | --------------------------------- | -------- |
| Booleans only                | `triggerMatched`, `affectMatched` |          |
| Booleans + path lists        | `triggerPaths`, `affectPaths`     | ✓        |
| Booleans + one path per side | Single representative path        |          |

**User's choice:** Booleans plus matched staged path lists per side.

### Q3: When to compute `missingAffected`

| Option                     | Description                         | Selected |
| -------------------------- | ----------------------------------- | -------- |
| Only when `triggerMatched` | Legacy check semantics              |          |
| When link in play          | `triggerMatched \|\| affectMatched` | ✓        |
| Always for every link      | Even with zero overlap              |          |

**User's choice:** Compute `missingAffected` when trigger or affect side matched.

### Q4: `shouldRunAgentForLink` input

| Option                     | Description                               | Selected |
| -------------------------- | ----------------------------------------- | -------- |
| Full coverage object       | `shouldRunAgentForLink(coverage, policy)` | ✓        |
| Entry + staged paths       | Gate re-derives flags                     |          |
| Pre-resolved booleans only | No `entry` in gate                        |          |

**User's choice:** Full coverage object plus resolved policy.

**Notes:** User selected only this gray area from the initial list (areas 1–5 deferred). Milestone defaults for schema/policy (AGENT-01, D-07–D-10) taken from `.planning/STATE.md` and REQUIREMENTS without separate Q&A.

---

## Claude's Discretion

- Exact type/function names; policy field placement on config schema (**05-CONTEXT.md** D-10).
- Return shape for links with zero staged overlap (all-false vs omitted).

## Deferred Ideas

- Config nesting shape, policy enum extensibility, matcher refactor — not discussed; see **05-CONTEXT.md** `<deferred>`.
