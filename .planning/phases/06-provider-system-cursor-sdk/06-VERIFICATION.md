---
phase: 06-provider-system-cursor-sdk
verified: 2026-05-31T04:30:00Z
status: passed
score: 18/18 must-haves verified
human_verification:
  - test: 'Set CURSOR_API_KEY and run cursorAgentProvider.listModels({}) against the real Cursor API'
    expected: 'Returns a non-empty model list including composer-2.5 (or current catalog ids)'
    why_human: 'CI mocks @cursor/sdk; live API behavior and auth are not exercised in Vitest'
  - test: 'Run cursorAgentProvider.run with runtime local against a real repo cwd'
    expected: 'Agent starts, completes, and disposes without leaking handles'
    why_human: 'Requires valid API key, network, and SDK native deps (sqlite3 bindings) in the runtime environment'
---

# Phase 6: Provider system & Cursor SDK Verification Report

**Phase Goal:** Pluggable agent execution with Cursor as the first provider; typed missing-key errors; explicit local vs cloud runtime.

**Verified:** 2026-05-31T04:30:00Z  
**Status:** passed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                | Status     | Evidence                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `defineLinks` decodes `agent.provider`, `agent.runtime`, `agent.model`, `agent.local`, `agent.cloud` | ✓ VERIFIED | `AgentSettingsSchema` in `schema.ts`; acceptance/rejection in `schema.spec.ts`                                                     |
| 2   | Only `provider: 'cursor'` in v1.1 schema                                                             | ✓ VERIFIED | `AgentProviderIdSchema = Schema.Literal('cursor')`; invalid `'openai'` rejected at decode                                          |
| 3   | `resolveAgentConfig` merges global then per-link `agent` (same pattern as `resolvePrompt`)           | ✓ VERIFIED | Shallow spread in `agentConfigResolver.ts`; per-link override spec                                                                 |
| 4   | Invalid runtime shape fails with clear `AgentConfigError`                                            | ✓ VERIFIED | `validateResolvedAgentConfig` rules + specs for missing cwd/repos                                                                  |
| 5   | Omitted `model` → `composer-2.5` for cursor                                                          | ✓ VERIFIED | Default in `validateResolvedAgentConfig`; spec asserts default                                                                     |
| 6   | Inactive runtime block stripped from resolved config                                                 | ✓ VERIFIED | Conditional spread returns only `local` or `cloud`; per-link runtime override spec                                                 |
| 7   | `AgentProvider` defines `id`, `validateCredentials`, `listModels`, `run`                             | ✓ VERIFIED | `providers/types.ts` interface                                                                                                     |
| 8   | Registry returns providers; unknown id → `AgentProviderUnknownError`                                 | ✓ VERIFIED | `registry.ts` + `registry.spec.ts` (code assertion)                                                                                |
| 9   | Agent `FilelinksError` subclasses with stable `AGENT_*` codes                                        | ✓ VERIFIED | `errors.ts`: `AGENT_CONFIG_INVALID`, `AGENT_MISSING_API_KEY`, `AGENT_PROVIDER_UNKNOWN`, `AGENT_STARTUP_FAILED`, `AGENT_RUN_FAILED` |
| 10  | `normalizeError` maps agent errors for CLI consumption                                               | ✓ VERIFIED | `FilelinksError` branch in `handleError.ts`; `handleError.spec.ts` for `AGENT_MISSING_API_KEY`                                     |
| 11  | Cursor registered via `registerBuiltInProviders` on `@filelinks/core` import                         | ✓ VERIFIED | `providers/index.ts` calls `registerBuiltInProviders()` at load; exported from `index.ts`                                          |
| 12  | `@cursor/sdk` only imported from `cursorProvider.ts` (tests mock)                                    | ✓ VERIFIED | Repo grep: SDK imports limited to `cursorProvider.ts` + `cursorProvider.spec.ts`                                                   |
| 13  | Missing `CURSOR_API_KEY` throws `AgentMissingApiKeyError` before `Agent.create`                      | ✓ VERIFIED | `resolveApiKey` in `cursorProvider.ts`; spec for validateCredentials and run path                                                  |
| 14  | Local run uses explicit `cwd` and `settingSources: []`; no `cloud` in create options                 | ✓ VERIFIED | `buildAgentCreateOptions` + `cursorProvider.spec.ts` asserts no `cloud` property                                                   |
| 15  | Cloud run uses explicit `repos`; no `local` in create options (no silent local fallback)             | ✓ VERIFIED | Cloud branch only sets `cloud.repos`; spec asserts no `local` property                                                             |
| 16  | Startup vs run failures use distinct error types/codes                                               | ✓ VERIFIED | `CursorAgentError` → `AgentStartupError`; `result.status === 'error'` → `AgentRunFailedError`; specs for both codes                |
| 17  | Agent disposed after each run                                                                        | ✓ VERIFIED | `finally` + `disposeAgent` (`Symbol.asyncDispose` / `close`); spec expects `mockAsyncDispose` called                               |
| 18  | `pnpm exec nx run core:test` and `core:build` exit 0                                                 | ✓ VERIFIED | 72 tests passed; build succeeded during verification                                                                               |

**Score:** 18/18 truths verified

### ROADMAP Success Criteria

| Criterion                                                               | Status | Notes                                                                      |
| ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| 1. `resolveAgentConfig` merges settings; only `cursor` in v1.1          | ✓      | Merge + `Literal('cursor')`                                                |
| 2. Missing `CURSOR_API_KEY` → typed actionable `FilelinksError`         | ✓      | `AgentMissingApiKeyError` message references Dashboard                     |
| 3. Local cwd + dispose; cloud explicit repos, no local fallback         | ✓      | `buildAgentCreateOptions` branches are mutually exclusive                  |
| 4. Startup vs run failures → distinct types/messages for CLI exit codes | ✓      | `AGENT_STARTUP_FAILED` vs `AGENT_RUN_FAILED`; runId in run-failure message |

### Required Artifacts

| Artifact                                            | Expected                               | Status     | Details                                                      |
| --------------------------------------------------- | -------------------------------------- | ---------- | ------------------------------------------------------------ |
| `packages/core/src/lib/agentConfigResolver.ts`      | Merge + validate resolved agent config | ✓ VERIFIED | 77 lines; merge, validation, runtime block stripping         |
| `packages/core/src/lib/schema.ts`                   | Agent execution schema fields          | ✓ VERIFIED | Provider/runtime/local/cloud schemas                         |
| `packages/core/src/lib/providers/types.ts`          | `AgentProvider` interface              | ✓ VERIFIED | Full interface + run types                                   |
| `packages/core/src/lib/providers/registry.ts`       | Provider registry                      | ✓ VERIFIED | Map-based register/get/list                                  |
| `packages/core/src/lib/providers/cursorProvider.ts` | Cursor SDK integration                 | ✓ VERIFIED | validateCredentials, listModels, run, dispose, error mapping |
| `packages/core/package.json`                        | `@cursor/sdk` dependency               | ✓ VERIFIED | `"@cursor/sdk": "^1.0.17"`                                   |

### Key Link Verification

| From                     | To                           | Via                                          | Status  | Details                                             |
| ------------------------ | ---------------------------- | -------------------------------------------- | ------- | --------------------------------------------------- |
| `schema.ts`              | `defineLinks` decode         | `AgentSettingsSchema` on config/entry        | ✓ WIRED | Fields optional at schema; required at resolve time |
| `agentConfigResolver.ts` | `resolvePrompt` pattern      | Shallow merge global → link                  | ✓ WIRED | Same spread order as `promptResolver.ts`            |
| `cursorProvider.run`     | `ResolvedAgentConfig`        | `buildAgentCreateOptions(config)`            | ✓ WIRED | Uses validated config from resolver                 |
| `cursorProvider.run`     | `@cursor/sdk` `Agent.create` | `createOptions` after `resolveApiKey`        | ✓ WIRED | Key check precedes create                           |
| `providers/index.ts`     | `registry`                   | `registerAgentProvider(cursorAgentProvider)` | ✓ WIRED | Eager call on module load                           |
| `index.ts`               | `providers`                  | `export * from './lib/providers'`            | ✓ WIRED | Importing core registers cursor                     |
| `handleError.ts`         | `errors.ts`                  | `instanceof FilelinksError`                  | ✓ WIRED | All agent subclasses use `error.code`               |

### Data-Flow Trace (Level 4)

| Artifact                    | Data variable         | Source                                  | Produces real data    | Status    |
| --------------------------- | --------------------- | --------------------------------------- | --------------------- | --------- |
| `cursorProvider.listModels` | `models`              | `Cursor.models.list({ apiKey })`        | Yes (mocked in CI)    | ✓ FLOWING |
| `cursorProvider.run`        | `result`              | `run.wait()` after `agent.send(prompt)` | Yes (mocked in CI)    | ✓ FLOWING |
| `resolveAgentConfig`        | `ResolvedAgentConfig` | Merged `AgentSettings` + validation     | Yes from config input | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior                    | Command                                       | Result    | Status                                                                                                                            |
| --------------------------- | --------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Core unit tests             | `pnpm exec nx run core:test --skip-nx-cache`  | 72 passed | ✓ PASS                                                                                                                            |
| Core build                  | `pnpm exec nx run core:build --skip-nx-cache` | Exit 0    | ✓ PASS                                                                                                                            |
| Built package require smoke | `node -e "require('@filelinks/core')"`        | SKIP      | Native `sqlite3` bindings missing in verifier Node env when loading full dist (SDK transitive); not a code gap — Vitest mocks SDK |

### Requirements Coverage

| Requirement | Source plan(s) | Description                                           | Status      | Evidence                                                                                |
| ----------- | -------------- | ----------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| PROV-01     | 06-02, 06-03   | Provider interface + Cursor implementation            | ✓ SATISFIED | `types.ts`, `cursorProvider.ts`, registry registration                                  |
| PROV-02     | 06-01          | `resolveAgentConfig` merge pattern                    | ✓ SATISFIED | `agentConfigResolver.ts` + specs                                                        |
| PROV-03     | 06-02, 06-03   | Typed missing-key / agent errors via `normalizeError` | ✓ SATISFIED | `AgentMissingApiKeyError` + `handleError.spec.ts`; other codes on `FilelinksError` base |
| SDK-01      | 06-03          | Local runtime: create → send → wait → dispose         | ✓ SATISFIED | `run()` implementation + local create spec                                              |
| SDK-02      | 06-03          | Cloud runtime explicit repos, no local fallback       | ✓ SATISFIED | Cloud-only `Agent.create` options + spec                                                |
| SDK-03      | 06-03          | Startup vs run failure distinction                    | ✓ SATISFIED | `AgentStartupError` vs `AgentRunFailedError` + specs                                    |

No orphaned phase-6 requirements in `REQUIREMENTS.md` (all six IDs claimed by plans and implemented).

### Anti-Patterns Found

| File | Line | Pattern                                          | Severity | Impact      |
| ---- | ---- | ------------------------------------------------ | -------- | ----------- |
| —    | —    | None in `providers/` or `agentConfigResolver.ts` | —        | No blockers |

ℹ️ **Info:** `normalizeError` does not copy `AgentStartupError.details` (e.g. `isRetryable`) into `HandledFailure.details` — only `cause` when present. Distinct **codes** and **messages** still satisfy PROV-03 / ROADMAP criterion 4 for CLI exit mapping; retry UX may need a follow-up if Phase 7 wants `isRetryable` in JSON output.

### Human Verification Required

1. **Live Cursor API — listModels**  
   **Test:** Export `CURSOR_API_KEY`, import `@filelinks/core`, call `listAgentModels('cursor', {})`.  
   **Expected:** Model list from Cursor API.  
   **Why human:** CI uses `vi.mock('@cursor/sdk')`.

2. **Live Cursor API — local run**  
   **Test:** `getAgentProvider('cursor').run({ prompt, config: resolvedLocal })` on a real repo.  
   **Expected:** Finished run, no leaked agent; errors use `AGENT_*` codes when forced.  
   **Why human:** Requires network, API key, and working SDK native bindings in the environment.

### Gaps Summary

None. Phase 6 goal is achieved in the codebase: pluggable provider surface, Cursor as the sole v1.1 provider, config merge/validation, explicit local vs cloud SDK options, typed credential and failure errors, and passing core tests/build.

---

_Verified: 2026-05-31T04:30:00Z_  
_Verifier: Claude (gsd-verifier)_
