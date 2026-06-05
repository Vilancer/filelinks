---
phase: 07-cli-check-run-agents
plan: 04
subsystem: docs
tags: [filelinks, cursor, agents, readme, contributing]

requires:
  - phase: 07-cli-check-run-agents
    plan: 03
    provides: shipped --run-agents CLI, agentRuns JSON
provides:
  - User-facing README agent section (DOC-03)
  - Contributor smoke and CI notes in CONTRIBUTING
affects: [release, onboarding]

tech-stack:
  added: []
  patterns: [README user docs + CONTRIBUTING contributor workflow split]

key-files:
  created: []
  modified:
    - README.md
    - CONTRIBUTING.md

key-decisions:
  - 'README subsection under check command; CONTRIBUTING dedicated AI agents section with doc map row'

patterns-established:
  - 'Agent docs: README for operators, CONTRIBUTING for smoke/CI/link loop'

requirements-completed: [DOC-03]

duration: 5min
completed: 2026-05-31
---

# Phase 7 Plan 04: Agent documentation Summary

**README and CONTRIBUTING document `check --run-agents`, trigger-or-affects policy, CURSOR_API_KEY, and local vs cloud agent config with contributor smoke and CI mock guidance.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-31T01:48:39Z
- **Completed:** 2026-05-31T01:49:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- README _Running agents (v1.1)_: opt-in flag, run policy, missing-affects behavior, env key, config examples, `agentRuns` JSON
- CONTRIBUTING doc map row + _AI agents (v1.1)_: manual smoke, mocked CI specs, linked-consumer testing, README cross-link
- DOC-03 requirement satisfied

## Task Commits

1. **Task 1: README agent section** - `caa371e` (docs)
2. **Task 2: CONTRIBUTING agent smoke and testing notes** - `e287236` (docs)

**Plan metadata:** `.planning/` is gitignored — STATE/ROADMAP/REQUIREMENTS updated on disk only

## Files Created/Modified

- `README.md` - User-facing `--run-agents`, policy, CURSOR_API_KEY, local/cloud examples
- `CONTRIBUTING.md` - Contributor smoke, CI mocks, link workflow pointer

## Decisions Made

- Placed user docs as a subsection under `filelinks check` to match command discovery
- Added documentation map table row for agents to mirror other contributor entry points

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - `CURSOR_API_KEY` documented for manual smoke only; CI uses mocks.

## Next Phase Readiness

Phase 7 plan 04 complete; milestone v1.1 agent CLI documentation aligned with shipped behavior.

---

_Phase: 07-cli-check-run-agents_
_Completed: 2026-05-31_

## Self-Check: PASSED

- FOUND: README.md
- FOUND: CONTRIBUTING.md
- FOUND: 07-04-SUMMARY.md
- FOUND: caa371e
- FOUND: e287236
