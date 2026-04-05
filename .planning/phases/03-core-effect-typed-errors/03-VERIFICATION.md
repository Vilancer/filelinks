# Phase 3 verification — Core — Effect & typed errors

**Date:** 2026-04-05  
**Requirements:** CORE-07, CORE-08, CORE-09

## Summary

`@filelinks/core` now depends on **`effect@^3.21.0`**. Config models are defined with **`effect/Schema`** (`PromptConfigSchema`, `FileLinkEntrySchema`, `FileLinksFileSchema`, etc.) with types via **`Schema.Schema.Type`**. **`defineLinks`** and **`loadFileLinksConfig`** decode unknown input; failures surface as **`ParseError`** or **`ConfigValidationError`**. A **`FilelinksError`** hierarchy and **`normalizeError`** return structured `{ ok: false, code, message, details? }` without throwing.

## Commands run

| Command                       | Result |
| ----------------------------- | ------ |
| `pnpm exec nx run core:build` | Exit 0 |
| `pnpm exec nx run core:test`  | Exit 0 |

_Note: `pnpm exec nx run core:lint` may report `@nx/dependency-checks` for vitest in devDependencies — pre-existing pattern; not blocking this phase’s functional verification._

## CORE-07

| Check                                                                          | Pass |
| ------------------------------------------------------------------------------ | ---- |
| `packages/core/package.json` lists `effect` ^3.21.0                            | ✓    |
| Named schema exports in `schema.ts` (`*Schema`) + `Schema.Schema.Type` aliases | ✓    |
| `defineLinks` validates via `decodeUnknownSync`                                | ✓    |
| Barrel exports schema + types via `export * from './lib/schema'`               | ✓    |

## CORE-08

| Check                                                                                                                              | Pass |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `errors.ts`: `FilelinksError`, `ConfigNotFoundError`, `ConfigExportShapeError`, `ConfigValidationError` with stable `code` strings | ✓    |
| `configLoader.ts` uses typed errors (no `throw new Error`)                                                                         | ✓    |

## CORE-09

| Check                                                                                                    | Pass |
| -------------------------------------------------------------------------------------------------------- | ---- |
| `handleError.ts` exports `normalizeError` and `HandledFailure`                                           | ✓    |
| `isParseError` from `effect/ParseResult` + `FilelinksError` + fallback branches; function does not throw | ✓    |
| `handleError.spec.ts` covers hierarchy, ParseError path, `Error`, string, primitive                      | ✓    |

## Sign-off

**status:** passed

Proceed to **Phase 4 — CLI MVP** when ready.
