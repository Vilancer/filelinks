# Phase 6: Provider system & Cursor SDK — RESEARCH.md

**Date:** 2026-05-31  
**Confidence:** High — locked decisions in `06-CONTEXT.md` (D-01–D-20); Phase 5 `agent` object and merge patterns are in place.

## User Constraints (from CONTEXT — MUST HONOR)

- **D-01–D-04:** `AgentProvider` interface + registry; Cursor only in v1.1; no `@cursor/sdk` outside `cursorProvider.ts`.
- **D-05–D-07:** Extend `AgentSettingsSchema` with `provider`, `runtime`, `model`, `local`, `cloud`; `resolveAgentConfig`; post-merge runtime validation.
- **D-08–D-11:** `listModels` on every provider; Cursor via `Cursor.models.list`; export `AgentModelOption` + barrel helpers.
- **D-12–D-17:** `@cursor/sdk` in `packages/core`; `Agent.create` → `send` → `wait` → dispose; explicit `local` or `cloud`; distinct startup vs run errors.
- **D-18–D-20:** Typed `FilelinksError` subclasses; actionable messages; `run(prompt, resolvedConfig)` only — no policy in provider.

## Standard Stack

| Concern    | Choice                                              | Notes                                                                      |
| ---------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| SDK        | **`@cursor/sdk`** (npm **1.0.17** at research time) | Add to `packages/core/package.json` dependencies.                          |
| Validation | **Effect Schema**                                   | Extend `AgentSettingsSchema` in `schema.ts`.                               |
| Merge      | **`resolveAgentConfig`**                            | Mirror `resolvePrompt` / `resolveAgentRunPolicy` shallow merge.            |
| Providers  | **`packages/core/src/lib/providers/`**              | `types.ts`, `registry.ts`, `cursorProvider.ts`, `index.ts`.                |
| Tests      | **Vitest + `vi.mock('@cursor/sdk')`**               | No real `CURSOR_API_KEY` in CI; mock `Agent.create`, `Cursor.models.list`. |
| Public API | **`packages/core/src/index.ts`**                    | Export registry, resolver, types, `listAgentModels` helper.                |

## Architecture

### File layout (recommended)

```
packages/core/src/lib/
  agentConfigResolver.ts      # resolveAgentConfig + validateResolvedAgentConfig
  agentConfigResolver.spec.ts
  providers/
    types.ts                  # AgentProvider, AgentRunInput, AgentRunResult, AgentModelOption
    registry.ts               # register/get/list
    cursorProvider.ts         # Cursor impl + SDK imports
    cursorProvider.spec.ts
    index.ts                  # registerBuiltInProviders()
  errors.ts                   # Agent* error subclasses
```

Call **`registerBuiltInProviders()`** from `providers/index.ts` at import time (side effect) or explicitly from `packages/core/src/index.ts` after exports — planner picks one; must run before `getAgentProvider('cursor')`.

### Schema extension (D-05)

```ts
export const AgentProviderIdSchema = Schema.Literal('cursor');

export const AgentRuntimeSchema = Schema.Literal('local', 'cloud');

export const AgentLocalSettingsSchema = Schema.Struct({
  cwd: Schema.String,
});

export const AgentCloudSettingsSchema = Schema.Struct({
  repos: Schema.Array(Schema.String),
});

export const AgentSettingsSchema = Schema.Struct({
  runPolicy: Schema.optional(AgentRunPolicySchema),
  provider: Schema.optional(AgentProviderIdSchema),
  runtime: Schema.optional(AgentRuntimeSchema),
  model: Schema.optional(Schema.String),
  local: Schema.optional(AgentLocalSettingsSchema),
  cloud: Schema.optional(AgentCloudSettingsSchema),
});
```

**Decode-time:** optional fields on struct; **run-time:** `validateResolvedAgentConfig(config)` requires `provider`, `runtime`, and `local.cwd` or `cloud.repos` per runtime.

### `resolveAgentConfig`

```ts
export type ResolvedAgentConfig = Required<
  Pick<AgentSettings, 'provider' | 'runtime'>
> &
  AgentSettings & {
    model: string; // filled with 'composer-2.5' when omitted for cursor
  };

export function resolveAgentConfig(
  globalConfig: FileLinkConfig,
  link: FileLinkEntry,
): ResolvedAgentConfig;
```

Merge: `{ ...globalConfig.agent, ...link.agent }` then validate + default model for cursor local/cloud.

### Provider interface (D-01)

```ts
export interface AgentProvider {
  readonly id: AgentProviderId;
  validateCredentials(ctx: AgentProviderContext): void | Promise<void>;
  listModels(ctx: AgentProviderContext): Promise<AgentModelOption[]>;
  run(input: AgentRunInput): Promise<AgentRunResult>;
}
```

`AgentProviderContext`: `{ apiKey?: string }` — key from `process.env.CURSOR_API_KEY` when not passed.

### Cursor SDK mapping (D-12–D-17)

**listModels:**

```ts
import { Cursor } from '@cursor/sdk';
const models = await Cursor.models.list({ apiKey });
// map to { id, label?: displayName }
```

**run (local):**

```ts
await using agent = await Agent.create({
  apiKey,
  model: { id: resolved.model },
  local: { cwd: resolved.local!.cwd, settingSources: [] },
});
const run = await agent.send(prompt);
const result = await run.wait();
```

**run (cloud):**

```ts
cloud: {
  repos: resolved.cloud!.repos;
}
```

**Errors:**

- Missing `CURSOR_API_KEY` → `AgentMissingApiKeyError` (`AGENT_MISSING_API_KEY`) in `validateCredentials`.
- `catch (e)` if `CursorAgentError` → `AgentStartupError` (`AGENT_STARTUP_FAILED`, details: `{ isRetryable }`).
- `result.status === 'error'` → `AgentRunFailedError` (`AGENT_RUN_FAILED`, message includes `run.id`).

Use **`settingSources: []`** on local create (SDK skill — avoid ambient Cursor app settings in automation).

### Registry (D-02)

```ts
const providers = new Map<AgentProviderId, AgentProvider>();
export function registerAgentProvider(p: AgentProvider): void;
export function getAgentProvider(id: AgentProviderId): AgentProvider;
export function listAgentProviderIds(): AgentProviderId[];
```

Unknown id at `getAgentProvider` → `AgentProviderUnknownError`.

### Testing strategy

- **06-01 / 06-02:** Pure unit tests, no SDK.
- **06-03:** `vi.mock('@cursor/sdk')` with fake `Agent.create` returning disposable agent, `send`/`wait` resolving `finished` or `error`; fake `Cursor.models.list` returning `[{ id: 'composer-2.5' }]`.
- Assert **`validateCredentials`** throws when `delete process.env.CURSOR_API_KEY` in test.

## Don't Hand-Roll

| Problem            | Use                                               |
| ------------------ | ------------------------------------------------- |
| Model listing      | **`Cursor.models.list`**                          |
| Agent lifecycle    | **`@cursor/sdk` `Agent.create`** + dispose        |
| Config validation  | **Effect Schema** + `validateResolvedAgentConfig` |
| Provider discovery | **Registry map**, not switch in CLI               |

## Common Pitfalls

- Importing `@cursor/sdk` from CLI package (violates D-04).
- Omitting both `local` and `cloud` on `Agent.create` (SDK defaults to local silently).
- Treating `result.status === 'error'` as thrown exception (SDK trap #2).
- Forgetting `await run.wait()` after `send`.
- Putting `runPolicy` defaults into provider layer (belongs in Phase 5 resolver only).

## Project Constraints

- `pnpm exec nx run core:test`, `core:build` from repo root.
- No CLI changes in Phase 6.
- Husky runs full test suite on commit.

## Validation Architecture

Nyquist validation **disabled** — no `06-VALIDATION.md`.

---

## RESEARCH COMPLETE

Planner may proceed to `06-01-PLAN.md` (PROV-02), `06-02-PLAN.md` (PROV-01 + errors), `06-03-PLAN.md` (PROV-03 + SDK-01–03).
