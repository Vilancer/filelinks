# Phase 5: Agent policy & schema — RESEARCH.md

**Date:** 2026-05-21  
**Confidence:** High — locked decisions in `05-CONTEXT.md` (D-01–D-10); codebase patterns from Phases 1–4 are stable.

## User Constraints (from CONTEXT — MUST HONOR)

- **D-01:** New **`classifyStagedLinks`** + **`StagedLinkCoverage`** — do **not** change **`matchStagedLinks`** semantics for `check`.
- **D-02:** One coverage record **per configured link** (full config iteration).
- **D-03:** Coverage fields: `entry`, `triggerMatched`, `affectMatched`, `triggerPaths`, `affectPaths`, `missingAffected` (when in play).
- **D-04–D-06:** **`shouldRunAgentForLink(coverage, resolvedPolicy)`**; **`trigger-or-affects`** → true iff either side matched.
- **D-07–D-10:** Effect Schema policy literal(s); global + per-link override; default **`trigger-or-affects`**; only that literal in v1.1 schema.
- **Out of scope:** Providers, Cursor SDK, CLI `--run-agents` (Phases 6–7).

## Standard Stack (prescriptive)

| Concern         | Choice                                  | Notes                                                                                                                                |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Validation      | **Effect Schema** (`effect/Schema`)     | Same as `schema.ts` today; decode in `defineLinks`.                                                                                  |
| Override merge  | **`resolveAgentRunPolicy`**             | Mirror `resolvePrompt` in `promptResolver.ts`.                                                                                       |
| Staged matching | **Reuse `linkMatcher` rules**           | Export or share `stagedCoversAffected` + `minimatch` trigger logic — **must** match existing `linkMatcher.spec.ts` dir-prefix cases. |
| Tests           | **Vitest** beside sources               | `stagedClassifier.spec.ts`, `agentRunPolicy.spec.ts`, extend `schema.spec.ts`.                                                       |
| Public API      | **`packages/core/src/index.ts`** barrel | Export new types + functions only; CLI unchanged in Phase 5.                                                                         |

## Architecture Patterns

### Config shape (planner decision — aligns Phase 6)

**Recommendation:** Nest under optional **`agent`** on both **`FileLinkConfig`** and **`FileLinkEntry`**:

```ts
agent?: {
  runPolicy?: 'trigger-or-affects';
};
```

Rationale: `.planning/STATE.md` and **PROV-02** already specify `config.agent` + `entry.agent` for provider settings. Phase 5 adds **`runPolicy`** inside the same object so Phase 6 extends with `provider`, `runtime`, etc. without a second top-level field.

**Default resolution:** `resolveAgentRunPolicy(global, entry)` returns **`'trigger-or-affects'`** when `runPolicy` omitted at both levels (runtime default, not schema default — keeps decode strict for invalid literals only).

### `classifyStagedLinks(stagedPaths, links)`

For **each** `entry` in `links`:

1. **Trigger side:** `triggerMatched = stagedPaths.some(p => minimatch(p, entry.trigger))`; collect matching paths in `triggerPaths`.
2. **Affect side:** For each `aff` in `entry.affects`, if `stagedCoversAffected(stagedPaths, aff.file, entry.linkType)` then add matching staged path(s) to `affectPaths` (dedupe). `affectMatched = affectPaths.length > 0`.
3. **In play:** `triggerMatched || affectMatched`.
4. **`missingAffected`:** When in play, list declared affects **not** covered (same `stagedCoversAffected` check as `matchStagedLinks`).
5. When **not** in play: `triggerMatched`/`affectMatched` false, empty path arrays, `missingAffected: []`.

**Do not** skip entries with no overlap — stable one-row-per-link API (D-02, CONTEXT discretion).

### `shouldRunAgentForLink`

```ts
function shouldRunAgentForLink(
  coverage: StagedLinkCoverage,
  policy: AgentRunPolicy, // resolved
): boolean;
```

For **`trigger-or-affects`:** `return coverage.triggerMatched || coverage.affectMatched`.

Future policies: add `switch` branch when product adds literals (D-10).

### Shared matcher internals

**Recommended:** Export **`stagedCoversAffected`** from `linkMatcher.ts` (already pure function) for `stagedClassifier.ts`. Keep **`directoryRootForDirLevelAffect`** private. Trigger minimatch stays duplicated in classifier (two lines) or extract **`stagedMatchesTrigger(staged, pattern)`** private helper in `linkMatcher.ts` and export if needed.

**Regression guard:** Existing **`linkMatcher.spec.ts`** must pass unchanged after export-only change.

## Don't Hand-Roll

| Problem            | Use                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Policy validation  | **Effect `Schema.Literal('trigger-or-affects')`**                                          |
| Glob matching      | **`minimatch`** (already in linkMatcher)                                                   |
| Dir-prefix affects | **`isDirectoryLevelAffectedLinkType`** + existing root extraction                          |
| Error messages     | **`normalizeError`** at CLI boundary (Phase 5: decode throws ParseError via `defineLinks`) |

## Common Pitfalls

- **Changing `matchStagedLinks`** return shape or trigger-only gate breaks CLI `check` (D-01).
- **Affect-only staging:** classifier must set `affectMatched` without `triggerMatched`; `matchStagedLinks` returns **[]** — Phase 7 relies on classifier, not violations.
- **Path lists:** include repo-relative staged paths that satisfied each side (not only declared affect globs).
- **Schema-only literal:** do not add unused policy enum values (D-10).

## Code Examples (reference)

**Schema:**

```ts
export const AgentRunPolicySchema = Schema.Literal('trigger-or-affects');
export const AgentSettingsSchema = Schema.Struct({
  runPolicy: Schema.optional(AgentRunPolicySchema),
});
// FileLinkConfigSchema: agent: Schema.optional(AgentSettingsSchema)
```

**Resolver:**

```ts
export function resolveAgentRunPolicy(
  globalConfig: FileLinkConfig,
  link: FileLinkEntry,
): AgentRunPolicy {
  return (
    link.agent?.runPolicy ??
    globalConfig.agent?.runPolicy ??
    'trigger-or-affects'
  );
}
```

## Project Constraints

- Nx: `pnpm exec nx run core:test`, `pnpm exec nx run core:build`.
- Specs: `*.spec.ts` next to sources under `packages/core/src/lib/`.
- No CLI changes in Phase 5.

## Validation Architecture

Nyquist validation is **disabled** (`nyquist_validation_enabled: false`) — no `05-VALIDATION.md`.

---

## RESEARCH COMPLETE

Planner may proceed to `05-01-PLAN.md` (AGENT-01), `05-02-PLAN.md` (AGENT-02), `05-03-PLAN.md` (AGENT-03).
