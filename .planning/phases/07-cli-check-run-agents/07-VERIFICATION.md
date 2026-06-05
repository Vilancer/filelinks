---
phase: 07-cli-check-run-agents
verified: 2026-05-31T04:50:00Z
status: passed
score: 4/4 success criteria verified
---

# Phase 7: CLI `check --run-agents` Verification Report

**Phase Goal:** Developers opt in to agent edits from `check` when links match policy—including when companions are not staged.

**Verified:** 2026-05-31T04:50:00Z  
**Status:** passed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| #   | Truth                                                                                                       | Status     | Evidence                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `filelinks check --run-agents` preserves check output/exit, then runs agents only for policy-eligible links | ✓ VERIFIED | `cli.ts` passes `runAgents` to async `runCheck`; violations via `matchStagedLinks` (lines 59–82) before agent loop; agents gated by `classifyStagedLinks` + `shouldRunAgentForLink` (lines 87–92); exit `Math.max(violationExit, agentExit)` (lines 134–138); unit + E2E tests pass |
| 2   | Trigger staged with missing affects still runs agent when policy allows                                     | ✓ VERIFIED | No `missingAffected.length` gate in eligibility; `runCheck.spec.ts` **CLI-06** asserts `provider.run` when `missingAffected` non-empty; README states missing companions do not block agents                                                                                        |
| 3   | Agent receives merged prompt, trigger diff, and affected file contents                                      | ✓ VERIFIED | `runCheck.ts` calls `resolvePrompt`, `getStagedDiffForPaths(cwd, cov.triggerPaths)`, `readAffectedContents(cwd, [...entry.affects])`, `buildAgentPrompt` before `provider.run`; `agentPrompt.spec.ts` + `gitReader.spec.ts` cover assembly and git diff                             |
| 4   | README documents flag, env vars, and agent config (local + cloud)                                           | ✓ VERIFIED | README _Running agents (v1.1)_: `--run-agents`, `CURSOR_API_KEY`, `agentRuns` JSON, `trigger-or-affects`, local/cloud examples; CONTRIBUTING _AI agents (v1.1)_ cross-links smoke/CI                                                                                                |

**Score:** 4/4 truths verified

### Plan must-haves (aggregated)

| Truth (source plan)                                                            | Status |
| ------------------------------------------------------------------------------ | ------ |
| Staged trigger paths → unified diff (`07-01`)                                  | ✓      |
| All affect paths read from disk or placeholder (`07-01`)                       | ✓      |
| `buildAgentPrompt` single string with system, diff, affects (`07-01`)          | ✓      |
| Violation reporting unchanged; agents after violations (`07-02`)               | ✓      |
| Eligibility uses `classifyStagedLinks`, not `matchStagedLinks` (`07-02`, D-06) | ✓      |
| `--run-agents` → `runAgents: true`; async check action (`07-03`)               | ✓      |
| `--json --run-agents` emits `agentRuns` (`07-03`)                              | ✓      |
| E2E proves flag reaches agent path without live API (`07-03`)                  | ✓      |
| README + CONTRIBUTING agent docs (`07-04`)                                     | ✓      |

### Required Artifacts

| Artifact                                | Expected                  | Status     | Details                                                                                                               |
| --------------------------------------- | ------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/lib/gitReader.ts`    | `getStagedDiffForPaths`   | ✓ VERIFIED | `git diff --cached --` for repo-relative paths                                                                        |
| `packages/core/src/lib/agentPrompt.ts`  | prompt assembly           | ✓ VERIFIED | 120 lines; `readAffectedContents`, `buildAgentPrompt`                                                                 |
| `packages/core/src/index.ts`            | barrel export             | ✓ VERIFIED | `export * from './lib/agentPrompt'`                                                                                   |
| `packages/cli/src/lib/runCheck.ts`      | async agent orchestration | ✓ VERIFIED | Imports core helpers; sequential `provider.run`                                                                       |
| `packages/cli/src/lib/runCheck.spec.ts` | CLI-06, JSON, exit        | ✓ VERIFIED | 4 tests passing                                                                                                       |
| `packages/cli/src/lib/cli.ts`           | `--run-agents`            | ✓ VERIFIED | Commander option + `await runCheck`                                                                                   |
| `packages/cli/src/lib/formatters.ts`    | `agentRuns` in JSON       | ✓ VERIFIED | `printCheckJson(violations, agentRuns?)`                                                                              |
| `packages/cli/src/lib/cli.e2e.spec.ts`  | `[e2e]` flag wiring       | ✓ VERIFIED | 2 tests in describe `[e2e] check --run-agents`                                                                        |
| `README.md`                             | DOC-03 user docs          | ✓ VERIFIED | Subsection with flag, policy, key, examples (gsd-tools pattern `'--run-agents'` false negative—flag present in prose) |
| `CONTRIBUTING.md`                       | contributor smoke         | ✓ VERIFIED | `CURSOR_API_KEY`, smoke steps, mock CI pointers                                                                       |

### Key Link Verification

| From             | To                | Via                                  | Status  | Details                               |
| ---------------- | ----------------- | ------------------------------------ | ------- | ------------------------------------- |
| `runCheck.ts`    | `@filelinks/core` | classify + provider + prompt helpers | ✓ WIRED | gsd-tools + import audit              |
| `runCheck.ts`    | violations only   | `matchStagedLinks`                   | ✓ WIRED | Agent loop does not use `matches`     |
| `cli.ts`         | `runCheck.ts`     | `runAgents`                          | ✓ WIRED | gsd-tools verified                    |
| `runCheck.ts`    | `formatters.ts`   | `printCheckJson`                     | ✓ WIRED | When `opts.json`                      |
| `agentPrompt.ts` | `PromptConfig`    | sections in string                   | ✓ WIRED | system, diff, affects                 |
| `index.ts`       | `agentPrompt.ts`  | barrel                               | ✓ WIRED | gsd-tools verified                    |
| `README.md`      | `cli.ts`          | documented flag                      | ✓ WIRED | Matches `--run-agents` implementation |

### Data-Flow Trace (Level 4)

| Artifact              | Data variable | Source                                                                                  | Produces real data     | Status    |
| --------------------- | ------------- | --------------------------------------------------------------------------------------- | ---------------------- | --------- |
| `runCheck` agent path | `prompt`      | `resolvePrompt` + `getStagedDiffForPaths` + `readAffectedContents` → `buildAgentPrompt` | Yes (git + filesystem) | ✓ FLOWING |
| `buildAgentPrompt`    | prompt string | `PromptConfig`, diff, file contents                                                     | Yes in core specs      | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior                     | Command                                                     | Result                       | Status |
| ---------------------------- | ----------------------------------------------------------- | ---------------------------- | ------ |
| CLI-06 orchestration         | `pnpm exec nx run cli:test --skip-nx-cache -- runCheck`     | 4 passed                     | ✓ PASS |
| E2E flag wiring              | `pnpm run cli:test:e2e`                                     | 4 passed (incl. 2 agent e2e) | ✓ PASS |
| Core prompt assembly         | `pnpm exec nx run core:test --skip-nx-cache -- agentPrompt` | 5 passed                     | ✓ PASS |
| Built dist export spot-check | `node -e "require('./packages/core/dist/...')"`             | dist not built in workspace  | ? SKIP |

### Requirements Coverage

| Requirement | Source plan  | Description                                                  | Status      | Evidence                         |
| ----------- | ------------ | ------------------------------------------------------------ | ----------- | -------------------------------- |
| CLI-05      | 07-03        | `check --run-agents` wired through Commander and `runCheck`  | ✓ SATISFIED | `cli.ts` L78–90; E2E             |
| CLI-06      | 07-02        | Eligible links invoke agent; missing affects do not block    | ✓ SATISFIED | Eligibility filter; CLI-06 test  |
| CLI-07      | 07-01, 07-02 | Prompt: resolved config, trigger diff, affect contents       | ✓ SATISFIED | Core helpers + `runCheck` wiring |
| DOC-03      | 07-04        | README/CONTRIBUTING: flag, config, `CURSOR_API_KEY`, runtime | ✓ SATISFIED | README + CONTRIBUTING sections   |

### Anti-Patterns Found

| File | Line | Pattern       | Severity | Impact |
| ---- | ---- | ------------- | -------- | ------ |
| —    | —    | None blocking | —        | —      |

No TODO/FIXME stubs in `runCheck.ts` or `agentPrompt.ts`. Agent path is fully implemented; tests mock `@filelinks/core` at CLI boundary per project convention (no live Cursor in CI).

### Human Verification Required

### 1. Live Cursor agent run

**Test:** In a real repo with `filelinks.config.ts`, export `CURSOR_API_KEY`, stage a policy-eligible trigger, run `filelinks check --run-agents`.  
**Expected:** Agent executes; stderr shows `[agent] trigger=…`; optional edits in configured `local.cwd`.  
**Why human:** Verification uses mocks in CI; cannot confirm SDK/cloud behavior without credentials and network.

### Gaps Summary

None. Phase 7 goal and all four ROADMAP success criteria are met in code, tests, and documentation.

---

_Verified: 2026-05-31T04:50:00Z_  
_Verifier: Claude (gsd-verifier)_
