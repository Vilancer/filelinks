# Phase 3: Core — Effect & typed errors — RESEARCH

**Date:** 2026-04-05  
**Question:** What do we need to know to plan CORE-07, CORE-08, CORE-09 well?

## RESEARCH COMPLETE

### 1. Package layout (Effect 3.x)

- **`effect`** on npm (current stable **3.21.x**) bundles **Schema** — import as **`import * as Schema from "effect/Schema"`** (or `import { Schema } from "effect"` per project style).
- Standalone **`@effect/schema`** is legacy; prefer the unified **`effect`** dependency only ([Effect docs — Schema basic usage](https://effect.website/docs/schema/basic-usage/)).
- **TypeScript:** align with Effect’s expectations: modern `moduleResolution` / `strict` already used in Nx libs.

### 2. Schema as source of truth

- Define structs with **`Schema.Struct`**, optional fields with **`Schema.optional`**, literals with **`Schema.Literal`** for `LinkType`.
- **Inferred types:** `export type PromptConfig = Schema.Schema.Type<typeof PromptConfigSchema>` (or `Schema.Type<typeof PromptConfigSchema>` depending on Effect version — use the alias the codebase standardizes on).
- **Runtime validation:** **`Schema.decodeUnknownSync(schema)(input)`** validates and returns typed output; on failure it throws **`ParseError`** (from Effect’s parse pipeline — import path typically `effect/ParseResult` or re-exported helpers; executor should follow the version’s public API).
- **Strategy for `defineLinks`:** decode `links` and `config` through the same schemas used for file export so author-time and load-time validation stay aligned.

### 3. Config file loading (`jiti`)

- Keep **`loadFileLinksConfig` synchronous** unless a strong reason appears: decode the default-exported object with a **top-level schema** matching `{ links: FileLinkEntry[]; config: FileLinkConfig }` after the existing shape checks (or replace loose checks with a single schema decode and map failures to typed errors).
- **`ParseError`** is not a custom `FilelinksError` — wrap or map it in **`ConfigValidationError`** (extends base) so `instanceof` in the centralized handler stays meaningful.

### 4. Typed error hierarchy (class-based)

- **Base:** e.g. `FilelinksError extends Error` with **`readonly code: string`**, **`cause?: unknown`**, stable **`name`**. Avoid shadowing `Error#message` oddly — set `message` in `super(...)`.
- **Subclasses (minimum for this phase):**
  - **`ConfigNotFoundError`** — no `filelinks.config.ts` walking upward (`code`: e.g. `CONFIG_NOT_FOUND`).
  - **`ConfigExportShapeError`** — default export missing or not a non-array object (`code`: e.g. `CONFIG_EXPORT_INVALID`).
  - **`ConfigValidationError`** — schema decode failed (`code`: e.g. `CONFIG_VALIDATION`); optionally store **original `ParseError`** or message in `cause` / `details`.
- Preset defaults: each class sets a **default human message** when constructed with minimal args.

### 5. Centralized handler

- **Single function** e.g. **`normalizeError(unknown): HandledFailure`** where **`HandledFailure`** is a **discriminated** object, e.g. `{ ok: false; code: string; message: string; details?: unknown }` (no `ok: true` branch required if handler is failure-only — CONTEXT allows failure normalization focus).
- **Order:** `instanceof FilelinksError` branches first, then **`ParseError`** if not wrapped, then **`Error`**, then **`unknown`** stringification with a fallback code such as **`UNKNOWN`** / **`NON_ERROR`**.
- **Must not throw.**

### 6. Public exports

- Barrel **`packages/core/src/index.ts`:** export **schemas** with explicit names (`PromptConfigSchema`, `FileLinkEntrySchema`, …), **types**, **`defineLinks`**, **errors**, **handler**, existing modules unchanged except type imports from schema.

### 7. Risks / mitigations

| Risk                                  | Mitigation                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Bundle size increase                  | Accept for MVP; tree-shaking friendly imports from `effect/Schema`          |
| `decodeUnknownSync` throws ParseError | Catch at loader boundary; wrap in `ConfigValidationError` or map in handler |
| Tests rely on loose typing            | Update specs to valid payloads; add negative tests for decode failures      |

### 8. Validation Architecture (Nyquist)

- **Not used** for this phase (`nyquist_validation_enabled: false` in workspace config) — no `VALIDATION.md` required.

---

## References

- [Effect — Schema basic usage](https://effect.website/docs/schema/basic-usage/)
- [Effect — Schema module](https://effect-ts.github.io/effect/effect/Schema.ts.html)
- `.planning/phases/03-core-effect-typed-errors/03-CONTEXT.md`
- `.planning/REQUIREMENTS.md` — CORE-07, CORE-08, CORE-09
