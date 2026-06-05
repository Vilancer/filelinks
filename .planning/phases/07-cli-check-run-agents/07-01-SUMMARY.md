---
phase: 07-cli-check-run-agents
plan: 01
subsystem: api
tags: [git, prompt, effect-schema, vitest, node-fs]

requires:
  - phase: 06-provider-system-cursor-sdk
    provides: AgentRunInput prompt string contract, resolvePrompt, providers
provides:
  - getStagedDiffForPaths for staged trigger unified diff
  - readAffectedContents and buildAgentPrompt for CLI-07 assembly
affects: [07-02, 07-03, cli-check-run-agents]

tech-stack:
  added: []
  patterns:
    - 'Git staged diff via execFileSync git diff --cached -- paths'
    - 'Prompt markdown sections for system, trigger diff, affect file fences'

key-files:
  created:
    - packages/core/src/lib/agentPrompt.ts
    - packages/core/src/lib/agentPrompt.spec.ts
  modified:
    - packages/core/src/lib/gitReader.ts
    - packages/core/src/lib/gitReader.spec.ts
    - packages/core/src/index.ts

key-decisions:
  - '256 KiB per-file truncation with …(truncated) suffix in readAffectedContents'
  - 'Directory affects get a note line instead of tree walk (v1.1 scope)'

patterns-established:
  - 'buildAgentPrompt is pure string composition; no @cursor/sdk in core prompt layer'

requirements-completed: [CLI-07]

duration: 4min
completed: 2026-05-31
---

# Phase 07 Plan 01: Core prompt and git diff helpers Summary

**Core exports staged trigger diffs, disk-backed affect contents, and `buildAgentPrompt` for `check --run-agents` without CLI or SDK imports.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-31T01:40:17Z
- **Completed:** 2026-05-31T01:41:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `getStagedDiffForPaths` returns `git diff --cached` for repo-relative paths; empty list skips git.
- `readAffectedContents` reads files, placeholders for missing paths, and directory notes without tree walk.
- `buildAgentPrompt` assembles system prompt, metadata, trigger diff section, and fenced affect blocks (including affect-only / empty trigger).
- Core barrel re-exports new APIs for plans 07-02+.

## Task Commits

Each task was committed atomically:

1. **Task 1: getStagedDiffForPaths in gitReader** - `28228cd` (feat)
2. **Task 2: readAffectedContents and buildAgentPrompt** - `e4671a1` (feat)
3. **Task 3: Export new APIs from core barrel** - `5bd18a7` (feat)

## Files Created/Modified

- `packages/core/src/lib/gitReader.ts` - `getStagedDiffForPaths`
- `packages/core/src/lib/gitReader.spec.ts` - mocked git diff tests
- `packages/core/src/lib/agentPrompt.ts` - read/build prompt helpers
- `packages/core/src/lib/agentPrompt.spec.ts` - missing file, affect-only, directory cases
- `packages/core/src/index.ts` - `export * from './lib/agentPrompt'`

## Decisions Made

- 256 KiB truncation per affect file to cap prompt size.
- Directory affects: single-line note, no shallow tree listing in v1.1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] path default import broke core:build**

- **Found during:** Task 3 verification
- **Issue:** `import path from 'node:path'` failed TS1259 without esModuleInterop
- **Fix:** Switched to `import * as path from 'node:path'` in `agentPrompt.ts` and spec
- **Files modified:** `packages/core/src/lib/agentPrompt.ts`, `packages/core/src/lib/agentPrompt.spec.ts`
- **Verification:** `pnpm exec nx run core:build --skip-nx-cache` exit 0
- **Committed in:** `e4671a1` (Task 2 commit, before Task 3 barrel commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for public API compile; no scope change.

## Issues Encountered

None beyond the path import build failure (resolved inline).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 07-02 can import `getStagedDiffForPaths`, `readAffectedContents`, `buildAgentPrompt` from `@filelinks/core`.
- `pnpm exec nx run core:test` and `core:build` pass.

## Self-Check: PASSED

- All key files present on disk
- Task commits `28228cd`, `e4671a1`, `5bd18a7` on current branch

---

_Phase: 07-cli-check-run-agents_
_Completed: 2026-05-31_
