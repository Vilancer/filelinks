# Phase 6: Provider system & Cursor SDK - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Pluggable **agent execution** in `@filelinks/core`: a **provider registry** and **`AgentProvider` interface** with **Cursor** as the only v1.1 implementation (`provider: 'cursor'`). This phase delivers **`resolveAgentConfig`** (global + per-link merge), **credential validation**, **`listModels` per provider**, and **run execution** with **explicit local vs cloud** runtimes, **proper dispose**, and **distinct typed errors** for missing keys, startup failures, and run failures.

It does **not** wire **`filelinks check --run-agents`**, build full prompt payloads from git diffs, or document CLI flags (Phase 7 / DOC-03). It does **not** implement non-Cursor providers (PROV-04).

</domain>

<decisions>
## Implementation Decisions

### Provider interface & registry (PROV-01) — user-directed

- **D-01:** Define a stable **`AgentProvider`** interface in core (not ad-hoc Cursor calls from CLI). Minimum surface:
  - **`id`** — provider id (matches config literal, e.g. `'cursor'`).
  - **`validateCredentials(ctx)`** — synchronous or async check that required env/config is present **before** creating an agent; throws **`FilelinksError`** subclass (PROV-03).
  - **`listModels(ctx)`** — returns available models for this provider/account (see D-14–D-16).
  - **`run(input)`** — executes one agent job for a resolved config + prompt string; returns structured result (status, run id, optional text); throws on startup failure.
- **D-02:** **Registry pattern** for future providers: `registerAgentProvider(provider)`, `getAgentProvider(id)`, `listAgentProviderIds()`. Built-in registration for Cursor at module init (e.g. `registerBuiltInProviders()` from core entry). Unknown **`provider`** in resolved config → typed error (**`AGENT_PROVIDER_UNKNOWN`** or similar), not a generic `Error`.
- **D-03:** v1.1 implements **only** `cursor`; interface must be general enough for PROV-04 (OpenAI, etc.) without breaking config authors — no Cursor-specific types on the interface itself (Cursor types stay inside `cursorProvider.ts`).
- **D-04:** Callers (Phase 7 CLI) resolve **`getAgentProvider(resolved.provider)`** then **`provider.run(...)`** — no `import { Agent } from '@cursor/sdk'` outside the Cursor provider module.

### Config merge & schema (PROV-02)

- **D-05:** Extend **`AgentSettingsSchema`** (and types) with execution fields, decoded by **`defineLinks`**:
  - **`provider`** — `Schema.Literal('cursor')` for v1.1 (extend union when adding providers).
  - **`runtime`** — `'local' | 'cloud'` (**required** on merged config used for a run — no silent default).
  - **`model`** — optional string (provider-specific id); if omitted after merge, Cursor uses documented default **`composer-2.5`** for local runs (SDK requires model for local).
  - **`local`** — optional struct `{ cwd: string }` (required when `runtime === 'local'`).
  - **`cloud`** — optional struct `{ repos: string[] }` (required when `runtime === 'cloud'`; **no silent fallback to local** per STATE.md / SDK trap #1).
- **D-06:** **`resolveAgentConfig(globalConfig, entry)`** mirrors **`resolveAgentRunPolicy`** / **`resolvePrompt`**: shallow merge global `config.agent` → per-link `entry.agent`, with per-link winning on conflicts.
- **D-07:** After merge, **validate runtime shape** in core (not only Schema): `local` without `cwd` or `cloud` without `repos` → **`ConfigValidationError`** or dedicated **`AgentConfigError`** with actionable message.

### `listModels` (user-directed)

- **D-08:** **`listModels` is part of the `AgentProvider` contract** — every future provider must implement it (may return empty array if provider has no discovery API).
- **D-09:** Cursor provider implements **`listModels`** via **`Cursor.models.list({ apiKey })`** from **`@cursor/sdk`** (see Cursor SDK skill — model list is account-specific).
- **D-10:** Map SDK models to a small core DTO (e.g. **`AgentModelOption`**: `{ id: string; label?: string }`) so CLI/UI does not depend on SDK types.
- **D-11:** Export **`listAgentModels(providerId, ctx?)`** (or `getAgentProvider(id).listModels(ctx)`) from **`@filelinks/core`** barrel. **No new CLI subcommand required in Phase 6** — Phase 7 may use this for validation, docs, or a future `filelinks agent models` command.

### Cursor SDK usage (SDK-01, SDK-02, SDK-03)

- **D-12:** Add **`@cursor/sdk`** dependency to **`packages/core`** (provider lives in core per PROV-01). Pin a compatible beta version per official docs.
- **D-13:** Use **`Agent.create` → `send` → `wait` → dispose** for each run (not **`Agent.prompt`** one-shot), so Phase 7 can extend to streaming later; **always dispose** (`await using` in async code paths or `try/finally` with async dispose).
- **D-14:** **Explicit runtime** on every create: `local: { cwd }` **or** `cloud: { repos }` — never rely on SDK “defaults to local when omitted” for filelinks runs.
- **D-15:** Pass **`apiKey`** from `process.env.CURSOR_API_KEY` when not in config (SDK reads env, but filelinks should validate in **`validateCredentials`** first with clear message).
- **D-16:** **Startup vs run failure** (SDK trap #2):
  - Thrown **`CursorAgentError`** → core **`AgentStartupError`** (`AGENT_STARTUP_FAILED`), include `isRetryable` in `details` when present.
  - Returned **`result.status === 'error'`** → core **`AgentRunFailedError`** (`AGENT_RUN_FAILED`), include `run.id` in message/details.
- **D-17:** Successful run returns `{ status: 'finished', runId, resultText? }` — map from SDK `RunResult`; do not conflate with violation checking.

### Errors & normalizeError (PROV-03)

- **D-18:** New **`FilelinksError`** subclasses (or codes) registered in **`normalizeError`** where applicable: missing API key, unknown provider, invalid runtime config, startup failed, run failed.
- **D-19:** Messages must be **actionable** (e.g. “Set CURSOR_API_KEY — Cursor Dashboard → Integrations”).

### Phase 5 integration

- **D-20:** Provider **`run`** does **not** re-implement policy — Phase 7 calls **`shouldRunAgentForLink`** + **`resolveAgentRunPolicy`** before **`provider.run`**. Phase 6 **`run`** accepts a **final prompt string** + **`ResolvedAgentConfig`**.

### Claude's Discretion

- Exact file layout (`providers/registry.ts`, `providers/cursorProvider.ts`, `agentConfigResolver.ts`).
- Whether **`validateCredentials`** runs at **`resolveAgentConfig`** time vs start of **`run`** (must run before SDK create).
- Streaming: implement internally but Phase 6 tests may only assert on **`wait()`** outcome.
- Sync vs async public API shape (prefer async **`run`** / **`listModels`** throughout).

### Folded Todos

_None._

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & milestone

- `.planning/REQUIREMENTS.md` — **PROV-01** … **PROV-03**, **SDK-01** … **SDK-03**
- `.planning/ROADMAP.md` — Phase 6 goal and success criteria
- `.planning/PROJECT.md` — v1.1 provider/runtime decisions
- `.planning/STATE.md` — explicit local/cloud, missing-key at run time
- `.planning/phases/05-agent-policy-schema/05-CONTEXT.md` — policy gate; `agent` object extension pattern
- `.planning/phases/05-agent-policy-schema/05-VERIFICATION.md` — Phase 5 completion

### Cursor SDK (external — primary integration reference)

- Cursor SDK skill (`/sdk`) — invocation patterns, local vs cloud, dispose, `CursorAgentError` vs `result.status`, `Cursor.models.list`
- https://cursor.com/docs/sdk/typescript — `@cursor/sdk` API reference

### Code (Phase 5 baseline)

- `packages/core/src/lib/schema.ts` — extend `AgentSettingsSchema`
- `packages/core/src/lib/agentRunPolicy.ts` — merge pattern sibling for `resolveAgentConfig`
- `packages/core/src/lib/promptResolver.ts` — global/per-link override pattern
- `packages/core/src/lib/errors.ts` / `handleError.ts` — typed errors + `normalizeError`
- `packages/core/src/index.ts` — export providers + resolver
- `.planning/codebase/ARCHITECTURE.md` — package boundaries

### Product

- `docs/filelinks-docs.docx` — agent / AI sections if present (verify during research)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **`resolveAgentRunPolicy`**, **`resolvePrompt`** — merge precedence for **`resolveAgentConfig`**.
- **`AgentSettingsSchema`** — extend with `provider`, `runtime`, `model`, `local`, `cloud`.
- **`FilelinksError`** hierarchy — extend for provider/SDK failures.

### Established Patterns

- Effect Schema literals for enums (`AgentRunPolicySchema`, `LinkTypeSchema`).
- Specs colocated `*.spec.ts`; Vitest; `pnpm exec nx run core:test`.
- Public API via `packages/core/src/index.ts` barrel only.

### Integration Points

- Phase 7 **`runCheck`** will call **`resolveAgentConfig`** + **`getAgentProvider(...).run`** after **`shouldRunAgentForLink`**.
- No `@cursor/sdk` in repo yet — first addition in **`packages/core/package.json`**.

</code_context>

<specifics>
## Specific Ideas

- User requested **enforced provider pattern** for future providers (registry + interface), not a Cursor-only module sprinkled through CLI.
- User requested **`listModels` on providers** — useful for config authoring and future CLI; Cursor maps to **`Cursor.models.list`**.
- Follow Cursor SDK skill: **explicit runtime**, **dispose**, **distinct startup vs run errors**, **`composer-2.5`** as sensible default model id when config omits model.

</specifics>

<deferred>
## Deferred Ideas

- **PROV-04** — OpenAI / other providers (same interface + registry).
- **`filelinks agent models`** CLI subcommand — optional in Phase 7 or post-v1.1; Phase 6 only needs core **`listModels`** API.
- **MCP servers** in config — SDK supports inline MCP; defer unless product asks (resume does not persist MCP).
- **Agent.resume** across CLI invocations — defer; Phase 7 can use fresh **`Agent.create`** per eligible link.

</deferred>

---

_Phase: 06-provider-system-cursor-sdk_
_Context gathered: 2026-05-31_
