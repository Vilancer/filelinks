---
phase: 06-provider-system-cursor-sdk
plan: 02
subsystem: api
tags: [agent, provider, registry, FilelinksError, typescript]

requires:
  - phase: 06-01
    provides: ResolvedAgentConfig, AgentConfigError, agent schema types
provides:
  - AgentProvider interface with validateCredentials, listModels, run
  - Provider registry (register/get/list) with typed unknown-provider error
  - Agent error subclasses (missing API key, startup, run failed)
  - listAgentModels helper exported from @filelinks/core
affects:
  - 06-03-cursor-provider
  - check --run-agents CLI integration

tech-stack:
  added: []
  patterns:
    - AgentProvider plugin interface with Map-based registry
    - Agent failures throw typed FilelinksError subclasses (no error status in AgentRunResult)

key-files:
  created:
    - packages/core/src/lib/providers/types.ts
    - packages/core/src/lib/providers/registry.ts
    - packages/core/src/lib/providers/registry.spec.ts
    - packages/core/src/lib/providers/index.ts
  modified:
    - packages/core/src/lib/errors.ts
    - packages/core/src/lib/handleError.spec.ts
    - packages/core/src/index.ts

key-decisions:
  - 'AgentRunResult returns finished status only; failures throw AgentRunFailedError'
  - 'registerBuiltInProviders is a no-op stub until plan 03 registers Cursor'

patterns-established:
  - 'Provider registry: registerAgentProvider / getAgentProvider / listAgentProviderIds'
  - 'Agent errors use stable AGENT_* codes for CLI normalizeError consumption'

requirements-completed: [PROV-01, PROV-03]

duration: 3min
completed: 2026-05-31
---

# Phase 06 Plan 02: Provider Interface + Registry Summary

**AgentProvider interface, Map-based registry with typed unknown-provider errors, and PROV-03 agent FilelinksError subclasses ready for Cursor SDK integration in plan 03**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-31T01:20:35Z
- **Completed:** 2026-05-31T01:23:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added five agent-related `FilelinksError` subclasses with stable `AGENT_*` codes
- Defined `AgentProvider` interface with `validateCredentials`, `listModels`, and `run`
- Implemented provider registry with `registerAgentProvider`, `getAgentProvider`, and `listAgentModels` export

## Task Commits

Each task was committed atomically:

1. **Task 1: Agent FilelinksError subclasses** - `2ce80d2` (feat)
2. **Task 2: AgentProvider types and interface** - `5d079df` (feat)
3. **Task 3: Provider registry** - `63acece` (feat)

## Files Created/Modified

- `packages/core/src/lib/errors.ts` - AgentMissingApiKeyError, AgentProviderUnknownError, AgentStartupError, AgentRunFailedError
- `packages/core/src/lib/handleError.spec.ts` - AGENT_MISSING_API_KEY normalizeError case
- `packages/core/src/lib/providers/types.ts` - AgentProvider interface and run types
- `packages/core/src/lib/providers/registry.ts` - Map-based provider registry
- `packages/core/src/lib/providers/registry.spec.ts` - register/get and unknown id tests
- `packages/core/src/lib/providers/index.ts` - barrel + listAgentModels helper
- `packages/core/src/index.ts` - exports providers module

## Decisions Made

- `AgentRunResult` documents success-only; error path throws `AgentRunFailedError` instead of returning error status
- `registerBuiltInProviders()` left as no-op stub for plan 03 Cursor registration
- `AgentConfigError` already existed from plan 01 — not duplicated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Registry spec test isolation across module reloads**

- **Found during:** Task 3 (Provider registry)
- **Issue:** `toThrow(AgentProviderUnknownError)` failed after `vi.resetModules()` because instanceof checks a different class instance; shared Map state also risked order-dependent failures
- **Fix:** Use `vi.resetModules()` + dynamic import per test; assert error by `code` property instead of instanceof
- **Files modified:** packages/core/src/lib/providers/registry.spec.ts
- **Verification:** `pnpm exec nx run core:test --skip-nx-cache` — 65 tests pass
- **Committed in:** 63acece (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test fix only; no API or scope changes.

## Issues Encountered

None beyond the registry spec isolation fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PROV-01 and PROV-03 complete; plan 03 can implement `cursorProvider` and call `registerBuiltInProviders()`
- `getAgentProvider('cursor')` will throw `AgentProviderUnknownError` until plan 03 registers the provider

## Self-Check: PASSED

- FOUND: packages/core/src/lib/providers/types.ts
- FOUND: packages/core/src/lib/providers/registry.ts
- FOUND: packages/core/src/lib/providers/registry.spec.ts
- FOUND: packages/core/src/lib/providers/index.ts
- FOUND: 2ce80d2
- FOUND: 5d079df
- FOUND: 63acece

---

_Phase: 06-provider-system-cursor-sdk_
_Completed: 2026-05-31_
