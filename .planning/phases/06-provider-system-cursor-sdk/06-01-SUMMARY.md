---
phase: 06-provider-system-cursor-sdk
plan: 01
subsystem: api
tags: [effect-schema, agent-config, cursor, prov-02]

requires:
  - phase: 05-agent-policy-schema
    provides: AgentSettingsSchema, resolveAgentRunPolicy merge pattern
provides:
  - Extended AgentSettingsSchema (provider, runtime, model, local, cloud)
  - resolveAgentConfig and validateResolvedAgentConfig
  - AgentConfigError typed validation failures
affects:
  - 06-02-provider-registry
  - 06-03-cursor-provider
  - 07-check-run-agents

tech-stack:
  added: []
  patterns:
    - Effect Schema literals for agent provider/runtime
    - Shallow merge global then per-link agent (same as prompt/runPolicy)
    - Post-merge runtime shape validation with AgentConfigError

key-files:
  created:
    - packages/core/src/lib/agentConfigResolver.ts
    - packages/core/src/lib/agentConfigResolver.spec.ts
  modified:
    - packages/core/src/lib/schema.ts
    - packages/core/src/lib/schema.spec.ts
    - packages/core/src/lib/errors.ts
    - packages/core/src/index.ts

key-decisions:
  - 'ResolvedAgentConfig omits inactive runtime block (local vs cloud) so per-link runtime override does not leak stale global cloud/local'
  - 'AgentConfigError (AGENT_CONFIG_INVALID) for merged-config validation; plan 02 may extend normalizeError'

patterns-established:
  - 'resolveAgentConfig mirrors resolvePrompt shallow merge with validateResolvedAgentConfig at boundary'
  - 'cursor provider defaults omitted model to composer-2.5 after merge'

requirements-completed: [PROV-02]

duration: 2min
completed: 2026-05-31
---

# Phase 6 Plan 1: Agent config schema & resolver Summary

**PROV-02: Effect Schema agent execution fields plus resolveAgentConfig merge/validation with cursor model default composer-2.5**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-31T01:18:20Z
- **Completed:** 2026-05-31T01:19:49Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extended `AgentSettingsSchema` with `provider`, `runtime`, `model`, `local`, `cloud` and exported related types
- Schema specs reject invalid provider/runtime literals at `defineLinks` decode
- `resolveAgentConfig` / `validateResolvedAgentConfig` with required provider/runtime and runtime-specific shape rules
- `AgentConfigError` for actionable post-merge validation failures
- Barrel export from `@filelinks/core`

## Task Commits

1. **Task 1: Extend AgentSettings schema** - `a8a2c67` (feat)
2. **Task 2: Schema specs for agent execution fields** - `ba0bb83` (test)
3. **Task 3: resolveAgentConfig and validateResolvedAgentConfig** - `05b8c7e` (feat)

## Files Created/Modified

- `packages/core/src/lib/schema.ts` - Agent provider/runtime/local/cloud schemas
- `packages/core/src/lib/schema.spec.ts` - Decode acceptance/rejection tests
- `packages/core/src/lib/agentConfigResolver.ts` - Merge + validate resolved agent config
- `packages/core/src/lib/agentConfigResolver.spec.ts` - Resolver and validation specs
- `packages/core/src/lib/errors.ts` - `AgentConfigError`
- `packages/core/src/index.ts` - Export resolver module

## Decisions Made

- Resolved output includes only the active runtime block (`local` or `cloud`) matching `runtime`, avoiding stale fields from shallow merge when per-link overrides runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Strip inactive runtime block from ResolvedAgentConfig**

- **Found during:** Task 3 (per-link override test)
- **Issue:** Shallow merge left global `cloud` on resolved config when per-link set `runtime: 'local'`
- **Fix:** Return `local` only when `runtime === 'local'`, `cloud` only when `runtime === 'cloud'`
- **Files modified:** `packages/core/src/lib/agentConfigResolver.ts`
- **Verification:** `pnpm exec nx run core:test --skip-nx-cache` (62 tests)
- **Committed in:** `05b8c7e`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Correctness for Phase 7 provider.run; no scope beyond PROV-02

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06-02 can add provider registry and wire `getAgentProvider(resolved.provider)`
- `validateResolvedAgentConfig` ready for Cursor provider `run` input
- `normalizeError` registration for `AgentConfigError` deferred to plan 02 per plan note

---

_Phase: 06-provider-system-cursor-sdk_
_Completed: 2026-05-31_

## Self-Check: PASSED

- FOUND: packages/core/src/lib/agentConfigResolver.ts
- FOUND: packages/core/src/lib/agentConfigResolver.spec.ts
- FOUND: packages/core/src/lib/schema.ts (AgentProviderIdSchema)
- FOUND: commit a8a2c67
- FOUND: commit ba0bb83
- FOUND: commit 05b8c7e
