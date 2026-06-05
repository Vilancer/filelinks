---
phase: 06-provider-system-cursor-sdk
plan: 03
subsystem: api
tags: [cursor, agent, sdk, provider, typescript]

requires:
  - phase: 06-01
    provides: ResolvedAgentConfig, agent schema, AgentConfigError
  - phase: 06-02
    provides: AgentProvider interface, registry, agent FilelinksError subclasses
provides:
  - Cursor agent provider (validateCredentials, listModels, run)
  - @cursor/sdk integration isolated in cursorProvider.ts
  - registerBuiltInProviders registers cursor on @filelinks/core import
affects:
  - Phase 7 check --run-agents CLI
  - listAgentModels / getAgentProvider('cursor') consumers

tech-stack:
  added: ['@cursor/sdk@^1.0.17']
  patterns:
    - SDK only imported from cursorProvider.ts
    - Explicit local vs cloud Agent.create options (no silent runtime default)
    - CursorAgentError → AgentStartupError; result.status error → AgentRunFailedError
    - Agent disposed via Symbol.asyncDispose in finally

key-files:
  created:
    - packages/core/src/lib/providers/cursorProvider.ts
    - packages/core/src/lib/providers/cursorProvider.spec.ts
  modified:
    - packages/core/package.json
    - packages/core/src/lib/providers/index.ts
    - packages/core/src/lib/providers/registry.ts
    - pnpm-lock.yaml

key-decisions:
  - "Cloud repo slugs (org/repo) map to https://github.com/{slug} URLs for SDK CloudAgentOptions"
  - "registerBuiltInProviders() runs at providers module load so cursor is available without CLI setup"
  - "Local Agent.create uses settingSources: [] to avoid ambient Cursor app settings"

patterns-established:
  - "Mock @cursor/sdk with vi.mock in provider specs — no CURSOR_API_KEY in CI"
  - "run() disposes agent in finally after send/wait"

requirements-completed: [PROV-01, PROV-03, SDK-01, SDK-02, SDK-03]

duration: 12min
completed: 2026-05-31
---

# Phase 06 Plan 03: Cursor Provider + SDK Summary

**Cursor agent provider with @cursor/sdk: credential validation, listModels, explicit local/cloud run with dispose and typed startup vs run failures**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-31T04:22:00Z
- **Completed:** 2026-05-31T04:34:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added `@cursor/sdk` to `@filelinks/core` and verified build
- Implemented `cursorAgentProvider` with `validateCredentials`, `listModels`, and `run`
- Registered Cursor via `registerBuiltInProviders()` on core providers import; mocked SDK in Vitest

## Task Commits

Each task was committed atomically:

1. **Task 1: Add @cursor/sdk dependency** - `eaa5939` (chore)
2. **Task 2: Cursor provider validateCredentials and listModels** - `9422ee6` (feat)
3. **Task 3: Cursor provider run with dispose and error mapping** - `b4be1a6` (feat)

## Files Created/Modified

- `packages/core/package.json` - `@cursor/sdk` dependency
- `packages/core/src/lib/providers/cursorProvider.ts` - Cursor AgentProvider implementation
- `packages/core/src/lib/providers/cursorProvider.spec.ts` - vi.mock('@cursor/sdk') tests
- `packages/core/src/lib/providers/index.ts` - `registerBuiltInProviders` + eager registration
- `packages/core/src/lib/providers/registry.ts` - removed no-op stub
- `pnpm-lock.yaml` - lockfile for SDK transitive deps

## Decisions Made

- Map `cloud.repos` string slugs to `{ url: 'https://github.com/org/repo' }` for SDK typing (full URLs passed through unchanged)
- Task 2 commit includes full `cursorProvider.ts`; task 3 commit wires registration in `index.ts` (run logic shipped with provider file in 9422ee6)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] readonly cloud.repos for toCloudRepos**

- **Found during:** Task 3 (build verification)
- **Issue:** `ResolvedAgentConfig.cloud.repos` is readonly; `toCloudRepos` expected `string[]`
- **Fix:** Spread to mutable copy: `toCloudRepos([...config.cloud!.repos])`
- **Files modified:** packages/core/src/lib/providers/cursorProvider.ts
- **Verification:** `pnpm exec nx run core:build --skip-nx-cache` exits 0
- **Committed in:** 9422ee6 (Task 2 commit, before task 3 commit)

**2. [Rule 3 - Blocking] Duplicate registerBuiltInProviders export**

- **Found during:** Task 3 (build)
- **Issue:** Re-exported and defined `registerBuiltInProviders` in `index.ts`
- **Fix:** Remove from re-export block; single `export function` definition
- **Files modified:** packages/core/src/lib/providers/index.ts
- **Verification:** build + 72 tests pass
- **Committed in:** b4be1a6 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Type/export fixes only; behavior matches plan intent.

## Issues Encountered

None beyond build fixes documented above.

## User Setup Required

Manual smoke tests against the real Cursor API need `CURSOR_API_KEY` in the environment (see plan `user_setup`). CI uses mocked SDK only.

## Next Phase Readiness

- Phase 7 can call `resolveAgentConfig` + `getAgentProvider('cursor').run({ prompt, config })`
- `listAgentModels('cursor', ctx)` available for validation or future CLI
- All phase 6 plans complete; phase verifier can run milestone checks

## Self-Check: PASSED

- FOUND: packages/core/src/lib/providers/cursorProvider.ts
- FOUND: packages/core/src/lib/providers/cursorProvider.spec.ts
- FOUND: packages/core/package.json
- FOUND: eaa5939 (via git rev-parse)
- FOUND: 9422ee6 (via git rev-parse)
- FOUND: b4be1a6 (via git rev-parse)

---

_Phase: 06-provider-system-cursor-sdk_
_Completed: 2026-05-31_
