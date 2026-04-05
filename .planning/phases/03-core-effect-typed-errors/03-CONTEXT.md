# Phase 3: Core — Effect & typed errors - Context

**Gathered:** 2026-04-05  
**Status:** Ready for planning

<domain>

## Phase Boundary

Refactor **`@filelinks/core`** to use **[Effect](https://effect.website/)** with **Schema** as the source of truth for config shapes, add a **typed class-based error hierarchy** (base + domain subclasses with preset defaults), and expose a **single centralized error handler** that narrows with `instanceof`, handles known errors, and **safely falls back** for unknown failures while returning a **consistent structured result**. **No CLI binary or Commander work** — that is **Phase 4** (former “CLI MVP”). Matching semantics (`minimatch`, optional `linkType`) remain backward compatible.

</domain>

<decisions>

## Implementation Decisions

### Effect & Schema (CORE-07)

- **D-01:** Add the **`effect`** package (and use **`effect/Schema`** per current Effect docs) so config models are **Schema definitions**, not ad hoc interfaces, for: `PromptConfig`, `FileLinkConfig`, `FileLinkEntry`, `AffectedFile`, and `LinkType` (as a schema-backed literal union / branded string union as appropriate).
- **D-02:** Public API **exports both** the **Schema values** (for runtime decode/encode/validation) **and** the **TypeScript types** inferred from those schemas (e.g. `Schema.Type<typeof X>`), so consumers and tests can use either compile-time types or runtime validation.
- **D-03:** **`defineLinks`** remains the ergonomic entry for authoring configs; it should align with the Schema-backed types (implementation may wrap or delegate to schema constructors / decodes as the planner chooses).

### Typed error hierarchy (CORE-08)

- **D-04:** Introduce a **base error class** carrying **shared fields** needed for logging and structured handling (e.g. stable **code** or tag, human-readable **message**, optional **cause** / context object — exact field set is implementation detail but must be consistent across subclasses).
- **D-05:** **Concrete subclasses** extend the base, one **per distinct failure domain** (e.g. config not found, invalid default export shape, schema validation failure). Each subclass sets **sensible preset defaults** for message/code where it makes sense so throw sites stay minimal.
- **D-06:** Replace ad hoc `throw new Error(...)` in core boundaries (starting with **`configLoader`**) with these typed errors where the failure is expected and actionable.

### Centralized error handler (CORE-09)

- **D-07:** Provide **one function** (exported or single internal module used at boundaries) with signature along the lines of: accept **`unknown`**, use **`instanceof`** (and narrow checks) against the hierarchy, **map** each known type to a **fixed structured output** shape (see D-08), and **never throw** for unexpected input — use a **generic fallback** branch (e.g. `unknown` / non-`Error` / unrecognized `Error`) with safe stringification and a dedicated “unexpected” code.
- **D-08:** **Structured output** is a **single consistent object shape** for all outcomes (e.g. `{ ok: false, code, message, details? }` or `{ success: false, ... }` — exact keys are **Claude’s discretion** in planning as long as it is stable and documented). Success paths can stay separate; the handler is primarily for **failure normalization**.

### Claude’s Discretion

- Exact **`effect` / `effect/Schema`** import paths and version pin; whether optional **`@effect/schema`** peer vs bundled `effect` (follow official Effect 3.x layout).
- Whether **`loadFileLinksConfig`** stays synchronous with `Schema.decodeUnknownSync` (or similar) vs full `Effect` + async — **must** preserve clear errors via the new hierarchy.
- Fine-grained **subclass list** beyond config loading (matcher, git reader) — add subclasses only where it improves diagnosability without churn.
- Precise **structured output** field names and optional **stack** inclusion in dev-only builds.

### Folded Todos

_None — no matching pending todos for this phase._

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product & planning

- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, phase boundary
- `.planning/REQUIREMENTS.md` — **CORE-07**, **CORE-08**, **CORE-09**
- `.planning/PROJECT.md` — MVP ordering (Phase 4 = CLI)

### Prior phase context

- `.planning/phases/01-core-library/01-CONTEXT.md` — original schema / `defineLinks` intent
- `.planning/phases/02-core-link-types-repo-dx/02-CONTEXT.md` — `linkType`, matcher passthrough

### Effect

- [Effect](https://effect.website/) — official docs (Schema, error modeling, ecosystem)

### Code (current baseline)

- `packages/core/src/lib/schema.ts` — types to migrate to Schema
- `packages/core/src/lib/configLoader.ts` — primary consumer of typed errors
- `packages/core/src/index.ts` — public exports to update
- `.planning/codebase/ARCHITECTURE.md` — package role and data flow

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable assets

- **`defineLinks`**, **`matchStagedLinks`**, **`resolvePrompt`**, **`loadFileLinksConfig` / `findConfigFile`** — keep behavior; swap implementation to Schema + typed errors behind stable exports where possible.

### Established patterns

- **Vitest** `*.spec.ts` beside sources; **Nx** `core:test` / `test-ci`.
- Config today uses **plain interfaces** and **`throw new Error`** strings in `configLoader.ts`.

### Integration points

- **Phase 4 CLI** will call the same loader/matcher; structured handler output should be easy to map to exit codes and stderr/JSON in the CLI phase.

</code_context>

<specifics>

## Specific Ideas

- User referenced **Effect** explicitly: [https://effect.website/](https://effect.website/) — Schema for types, export schema **and** inferred types.
- User requested **class-based** hierarchy (`instanceof`) and a **single** centralized handler with **graceful** unknown-error behavior.

</specifics>

<deferred>

## Deferred Ideas

- **CLI MVP** (`check` / `list` / `add`, `bin`, README demo) — **Phase 4** per updated roadmap.
- **Git hook package**, **AI suggest**, **graph**, **VS Code** — unchanged; see `REQUIREMENTS.md` v2.

### Reviewed Todos (not folded)

_None._

**None — discussion stayed within phase scope** aside from intentional roadmap renumbering.

</deferred>

---

_Phase: 03-core-effect-typed-errors_  
_Context gathered: 2026-04-05_
