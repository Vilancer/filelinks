# Phase 5: Agent policy & schema - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Config and core logic know **when** an agent may run for a link—beyond “trigger is staged.” This phase delivers: **agent run policy** in Effect Schema (global default + per-link override), **staged-path classification** (trigger-side vs affect-side, reusing `linkType` directory-prefix rules), and **`shouldRunAgentForLink`** (or equivalent) for **`trigger-or-affects`**. It does **not** implement providers, Cursor SDK, or **`check --run-agents`** (Phases 6–7).

</domain>

<decisions>
## Implementation Decisions

### Staged coverage API (AGENT-02)

- **D-01:** Add a **new exported function** (e.g. **`classifyStagedLinks(stagedPaths, links)`**) and **new type** (e.g. **`StagedLinkCoverage`**) — do **not** fold policy semantics into **`matchStagedLinks`**; keep **`matchStagedLinks`** behavior for **`check`** violations unchanged.
- **D-02:** **`classifyStagedLinks`** evaluates **every** configured link and returns one coverage record per link (stable iteration over full config).
- **D-03:** Each **`StagedLinkCoverage`** includes:
  - **`entry`** — the `FileLinkEntry`
  - **`triggerMatched`**, **`affectMatched`** — booleans
  - **`triggerPaths`**, **`affectPaths`** — repo-relative staged paths that satisfied trigger / any affect (respecting **`linkType`** dir-prefix rules on the affect side, same rules as **`stagedCoversAffected`** in `linkMatcher.ts`)
  - **`missingAffected`** — `AffectedFile[]` computed when the link is **in play**: **`triggerMatched || affectMatched`**; lists declared affects **not** covered by the staged set (not only when trigger alone matched).

### Policy gate (AGENT-03)

- **D-04:** **`shouldRunAgentForLink(coverage, resolvedPolicy)`** accepts the **full coverage object** plus a **resolved** policy value (not raw `entry` + staged paths re-derived inside the gate).
- **D-05:** For policy **`trigger-or-affects`**, return **`true`** when **`coverage.triggerMatched || coverage.affectMatched`**; return **`false`** when **neither** side matched.
- **D-06:** **Affect-only** staging can yield **`shouldRunAgent === true`** even when **`matchStagedLinks`** returns no row (trigger never staged)—Phase 7 **`--run-agents`** depends on classification, not violation rows.

### Config & policy schema (AGENT-01) — milestone defaults, not re-discussed in discuss-phase

- **D-07:** Schema includes **agent run policy** with at least literal **`trigger-or-affects`**; invalid values fail **Effect Schema** decode with clear errors via existing **`normalizeError`** path.
- **D-08:** **Global default** on **`FileLinkConfig`** and **optional per-link override** on **`FileLinkEntry`** (same override mental model as **`prompt`** / **`resolvePrompt`**); provide **`resolveAgentRunPolicy(global, entry)`** (name may vary) merging global → per-link.
- **D-09:** When policy is omitted at both levels, default to **`trigger-or-affects`** (v1.1 milestone decision in `.planning/STATE.md`).
- **D-10:** v1.1 schema exposes **only** the **`trigger-or-affects`** policy literal for now; add new literals when a second policy is product-approved (no reserved unused enum values in Phase 5).

### Claude's Discretion

- Exact TypeScript names (`StagedLinkCoverage`, `classifyStagedLinks`, `AgentRunPolicy`, policy field key on config/entry).
- Whether policy lives as a top-level field vs first field under a future **`agent`** object—must satisfy **D-07–D-09** and stay easy for Phase 6 **`resolveAgentConfig`** to extend without breaking **`defineLinks`** authors.
- Whether **`classifyStagedLinks`** returns entries with **no** staged overlap as all-false / empty path lists (recommended for stable “one row per link” API).
- Fine-grained **`FilelinksError`** subclass for invalid policy at decode time.

### Folded Todos

_None — no matching pending todos for this phase._

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & milestone

- `.planning/REQUIREMENTS.md` — **AGENT-01**, **AGENT-02**, **AGENT-03**
- `.planning/ROADMAP.md` — Phase 5 goal and success criteria
- `.planning/PROJECT.md` — v1.1 agent policy and override patterns
- `.planning/STATE.md` — confirmed v1.1 defaults (`trigger-or-affects`, missing-affects still run in Phase 7)

### Prior phase context

- `.planning/phases/01-core-library/01-CONTEXT.md` — global + per-link override pattern
- `.planning/phases/02-core-link-types-repo-dx/02-CONTEXT.md` — `linkType`, matcher dir-prefix behavior
- `.planning/phases/03-core-effect-typed-errors/03-CONTEXT.md` — Effect Schema, typed errors, `normalizeError`
- `.planning/phases/04-cli-mvp/04-CONTEXT.md` — `check` / `matchStagedLinks` violation semantics (unchanged)

### Code

- `packages/core/src/lib/schema.ts` — config shapes to extend
- `packages/core/src/lib/linkMatcher.ts` — `matchStagedLinks`, `stagedCoversAffected` / dir-prefix rules to reuse
- `packages/core/src/lib/promptResolver.ts` — merge pattern for `resolveAgentRunPolicy`
- `packages/core/src/lib/linkType.ts` — directory-level affect helpers
- `packages/core/src/index.ts` — public barrel exports
- `.planning/codebase/ARCHITECTURE.md` — config → matcher data flow

### Product

- `docs/filelinks-docs.docx` — narrative (superseded for v1.1 agent detail by REQUIREMENTS + this context)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **`matchStagedLinks`**, **`stagedCoversAffected`** / **`directoryRootForDirLevelAffect`** — affect-side classification must stay consistent with check matching.
- **`resolvePrompt`** — template for **`resolveAgentRunPolicy`** (spread global, then per-link).
- **`defineLinks`**, **`FileLinkConfigSchema`**, **`FileLinkEntrySchema`** — extend with policy fields; decode at authoring boundary.
- **`normalizeError`**, **`FilelinksError`** hierarchy — schema decode failures for invalid policy.

### Established Patterns

- Effect **`Schema.Literal`** / **`Schema.optional`** on entries and config; Vitest specs beside sources.
- **Triggers** always **`minimatch`**; **affects** use **`minimatch`** + optional **dir-prefix** when `linkType` is **`file-dir`** or **`dir-dir`**.

### Integration Points

- **`packages/cli/src/lib/runCheck.ts`** — continues to use **`matchStagedLinks`** only (Phase 5 does not change CLI).
- **Phase 6** — provider config merges on same global/per-link pattern.
- **Phase 7** — **`--run-agents`** consumes **`classifyStagedLinks`** + **`shouldRunAgentForLink`**; uses **`triggerPaths`** / **`affectPaths`** for prompt and file context (CLI-07).

</code_context>

<specifics>
## Specific Ideas

- User chose **separate classification API** with **path lists** so downstream agents need not re-scan staged paths.
- **`missingAffected`** when link is **in play** (`trigger || affect` matched), aligning with “still run when companions missing” (Phase 7).

</specifics>

<deferred>
## Deferred Ideas

### Not discussed in discuss-phase (other gray areas)

- **Config field nesting** (`agent` object vs flat policy key) — left to planner/discretion (**D-10**); must not block Phase 6 provider fields.
- **Future policy literals** (`trigger-only`, `affects-only`, etc.) — post–v1.1; see **D-10**.

### Reviewed Todos (not folded)

_None._

**None — discussion stayed within phase scope.**

</deferred>

---

_Phase: 05-agent-policy-schema_
_Context gathered: 2026-05-21_
