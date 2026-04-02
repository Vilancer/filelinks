# Phase 1: Core library - Context

**Gathered:** 2026-04-02  
**Amended:** 2026-04-02 (schema: ESLint-style overrides + `PromptConfig` + `jiti`)  
**Status:** Ready for planning / execute-phase

<domain>
## Phase Boundary

`@filelinks/core` implements the product doc **Step 2 — Define the config schema (core)** and **Step 3 — Implement core logic**, with one deliberate change from the older doc sketch: **global + per-link options** use the same mental model as **ESLint / Prettier** (shared defaults object + per-rule/per-file overrides). Here the shared object is `FileLinkConfig` (global `prompt` and room for future globals); each `FileLinkEntry` may override `prompt` for that link.

Phase 1 ships **types**, **`defineLinks`**, **runtime load of `filelinks.config.ts` via `jiti`**, **git staged paths**, **link matching**, and **`resolvePrompt`** for merging prompt settings. It does **not** call AI providers, expose the CLI binary, or implement `suggest`—those are later work.

</domain>

<decisions>
## Implementation Decisions

### Step 2 — Config schema (canonical TypeScript)

Lock the public API to the following (verbatim shape; implementation may add JSDoc / `satisfies` as needed):

```typescript
export interface PromptConfig {
  systemPrompt?: string; // custom instructions for the AI agent
  temperature?: number; // 0–1, default: 0.3
  maxTokens?: number; // default: 2048
}

export interface FileLinkConfig {
  prompt?: PromptConfig; // global prompt config (applies to all links)
}

export interface FileLinkEntry {
  trigger: string;
  affects: AffectedFile[];
  severity?: 'warn' | 'error';
  prompt?: PromptConfig; // per-link override
}

export interface AffectedFile {
  file: string;
  reason: string;
}

export function defineLinks(
  links: FileLinkEntry[],
  config?: FileLinkConfig
): { links: FileLinkEntry[]; config: FileLinkConfig } {
  return { links, config: config ?? {} };
}
```

**Authoring pattern:** `filelinks.config.ts` uses **default export** of `defineLinks([...], { /* global FileLinkConfig */ })`, e.g.:

```typescript
export default defineLinks(
  [
    {
      trigger: 'apps/api/src/routes/user.ts',
      affects: [
        { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
      ],
      prompt: {
        systemPrompt: 'You are an OpenAPI expert. Suggest only YAML changes.',
      },
    },
  ],
  {
    prompt: {
      systemPrompt: 'You are a senior developer. Be concise.',
      temperature: 0.2,
    },
  }
);
```

- **D-01:** Schema and `defineLinks` behavior match the snippets above; second argument is optional and normalizes to `{}` when omitted.

### Step 3 — `promptResolver` (merge semantics)

Implement `packages/core/src/promptResolver.ts`:

```typescript
export function resolvePrompt(
  globalConfig: FileLinkConfig,
  link: FileLinkEntry
): PromptConfig {
  return {
    ...(globalConfig.prompt ?? {}),
    ...(link.prompt ?? {}),
  };
}
```

- **D-02:** Shallow spread after defaulting optional `prompt` to `{}` so `undefined` is never spread; link wins on any key it defines. No AI calls in Phase 1—this exists so **`filelinks suggest`** (later) can consume a single resolved `PromptConfig` per link.

### Config loading (runtime)

- **D-03:** Resolve **`filelinks.config.ts`** by walking **upward** from `process.cwd()` (or an explicit `cwd` on the loader API) until the file exists; otherwise error clearly.
- **D-04:** Load with **`jiti`** (dependency of `@filelinks/core`). Interop with Nx/`tsc` CJS output must be validated during implementation; **no fallback** to another loader unless a plan explicitly documents it.

### Git integration

- **D-05:** Staged paths via **`git diff --name-only --cached`** using **`child_process.execFile('git', …, { cwd })`**.
- **D-06:** Repo root via **`git rev-parse --show-toplevel`**; normalize paths for **`minimatch`** consistently (repo-relative POSIX-style strings).

### Matching

- **D-07:** **`minimatch`** for `trigger` and `affects[].file` (per original doc sample).
- **D-08:** Same firing/missing-affected semantics as before: staged path matches trigger → entry fires; each affected pattern not represented in staged set counts as missing.

### Module layout (Step 3)

- **D-09:** Target files: `schema.ts` (types + `defineLinks`), **`promptResolver.ts`**, `configLoader.ts` (**jiti**), `gitReader.ts`, `linkMatcher.ts`, `index.ts` barrel exports.

### Claude's Discretion

- Sync vs async loader API; exact error strings; internal match result types; Vitest strategy for mocking `execFile`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and requirements

- `docs/filelinks-docs.docx` — Original Step 2–3 narrative (superseded for schema shape by **this CONTEXT** and `REQUIREMENTS.md` CORE-01).
- `.planning/REQUIREMENTS.md` — **CORE-01** through **CORE-05**.
- `.planning/ROADMAP.md` — Phase 1 doc-step table + success criteria.

### Repo conventions

- `.planning/codebase/STACK.md` — Nx, `tsc`, Vitest, pnpm.
- `.planning/codebase/CONVENTIONS.md` — ESLint, barrel exports, `*.spec.ts` beside sources.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- `packages/core/src/index.ts` — barrel; export new modules.
- `packages/core/src/lib/core.ts` — replace stub with real implementation layout.

### Established patterns

- TypeScript **CommonJS** packages with `tslib`; **Vitest** beside sources.
- Path alias `@filelinks/core` → `packages/core/src/index.ts` in `tsconfig.base.json`.

### Integration points

- Phase 2 CLI loads the same `{ links, config }` from disk and runs matcher + (later) passes `resolvePrompt` output into `suggest`.

</code_context>

<specifics>
## Specific Ideas

- Override model explicitly aligned with **ESLint / Prettier** for familiarity.
- **`jiti`** is the chosen loader for `filelinks.config.ts`.

</specifics>

<deferred>
## Deferred Ideas

- **`filelinks suggest`** — uses `resolvePrompt` + provider keys; not Phase 1.
- **`filelinks check --all`**, git-hook, graph, VS Code — unchanged.

### Reviewed Todos (not folded)

None.

</deferred>

---

*Phase: 01-core-library*  
*Context gathered: 2026-04-02*  
*Amended: 2026-04-02 — schema + prompt merge + jiti*
