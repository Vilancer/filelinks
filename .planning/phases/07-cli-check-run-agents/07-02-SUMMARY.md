---
phase: 07-cli-check-run-agents
plan: 02
subsystem: cli
tags: [vitest, agents, check, classifyStagedLinks, commander]

requires:
  - phase: 07-cli-check-run-agents
    plan: 01
    provides: getStagedDiffForPaths, readAffectedContents, buildAgentPrompt
provides:
  - async runCheck with runAgents opt and agent orchestration loop
  - AgentRunSummaryJson accumulation for JSON output (07-03)
  - parseAsync runCli for async check action
affects: [07-03, 07-04]

tech-stack:
  added: []
  patterns:
    - 'Violations via matchStagedLinks; agent eligibility via classifyStagedLinks + shouldRunAgentForLink (D-06)'
    - 'Exit code Math.max(violationExit, agentExit)'

key-files:
  created:
    - packages/cli/src/lib/runCheck.spec.ts
  modified:
    - packages/cli/src/lib/runCheck.ts
    - packages/cli/src/lib/formatters.ts
    - packages/cli/src/lib/cli.ts
    - packages/cli/src/lib/cli.spec.ts
    - packages/cli/src/lib/cli.e2e.spec.ts
    - packages/cli/src/index.ts

key-decisions:
  - 'Human violations print before agent loop; JSON emitted after agents complete'
  - 'runCli uses parseAsync so async check action sets exitCode before E2E assertions'

patterns-established:
  - 'CLI-06: never gate agent eligibility on missingAffected.length or matchStagedLinks rows'

requirements-completed: [CLI-06, CLI-07]

duration: 18min
completed: 2026-05-31
---

# Phase 07 Plan 02: Async runCheck agent orchestration Summary

**`runCheck` is async with optional `runAgents`: violations unchanged via `matchStagedLinks`, then sequential `provider.run` for policy-eligible `classifyStagedLinks` rows including when affects are missing (CLI-06).**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-31T01:27:00Z
- **Completed:** 2026-05-31T01:45:03Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `RunCheckOpts.runAgents` defaults false; violation-only path unchanged when false.
- Agent loop: `classifyStagedLinks` → `resolveAgentRunPolicy` / `shouldRunAgentForLink` → `buildAgentPrompt` → `getAgentProvider().run`.
- `agentRuns` accumulated with `trigger`, `status`, optional `runId`; passed to `printCheckJson` when `json && runAgents`.
- `runCheck.spec.ts` covers CLI-06, D-06 affect-only, and combined exit on agent failure.

## Task Commits

Each task was committed atomically:

1. **Task 2 (partial): AgentRunSummaryJson** - `07c4d49` (feat)
2. **Tasks 1–2: async runCheck + agent orchestration** - `5b36fe3` (feat)
3. **Task 3: runCheck.spec agent and exit-code tests** - `3a4f5ed` (test)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified

- `packages/cli/src/lib/runCheck.ts` - async orchestration, agent loop, exit combining
- `packages/cli/src/lib/formatters.ts` - `AgentRunSummaryJson`, optional `agentRuns` in JSON
- `packages/cli/src/lib/runCheck.spec.ts` - mocked core agent tests
- `packages/cli/src/lib/cli.ts` - `parseAsync`, async `check` action
- `packages/cli/src/lib/cli.spec.ts` / `cli.e2e.spec.ts` - `await runCheck` / `await runCli`
- `packages/cli/src/index.ts` - promise catch on main entry

## Decisions Made

- Human-mode violations log before agents; stderr progress `[agent] trigger=…` per eligible link.
- `readAffectedContents` receives spread `[...cov.entry.affects]` for readonly schema arrays.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] parseAsync for async check**

- **Found during:** Task 1 verification (cli.e2e)
- **Issue:** `runCheck` async left `process.exitCode` undefined until microtask flushed
- **Fix:** `runCli` → `parseAsync`; e2e `await runCli`; main entry `.catch` handler
- **Files modified:** `cli.ts`, `cli.e2e.spec.ts`, `index.ts`
- **Committed in:** `5b36fe3`

**2. [Rule 1 - Bug] readonly affects array for readAffectedContents**

- **Found during:** `cli:build`
- **Issue:** TS2345 readonly `affects` not assignable to mutable parameter
- **Fix:** spread `[...cov.entry.affects]` at call site
- **Files modified:** `runCheck.ts`
- **Committed in:** `5b36fe3`

### Commit structure

- Tasks 1 and 2 share `5b36fe3` because `runCheck.ts` implements both async signature and agent loop in one unit; formatters committed separately in `07c4d49`.

---

**Total deviations:** 2 auto-fixed, 1 commit-structure note
**Impact on plan:** No scope change; all acceptance criteria met.

## Issues Encountered

- Local `sqlite3` native bindings missing for tests importing full `@filelinks/core`; resolved via `node-gyp rebuild` in pnpm sqlite3 package (environment-only).

## User Setup Required

None.

## Next Phase Readiness

- Plan 07-03 can wire Commander `--run-agents` and extend JSON envelope using `agentRuns`.
- `pnpm exec nx run cli:test` and `cli:build` pass.

## Self-Check: PASSED

- Key files present on disk
- Commits `07c4d49`, `5b36fe3`, `3a4f5ed` on branch `fili-3-cursor-SDK-integration`

---

_Phase: 07-cli-check-run-agents_
_Completed: 2026-05-31_
