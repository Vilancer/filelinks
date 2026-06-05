---
phase: 07-cli-check-run-agents
plan: 03
subsystem: cli
tags: [commander, check, run-agents, e2e, json, CLI-05]

requires:
  - phase: 07-cli-check-run-agents
    plan: 02
    provides: async runCheck, agentRuns JSON shape, parseAsync runCli
provides:
  - Commander --run-agents on check wired to RunCheckOpts.runAgents
  - [e2e] command-boundary tests without live Cursor API
affects: [07-04]

tech-stack:
  added: []
  patterns:
    - "CLI-05: opt-in agents via check --run-agents only"
    - "E2E extends @filelinks/core mock; never mock runCheck"

key-files:
  created: []
  modified:
    - packages/cli/src/lib/cli.ts
    - packages/cli/src/lib/cli.e2e.spec.ts
    - packages/cli/src/lib/runCheck.spec.ts

key-decisions:
  - "formatters/runCheck JSON envelope from 07-02; 07-03 adds Commander flag and E2E only"
  - "E2E asserts getAgentProvider + classifyStagedLinks when --run-agents"

patterns-established:
  - "[e2e] check --run-agents describe isolates agent mock defaults"

requirements-completed: [CLI-05]

duration: 12min
completed: 2026-05-31
---

# Phase 07 Plan 03: CLI-05 --run-agents Summary

**`filelinks check --run-agents` is the supported opt-in entry point: Commander passes `runAgents` into async `runCheck`, and E2E proves flag wiring with mocked core (no live API).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-31T01:35:00Z
- **Completed:** 2026-05-31T01:47:09Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `.option('--run-agents', …)` on `check` with `runAgents: Boolean(opts.runAgents)` into `await runCheck`.
- Unit test confirms `--json` + `runAgents` emits `{ violations, agentRuns }` (envelope from 07-02).
- `[e2e] check --run-agents` verifies `classifyStagedLinks`, `getAgentProvider`, and `provider.run` at `runCli` boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: Commander --run-agents and async check action** - `81a0bbc` (feat)
2. **Task 2: JSON envelope with agentRuns** - `564c41a` (test; envelope implemented in 07-02)
3. **Task 3: E2E --run-agents wiring** - `615d679` (test)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified

- `packages/cli/src/lib/cli.ts` - `--run-agents` option and `runAgents` passthrough
- `packages/cli/src/lib/runCheck.spec.ts` - JSON `agentRuns` assertion
- `packages/cli/src/lib/cli.e2e.spec.ts` - agent path mocks + two E2E cases

## Decisions Made

- Task 2 acceptance met via 07-02 `formatters.ts` / `runCheck.ts`; 07-03 adds only the missing JSON unit test.
- List E2E `runCli` call updated to `await` for consistency with async `parseAsync`.

## Deviations from Plan

None - plan executed as written. Task 2 file changes were already on branch from 07-02; this plan added verification tests and CLI wiring.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Plan 07-04 (DOC-03) can document `check --run-agents`, agent config, and `CURSOR_API_KEY`.
- `pnpm exec nx run cli:test`, `pnpm run cli:test:e2e`, and `cli:build` pass.

## Self-Check: PASSED

- Key files present on disk
- Commits `81a0bbc`, `564c41a`, `615d679` on branch `fili-3-cursor-SDK-integration`
- Acceptance grep: `--run-agents`, `await runCheck`, `runAgents` in `cli.ts`; `[e2e]` and `--run-agents` in `cli.e2e.spec.ts`

---

_Phase: 07-cli-check-run-agents_
_Completed: 2026-05-31_
